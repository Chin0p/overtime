import { useState, useMemo, useEffect } from 'react';
import { parseCSV } from './parser/csvParser';
import { processEmployees } from './engine/otCalculator';
import { useSettings } from './store/useSettings';
import { ParsedCSV } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { DetailPanel } from './components/DetailPanel/DetailPanel';
import { SettingsModal } from './components/Settings/SettingsModal';
import { ThemeToggle } from './components/ThemeToggle';
import { buildPDF } from './pdf/buildPDF';
import { format } from 'date-fns';
import { flexibleParseDate, cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { policy, appearance, pdf, basicPay, holidays, saveSettings, setAppearance } = useSettings();
  
  const [uploadedData, setUploadedData] = useState<ParsedCSV | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedErp, setSelectedErp] = useState<string | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return processedEmployees.filter(emp => 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.erp.includes(searchQuery)
    );
  }, [processedEmployees, searchQuery]);

  const selectedEmployee = useMemo(() => {
    return processedEmployees.find(emp => emp.erp === selectedErp) || null;
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

  const handleUpload = (csvText: string) => {
    try {
      const data = parseCSV(csvText);
      const processed = processEmployees(data, { policy, appearance, pdf }, basicPay, holidays);
      
      if (processed.length === 0) {
        throw new Error('No employees found with overtime hours >= 1 or holiday work in this file.');
      }

      setUploadedData(data);
      setError(null);
      if (processed.length > 0) {
        setSelectedErp(processed[0].erp);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleExport = () => {
    if (processedEmployees.length === 0) return;
    const doc = buildPDF(processedEmployees, { policy, appearance, pdf }, monthLabel);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="h-[100dvh] w-screen bg-[var(--color-bg-app)] text-[var(--color-text-main)] font-sans overflow-hidden flex flex-col relative">
      <Navbar 
        onUpload={handleUpload}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onExportClick={handleExport}
        hasData={processedEmployees.length > 0}
        theme={appearance.theme || 'system'}
        organizationName={pdf.headerTitle || ''}
        onThemeChange={(theme) => {
          setAppearance({ ...appearance, theme });
          saveSettings(policy, { ...appearance, theme }, pdf, basicPay, holidays);
        }}
      />
      
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className={cn(
          "shrink-0 w-full md:w-[320px] h-full border-r border-[var(--color-border)]",
          (!uploadedData) ? "hidden md:flex md:flex-col" : (selectedErp ? "hidden md:flex md:flex-col" : "flex flex-col")
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
          selectedErp ? "flex flex-col h-full overflow-y-auto" : "hidden md:flex md:flex-col h-full overflow-y-auto"
        )}>
          {selectedEmployee ? (
            <div className="flex flex-col min-h-full relative">
              <DetailPanel 
                employee={selectedEmployee} 
                monthLabel={monthLabel}
                onBack={() => setSelectedErp(null)}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] p-8 text-center">
              <div className="w-16 h-16 mb-4 opacity-10">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-[var(--font-lg)] font-medium text-[var(--color-text-muted)]">
                {uploadedData ? "No Employee Selected" : "Upload CSV Data"}
              </h3>
              <p className="max-w-xs mt-1 text-[var(--font-sm)]">
                {uploadedData 
                  ? "Select an employee from the sidebar to view details." 
                  : "Please upload your attendance CSV file to view employee records and generate overtime reports."}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[var(--z-fixed)] animate-in fade-in slide-in-from-top-4 duration-300 w-[90%] md:w-[400px]">
            <div className="bg-[var(--color-bg-card)] border-l-4 border-[var(--color-danger)] text-[var(--color-text-main)] px-4 py-3 rounded shadow-xl flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[var(--color-danger)]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-[var(--font-sm)] text-[var(--color-danger)]">Upload Error</h4>
                <p className="text-[var(--font-xs)] opacity-90">{error}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="md:hidden fixed bottom-6 right-6 z-[var(--z-fixed)]">
        <ThemeToggle 
          theme={appearance.theme || 'system'} 
          onChange={(theme) => {
            setAppearance({ ...appearance, theme });
            saveSettings(policy, { ...appearance, theme }, pdf, basicPay, holidays);
          }}
          className="bg-[var(--color-bg-card)] rounded-[var(--radius-interactive)] shadow-xl border border-[var(--color-border)]"
        />
      </div>

      {isSettingsOpen && (
        <SettingsModal 
          policy={policy}
          appearance={appearance}
          pdf={pdf}
          basicPay={basicPay}
          holidays={holidays}
          employees={uploadedData?.employees || []}
          onSave={saveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
