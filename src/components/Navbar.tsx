import { Settings, FileText, FolderOpen, Clock } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';

interface NavbarProps {
  onSettingsClick: () => void;
  onExportClick: () => void;
  onLandingClick?: () => void;
  hasData: boolean;
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
}

export function Navbar({ 
  onSettingsClick, 
  onExportClick, 
  onLandingClick,
  hasData, 
  theme, 
  onThemeChange 
}: NavbarProps) {

  return (
    <nav className="h-14 shrink-0 bg-background border-b border-border px-3 md:px-4 flex items-center justify-between z-50 relative gap-2">
      <div 
        className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 pr-1 cursor-pointer select-none"
        onClick={onLandingClick}
        title="Go to Landing Page"
      >
        <div className="w-7 h-7 rounded-md bg-primary shrink-0 flex items-center justify-center text-primary-foreground shadow-xs">
          <Clock size={15} strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[12px] font-bold text-foreground truncate">Overtime Manager</h1>
          </div>
          <p className="text-[10px] font-normal text-muted-foreground truncate leading-tight">
            RHO Islamabad
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {/* Choose / Change File without any up/down arrows */}
        <Button 
          variant="outline"
          onClick={onLandingClick}
          className="text-[12px] h-8 px-2.5 gap-1.5 font-medium"
          title="Open landing page or choose file"
        >
          <FolderOpen size={14} />
          <span className="hidden sm:inline">{hasData ? 'Change File' : 'Choose File'}</span>
        </Button>

        {hasData && (
          <Button 
            onClick={onExportClick}
            className="text-[12px] h-8 px-2.5 gap-1.5 font-semibold bg-primary text-primary-foreground"
            title="Export PDF Report"
          >
            <FileText size={14} />
            <span>Export PDF</span>
          </Button>
        )}

        <div className="w-px h-5 bg-border mx-0.5" />

        <ThemeToggle theme={theme} onChange={onThemeChange} />

        <Button 
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          title="Settings"
          className="size-8"
        >
          <Settings size={16} />
        </Button>
      </div>
    </nav>
  );
}
