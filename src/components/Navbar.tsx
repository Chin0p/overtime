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
    <nav className="w-full md:h-16 py-4 md:py-0 bg-surface/80 backdrop-blur-md border-b border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between px-4 md:px-6 shrink-0 z-50 gap-4 md:gap-0">
      <div className="flex items-center gap-3 justify-center md:justify-start">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-black shadow-lg shadow-accent/10">
          <FileText size={22} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">Overtime Manager</h1>
          <p className="text-xs font-medium text-muted-dim tracking-wide uppercase">NADRA RHO Islamabad</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
          aria-label="Upload CSV File"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-muted hover:bg-surface-hover hover:text-white rounded-lg transition-all btn-click"
          aria-label="Click to upload a CSV file"
        >
          <Upload size={18} aria-hidden="true" />
          <span>Upload CSV</span>
        </button>
        
        <button
          onClick={onSettingsClick}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-muted hover:bg-surface-hover hover:text-white rounded-lg transition-all btn-click"
          aria-label="Open Settings"
        >
          <Settings size={18} aria-hidden="true" />
          <span>Settings</span>
        </button>

        <div className="hidden md:block w-px h-6 bg-white/5 mx-2" aria-hidden="true" />

        <button
          onClick={onExportClick}
          disabled={!hasData}
          className="flex items-center justify-center gap-2 px-5 py-3 md:py-2 text-sm font-bold text-black bg-accent hover:bg-accent-hover disabled:bg-white/5 disabled:text-muted-dim disabled:cursor-not-allowed rounded-lg btn-click mt-2 md:mt-0"
          aria-label="Export generated report as PDF"
        >
          <Download size={18} aria-hidden="true" />
          <span>Export PDF</span>
        </button>
      </div>
    </nav>
  );
}
