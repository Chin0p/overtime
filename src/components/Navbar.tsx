import React, { useRef } from 'react';
import { FileText, Settings, Upload, Download } from 'lucide-react';

interface NavbarProps {
  onUpload: (csvText: string) => void;
  onSettingsClick: () => void;
  onExportClick: () => void;
  hasData: boolean;
}

export function Navbar({ onUpload, onSettingsClick, onExportClick, hasData }: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Type validation
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      alert('Please upload a valid CSV file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Size validation (Max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      onUpload(text);
      // Clean up input so same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      alert('Failed to read file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <nav className="w-full h-16 bg-surface/80 backdrop-blur-md border-b border-white/5 flex flex-row items-center justify-between px-4 md:px-6 shrink-0 z-50">
      <div className="flex items-center gap-3 justify-start">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-accent rounded-xl flex items-center justify-center text-black shadow-lg shadow-accent/10 shrink-0">
          <FileText size={20} className="md:w-[22px] md:h-[22px]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold tracking-tight text-white truncate">Overtime Manager</h1>
          <p className="text-[10px] md:text-xs font-medium text-muted-dim tracking-wide uppercase truncate">NADRA RHO Islamabad</p>
        </div>
      </div>

      <div className="flex flex-row items-center gap-1 md:gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
          aria-label="Upload CSV File"
        />

        {!hasData && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-2 md:px-4 md:py-2 text-sm font-bold text-muted hover:bg-surface-hover hover:text-white rounded-lg transition-all btn-click"
            aria-label="Click to upload a CSV file"
          >
            <Upload size={18} aria-hidden="true" />
            <span className="hidden md:inline">Upload CSV</span>
          </button>
        )}
        
        <button
          onClick={onSettingsClick}
          className="flex items-center justify-center gap-2 p-2 md:px-4 md:py-2 text-sm font-bold text-muted hover:bg-surface-hover hover:text-white rounded-lg transition-all btn-click"
          aria-label="Open Settings"
        >
          <Settings size={18} aria-hidden="true" />
          <span className="hidden md:inline">Settings</span>
        </button>

        {hasData && (
          <>
            <div className="w-px h-6 bg-white/5 mx-1 md:mx-2" aria-hidden="true" />
            <button
              onClick={onExportClick}
              className="flex items-center justify-center gap-2 p-2 md:px-5 md:py-2 text-sm font-bold text-black bg-accent hover:bg-accent-hover active:bg-accent-active rounded-lg btn-click"
              aria-label="Export generated report as PDF"
            >
              <Download size={18} aria-hidden="true" />
              <span className="hidden md:inline">Export PDF</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
