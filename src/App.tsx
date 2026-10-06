import { useState, useMemo, useEffect, useRef } from 'react';
import { parseJSON } from './parser/jsonParser';
import { processEmployees } from './engine/otCalculator';
import { useSettings } from './store/useSettings';
import { useRecordsView } from './store/useRecordsView';
import { mergeRecords } from './parser/mergeRecords';
import { AttendanceData } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { DetailPanel } from './components/DetailPanel/DetailPanel';
import { LandingPage } from './components/LandingPage';
import { SettingsModal } from './components/Settings/SettingsModal';
import { buildPDF } from './pdf/buildPDF';
import { format } from 'date-fns';
import { flexibleParseDate, cn } from './lib/utils';
import { AlertTriangle, Users } from 'lucide-react';

export default function App() {
  const { policy, appearance, pdf, basicPay, holidays, saveSettings, setAppearance } = useSettings();
  const recordsView = useRecordsView();
  
  const [uploadedData, setUploadedData] = useState<AttendanceData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedErp, setSelectedErp] = useState<string | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    return processEmployees(uploadedData, { policy, appearance, pdf }, basicPay, holidays);
  }, [uploadedData, policy, appearance, pdf, basicPay, holidays]);

  const filteredEmployees = useMemo(() => {
    // Every word must match somewhere in name, ERP or designation.
    const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return processedEmployees;
    return processedEmployees.filter(emp => {
      const haystack = `${emp.name} ${emp.erp} ${emp.designation}`.toLowerCase();
      return terms.every(t => haystack.includes(t));
    });
  }, [processedEmployees, searchQuery]);

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

  /** Add records for one or more employees to the data that is already loaded (Settings > Backup / Reset). */
  const handleAddRecords = (incoming: AttendanceData) => {
    if (!uploadedData) return { addedEmployees: 0, updatedEmployees: 0, days: 0 };
    const { data, ...summary } = mergeRecords(uploadedData, incoming);
    setUploadedData(data);
    return summary;
  };

  const handleUpload = (fileText: string, fileName?: string) => {
    try {
      const data: AttendanceData = parseJSON(
        fileText,
        fileName || 'august-2026',
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

      let updatedHolidays = [...holidays];
      let hasNewHolidays = false;
      if (data.holidays && data.holidays.length > 0) {
        const existingDates = new Set(holidays.map(h => h.date));
        data.holidays.forEach(h => {
          if (!existingDates.has(h.date)) {
            updatedHolidays.push(h);
            existingDates.add(h.date);
            hasNewHolidays = true;
          }
        });
      }

      if (hasNewBasicPay || hasNewCategories || hasNewHolidays) {
        saveSettings(
          {
            ...policy,
            designationCategories: updatedCategories,
          },
          appearance,
          pdf,
          updatedBasicPay,
          updatedHolidays
        );
      }

      // A previously selected employee may not exist in the new file; clear it so
      // mobile never lands on an empty detail view with the list hidden.
      if (selectedErp && !data.employees.some((e) => e.erp === selectedErp)) {
        setSelectedErp(null);
      }
      setUploadedData(data);
      setError(null);

      clearTimeout(warningTimer.current);
      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
        warningTimer.current = setTimeout(() => setWarnings([]), 5000);
      } else {
        setWarnings([]);
      }
    } catch (err) {
      clearTimeout(errorTimer.current);
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      errorTimer.current = setTimeout(() => setError(null), 5000);
    }
  };

  useEffect(() => {
    if (processedEmployees.length > 0 && !selectedErp) {
      if (window.innerWidth >= 768) {
        setSelectedErp(processedEmployees[0].erp);
      }
    }
  }, [processedEmployees, selectedErp]);

  const handleExport = () => {
    if (processedEmployees.length === 0) return;
    const doc = buildPDF(processedEmployees, { policy, appearance, pdf }, monthLabel);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const showLandingView = !uploadedData;

  return (
    <div className="h-[100dvh] w-screen bg-[var(--color-bg-app)] text-[var(--color-text-main)] font-sans overflow-hidden flex flex-col relative">
      <Navbar 
        onSettingsClick={() => setIsSettingsOpen(true)}
        onExportClick={handleExport}
        hasData={processedEmployees.length > 0}
        theme={appearance.theme || 'system'}
        onThemeChange={(theme) => {
          setAppearance({ ...appearance, theme });
          saveSettings(policy, { ...appearance, theme }, pdf, basicPay, holidays);
        }}
      />
      
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {showLandingView ? (
          <LandingPage 
            onUpload={handleUpload} 
            error={error} 
          />
        ) : (
          <>
            <div className={cn(
              "shrink-0 w-full md:w-[320px] h-full border-r border-[var(--color-border)]",
              selectedEmployee ? "hidden md:flex md:flex-col" : "flex flex-col"
            )}>
              <Sidebar 
                employees={filteredEmployees}
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
                    monthLabel={monthLabel}
                    onBack={() => setSelectedErp(null)}
                  />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] p-8 text-center">
                  <Users className="w-16 h-16 mb-4 opacity-10" strokeWidth={1.5} />
                  <h3 className="text-[12px] font-medium text-[var(--color-text-muted)]">
                    No Employee Selected
                  </h3>
                  <p className="max-w-xs mt-1 text-[11px]">
                    Select an employee from the sidebar to view details.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[var(--z-fixed)] animate-in fade-in slide-in-from-top-4 duration-300 w-[90%] md:w-[400px]">
            <div className="bg-[var(--color-bg-card)] border-l-4 border-[var(--color-danger)] text-[var(--color-text-main)] px-4 py-3 rounded shadow-xl flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[var(--color-danger)]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-[12px] text-[var(--color-danger)]">Upload Error</h4>
                <p className="text-[11px] opacity-90">{error}</p>
              </div>
            </div>
          </div>
        )}

        {warnings.length > 0 && !error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[var(--z-fixed)] animate-in fade-in slide-in-from-top-4 duration-300 w-[90%] md:w-[500px]">
            <div className="bg-[var(--color-bg-card)] border-l-4 border-[var(--color-warning)] text-[var(--color-text-main)] px-4 py-3 rounded shadow-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 text-[var(--color-warning)] mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[12px] text-[var(--color-warning)]">
                    {warnings.length} row{warnings.length === 1 ? '' : 's'} skipped
                  </h4>
                  <ul className="text-[11px] opacity-90 mt-0.5 space-y-0.5 max-h-32 overflow-y-auto">
                    {warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}
                    {warnings.length > 8 && <li className="italic">…and {warnings.length - 8} more.</li>}
                  </ul>
                </div>
                <button
                  onClick={() => setWarnings([])}
                  className="shrink-0 text-muted-foreground hover:text-foreground text-[11px]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isSettingsOpen && (
        <SettingsModal 
          policy={policy}
          appearance={appearance}
          pdf={pdf}
          basicPay={basicPay}
          holidays={holidays}
          employees={uploadedData?.employees || []}
          dates={uploadedData?.dates || []}
          onSave={saveSettings}
          onAddRecords={handleAddRecords}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
