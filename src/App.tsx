import { Fragment, useState, useMemo, useEffect, useRef, useDeferredValue, startTransition } from 'react';
import { parseJSON } from './parser/jsonParser';
import { parseRecordsCSV } from './parser/csvParser';
import { processEmployees } from './engine/otCalculator';
import { useSettings } from './store/useSettings';
import { useRecordsView } from './store/useRecordsView';
import { useSidebarView, applySidebarView, buildHolidayOptions } from './store/useSidebarView';
import { mergeRecords } from './parser/mergeRecords';
import { AttendanceData, Holiday } from './types';
import { DataDialog } from './components/DataDialog';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { DetailPanel } from './components/DetailPanel/DetailPanel';
import { LandingPage } from './components/LandingPage';
import { SettingsModal } from './components/Settings/SettingsModal';
import { buildPDF } from './pdf/buildPDF';
import { format } from 'date-fns';
import { flexibleParseDate, cn } from './lib/utils';
import { seedFileHolidays } from './lib/seedHolidays';
import { AlertTriangle, Users } from 'lucide-react';

export default function App() {
  const { policy, appearance, pdf, basicPay, holidays, saveSettings, setAppearance } = useSettings();
  const recordsView = useRecordsView();
  const sidebarView = useSidebarView();
  
  const [uploadedData, setUploadedData] = useState<AttendanceData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedErp, setSelectedErp] = useState<string | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Bumped on every open so Settings always starts from the saved values, while the same
  // component stays mounted long enough to play its closing animation.
  const [settingsSession, setSettingsSession] = useState(0);
  const [isDataOpen, setIsDataOpen] = useState(false);
  // "Load a different file" shows the upload screen over the loaded data (Back returns to it).
  const [loadingNewFile, setLoadingNewFile] = useState(false);
  // One level of undo for records added from a CSV.
  const [undoData, setUndoData] = useState<AttendanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (themeValue: string) => {
      if (themeValue === 'dark') {
        root.classList.add('dark');
      } else if (themeValue === 'light') {
        root.classList.remove('dark');
      } else {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    const theme = appearance.theme || 'system';
    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [appearance.theme]);

  const processedEmployees = useMemo(() => {
    if (!uploadedData) return [];
    // Only the policy, basic pay and holidays can change a result. Theme and PDF layout changes
    // must not trigger a recalculation.
    return processEmployees(uploadedData, { policy }, basicPay, holidays);
  }, [uploadedData, policy, basicPay, holidays]);

  // The input stays instant; the list catches up a moment later instead of blocking each keystroke.
  const deferredQuery = useDeferredValue(searchQuery);
  const { filters, sortKey, sortOrder } = sidebarView;
  const filteredEmployees = useMemo(() => {
    // Every word must match somewhere in name, ERP or designation.
    const terms = deferredQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const matching = terms.length === 0
      ? processedEmployees
      : processedEmployees.filter(emp => {
          const haystack = `${emp.name} ${emp.erp} ${emp.designation}`.toLowerCase();
          return terms.every(t => haystack.includes(t));
        });
    return applySidebarView(matching, { filters, sortKey, sortOrder });
  }, [processedEmployees, deferredQuery, filters, sortKey, sortOrder]);
  const holidayOptions = useMemo(() => buildHolidayOptions(processedEmployees), [processedEmployees]);

  const selectedEmployee = useMemo(() => {
    if (!selectedErp) return null;
    const cleanSel = String(selectedErp).trim().toLowerCase();
    const numSel = parseInt(cleanSel, 10);
    return processedEmployees.find(emp => {
      const cleanEmp = String(emp.erp).trim().toLowerCase();
      if (cleanEmp === cleanSel) return true;
      if (!isNaN(numSel) && parseInt(cleanEmp, 10) === numSel) return true;
      if (emp.name.trim().toLowerCase() === cleanSel) return true;
      return false;
    }) || null;
  }, [processedEmployees, selectedErp]);

  const monthLabel = useMemo(() => {
    if (!uploadedData || uploadedData.dates.length === 0) return '';
    
    const dateObjs = uploadedData.dates.map(d => flexibleParseDate(d)).filter(d => !isNaN(d.getTime()));
    if (dateObjs.length === 0) return '';
    
    dateObjs.sort((a, b) => a.getTime() - b.getTime());
    
    const firstDate = dateObjs[0];
    const lastDate = dateObjs[dateObjs.length - 1];
    const firstMonth = format(firstDate, 'MMM');
    const lastMonth = format(lastDate, 'MMM');
    const firstYear = format(firstDate, 'yyyy');
    const lastYear = format(lastDate, 'yyyy');

    if (firstYear === lastYear) {
      if (firstMonth === lastMonth) {
        return format(firstDate, 'MMMM yyyy');
      }
      return `${firstMonth}-${lastMonth} ${firstYear}`;
    }
    
    return `${firstMonth} ${firstYear} - ${lastMonth} ${lastYear}`;
  }, [uploadedData]);

  const seedHolidays = (fileHolidays: Holiday[] | undefined) =>
    seedFileHolidays(fileHolidays, policy.fileHolidaysSeen, holidays);

  /** Add records for one or more employees to the data that is already loaded (menu > Add records). */
  const handleAddRecords = (incoming: AttendanceData) => {
    if (!uploadedData) return { addedEmployees: 0, updatedEmployees: 0, days: 0 };
    const { data, ...summary } = mergeRecords(uploadedData, incoming);
    setUndoData(uploadedData);
    setUploadedData(data);
    const seeded = seedHolidays(incoming.holidays);
    if (seeded.changed) {
      saveSettings({ ...policy, fileHolidaysSeen: seeded.seen }, appearance, pdf, basicPay, seeded.holidays);
    }
    return summary;
  };

  const handleUndoRecords = () => {
    if (!undoData) return;
    setUploadedData(undoData);
    setUndoData(null);
  };

  const handleUpload = (fileText: string, fileName?: string) => {
    try {
      const isCsv = (fileName || '').toLowerCase().endsWith('.csv');
      const data: AttendanceData = isCsv
        ? parseRecordsCSV(fileText, policy.shiftDurationHours)
        : parseJSON(
            fileText,
            fileName || '',
            policy.shiftDurationHours,
          );

      if (data.employees.length === 0) {
        throw new Error('No employees found in this file.');
      }

      // Merge rich JSON metadata into application settings if available
      const updatedBasicPay = { ...basicPay };
      let hasNewBasicPay = false;
      data.employees.forEach(emp => {
        if (emp.basicPay && emp.basicPay > 0 && !updatedBasicPay[emp.erp]) {
          updatedBasicPay[emp.erp] = emp.basicPay;
          hasNewBasicPay = true;
        }
      });

      const updatedCategories = { ...policy.designationCategories };
      let hasNewCategories = false;
      data.employees.forEach(emp => {
        if (emp.category && !updatedCategories[emp.designation]) {
          updatedCategories[emp.designation] = emp.category;
          hasNewCategories = true;
        } else if (emp.isSupport !== undefined && !updatedCategories[emp.designation]) {
          updatedCategories[emp.designation] = emp.isSupport ? 'support' : 'official';
          hasNewCategories = true;
        }
      });

      const seeded = seedHolidays(data.holidays);

      if (hasNewBasicPay || hasNewCategories || seeded.changed) {
        saveSettings(
          {
            ...policy,
            designationCategories: updatedCategories,
            fileHolidaysSeen: seeded.seen,
          },
          appearance,
          pdf,
          updatedBasicPay,
          seeded.holidays
        );
      }

      // A previously selected employee may not exist in the new file; clear it so
      // mobile never lands on an empty detail view with the list hidden.
      if (selectedErp && !data.employees.some((e) => e.erp === selectedErp)) {
        setSelectedErp(null);
      }
      setUploadedData(data);
      setLoadingNewFile(false);
      setUndoData(null);
      setError(null);

      clearTimeout(warningTimer.current);
      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
        warningTimer.current = setTimeout(() => setWarnings([]), 8000);
      } else {
        setWarnings([]);
      }
    } catch (err) {
      clearTimeout(errorTimer.current);
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      errorTimer.current = setTimeout(() => setError(null), 8000);
    }
  };

  // Desktop opens on the first employee the list actually shows (so a filter never leaves the
  // detail panel on someone who isn't in the list).
  useEffect(() => {
    if (filteredEmployees.length > 0 && !selectedErp) {
      if (window.innerWidth >= 768) {
        setSelectedErp(filteredEmployees[0].erp);
      }
    }
  }, [filteredEmployees, selectedErp]);

  const handleExport = () => {
    if (processedEmployees.length === 0) return;
    const doc = buildPDF(processedEmployees, { policy, appearance, pdf }, monthLabel);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const showLandingView = !uploadedData || loadingNewFile;

  const openSettings = () => {
    setSettingsSession(n => n + 1);
    setIsSettingsOpen(true);
  };

  // Close first, recalculate after: the dialog's closing animation is painted before the (heavier)
  // recalculation starts, so Save & Apply never feels frozen.
  const handleSettingsSave: typeof saveSettings = (...args) => {
    startTransition(() => saveSettings(...args));
  };

  return (
    <div className="h-[100dvh] w-screen bg-background text-foreground font-sans overflow-hidden flex flex-col relative">
      <Navbar 
        onSettingsClick={openSettings}
        onExportClick={handleExport}
        onAddRecordsClick={() => setIsDataOpen(true)}
        onLoadFileClick={() => setLoadingNewFile(true)}
        hasData={processedEmployees.length > 0}
        monthLabel={monthLabel}
        theme={appearance.theme || 'system'}
        onThemeChange={(theme) => {
          setAppearance({ ...appearance, theme });
          saveSettings(policy, { ...appearance, theme }, pdf, basicPay, holidays);
        }}
      />
      
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative app-shell">
        {showLandingView ? (
          <LandingPage 
            onUpload={handleUpload} 
            error={error} 
            hasExistingData={!!uploadedData}
            onReturnToDashboard={() => setLoadingNewFile(false)}
          />
        ) : (
          <div className="flex-1 min-h-0 min-w-0 flex flex-col md:flex-row overflow-hidden md:rounded-xl md:border md:border-border">
            <div className={cn(
              "shrink-0 w-full md:w-[320px] h-full border-r border-[var(--color-border)]",
              selectedEmployee ? "hidden md:flex md:flex-col" : "flex flex-col"
            )}>
              <Sidebar
                employees={filteredEmployees}
                totalCount={processedEmployees.length}
                holidayOptions={holidayOptions}
                view={sidebarView}
                selectedErp={selectedErp}
                onSelect={setSelectedErp}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
            
            <div className={cn(
              "flex-1 min-h-0 relative",
              selectedEmployee ? "flex flex-col h-full overflow-hidden" : "hidden md:flex md:flex-col h-full overflow-hidden"
            )}>
              {selectedEmployee ? (
                <div key={selectedEmployee.erp} className="flex flex-col h-full relative">
                  <DetailPanel 
                    employee={selectedEmployee}
                    view={recordsView} 
                    onBack={() => setSelectedErp(null)}
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] p-8 text-center">
                  <Users className="w-16 h-16 mb-4 opacity-10" strokeWidth={1.5} />
                  <h3 className="text-ui font-medium text-[var(--color-text-muted)]">
                    No Employee Selected
                  </h3>
                  <p className="max-w-xs mt-1 text-caption">
                    Select an employee from the sidebar to view details.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[var(--z-fixed)] animate-in fade-in slide-in-from-top-2 duration-[var(--duration-enter)] w-[90%] md:w-[400px]">
            <div className="bg-[var(--color-bg-card)] border-l-4 border-[var(--color-danger)] text-[var(--color-text-main)] px-4 py-3 rounded shadow-xl flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[var(--color-danger)]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-ui text-[var(--color-danger)]">Upload Error</h4>
                <p className="text-caption opacity-90">{error}</p>
              </div>
            </div>
          </div>
        )}

        {warnings.length > 0 && !error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[var(--z-fixed)] animate-in fade-in slide-in-from-top-2 duration-[var(--duration-enter)] w-[90%] md:w-[500px]">
            <div className="bg-[var(--color-bg-card)] border-l-4 border-[var(--color-warning)] text-[var(--color-text-main)] px-4 py-3 rounded shadow-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 text-[var(--color-warning)] mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-ui text-[var(--color-warning)]">
                    {warnings.length} row{warnings.length === 1 ? '' : 's'} skipped
                  </h4>
                  <ul className="text-caption opacity-90 mt-0.5 space-y-0.5 max-h-32 overflow-y-auto">
                    {warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}
                    {warnings.length > 8 && <li className="italic">…and {warnings.length - 8} more.</li>}
                  </ul>
                </div>
                <button
                  onClick={() => setWarnings([])}
                  className="shrink-0 text-muted-foreground hover:text-foreground text-caption"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isDataOpen && uploadedData && (
        <DataDialog
          current={uploadedData}
          monthLabel={monthLabel}
          shiftDurationHours={policy.shiftDurationHours}
          canUndo={undoData !== null}
          onApply={handleAddRecords}
          onUndo={handleUndoRecords}
          onClose={() => setIsDataOpen(false)}
        />
      )}

      {(isSettingsOpen || settingsSession > 0) && (
        <Fragment key={settingsSession}>
        <SettingsModal
          open={isSettingsOpen}
          policy={policy}
          appearance={appearance}
          pdf={pdf}
          basicPay={basicPay}
          holidays={holidays}
          employees={uploadedData?.employees || []}
          dates={uploadedData?.dates || []}
          onSave={handleSettingsSave}
          onClose={() => setIsSettingsOpen(false)}
        />
        </Fragment>
      )}
    </div>
  );
}
