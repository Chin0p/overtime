import React, { useRef } from 'react';
import { Settings, Download, Upload, Clock } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';

interface NavbarProps {
  onUpload: (text: string) => void;
  onSettingsClick: () => void;
  onExportClick: () => void;
  hasData: boolean;
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  organizationName: string;
}

export function Navbar({ onUpload, onSettingsClick, onExportClick, hasData, theme, onThemeChange, organizationName }: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onUpload(text);
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <nav className="h-16 shrink-0 bg-background border-b border-border px-4 flex items-center justify-between z-50 relative">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shadow-lg shadow-primary/20 text-primary-foreground">
          <Clock size={18} strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm md:text-lg font-bold tracking-tight text-foreground truncate">Overtime Manager</h1>
          {organizationName && <p className="text-[10px] md:text-xs font-medium text-muted-foreground tracking-wide uppercase truncate">{organizationName}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <input
          type="file"
          accept=".csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        <Button 
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="hidden md:flex gap-2"
        >
          <Upload size={16} />
          <span>Upload CSV</span>
        </Button>
        
        <Button 
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="md:hidden"
        >
          <Upload size={18} />
        </Button>

        {hasData && (
          <>
            <Button 
              onClick={onExportClick}
              className="hidden md:flex gap-2"
            >
              <Download size={16} />
              <span>Export PDF</span>
            </Button>
            
            <Button 
              size="icon"
              onClick={onExportClick}
              className="md:hidden"
            >
              <Download size={18} />
            </Button>
          </>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        <ThemeToggle theme={theme} onChange={onThemeChange} className="hidden md:block" />

        <Button 
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          title="Settings"
        >
          <Settings size={20} />
        </Button>
      </div>
    </nav>
  );
}
