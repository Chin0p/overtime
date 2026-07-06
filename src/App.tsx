/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useMemo, useEffect } from 'react';
import { parseCSV } from './parser/csvParser';
import { processEmployees } from './engine/otCalculator';
import { useSettings } from './store/useSettings';
import { ParsedCSV } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { DetailPanel } from './components/DetailPanel/DetailPanel';
import { SettingsModal } from './components/Settings/SettingsModal';
import { buildPDF } from './pdf/buildPDF';
import { format } from 'date-fns';
import { flexibleParseDate } from './lib/utils';

export default function App() {
  const { policy, appearance, pdf, basicPay, holidays, saveSettings } = useSettings();
  
  const [uploadedData, setUploadedData] = useState<ParsedCSV | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedErp, setSelectedErp] = useState<string | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', appearance.accentColor);
    
    // Safer alpha calculation for accent color
    let primary = appearance.accentColor;
    if (!primary.startsWith('#')) {
      primary = '#ffffff';
    }
    
    const hex = primary.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 255;
    const g = parseInt(hex.substring(2, 4), 16) || 255;
    const b = parseInt(hex.substring(4, 6), 16) || 255;
    
    root.style.setProperty('--accent-color-hover', `rgba(${r}, ${g}, ${b}, 0.8)`);
    root.style.setProperty('--accent-color-active', `rgba(${r}, ${g}, ${b}, 0.6)`);
  }, [appearance.accentColor]);

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
    
    // Sort dates
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
    <div className="h-screen bg-background text-gray-100 font-sans overflow-hidden relative">
      <Navbar 
        onUpload={handleUpload}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onExportClick={handleExport}
        hasData={processedEmployees.length > 0}
      />
      
      <main className="flex h-full relative">
        <div className="pt-16 flex shrink-0">
          <Sidebar 
            employees={filteredEmployees}
            selectedErp={selectedErp}
            onSelect={setSelectedErp}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto pt-16">
          {selectedEmployee ? (
            <DetailPanel 
              employee={selectedEmployee} 
              monthLabel={monthLabel}
              appearance={appearance}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 p-8 text-center">
              <div className="w-16 h-16 mb-4 opacity-10">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-500">No Employee Selected</h3>
              <p className="max-w-xs mt-1 text-sm">Upload a CSV or select an employee from the sidebar to view details.</p>
            </div>
          )}
        </div>

        {/* Error Toast */}
        {error && (
          <div className="absolute bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-400/20">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-sm">Upload Error</h4>
                <p className="text-xs opacity-90">{error}</p>
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
          onSave={saveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
