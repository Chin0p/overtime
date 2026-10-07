import { Check, Clock, FileSpreadsheet, FileText, FolderOpen, Menu, Monitor, Moon, Settings, Sun } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button, buttonVariants } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type Theme = 'light' | 'dark' | 'system';

interface NavbarProps {
  onSettingsClick: () => void;
  onExportClick: () => void;
  onAddRecordsClick: () => void;
  onLoadFileClick: () => void;
  hasData: boolean;
  /** Month/year of the loaded file, shown under the title (falls back to the office name). */
  monthLabel?: string;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

export function Navbar({
  onSettingsClick,
  onExportClick,
  onAddRecordsClick,
  onLoadFileClick,
  hasData,
  monthLabel,
  theme,
  onThemeChange,
}: NavbarProps) {
  return (
    <nav className="h-14 shrink-0 bg-background border-b border-border flex items-center justify-between z-50 relative gap-2 safe-nav">
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 pr-1 select-none">
        <div className="w-7 h-7 rounded-md bg-primary shrink-0 flex items-center justify-center text-primary-foreground shadow-xs">
          <Clock size={15} strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-label text-foreground truncate leading-tight">Overtime Manager</h1>
          <p className="text-caption font-normal text-muted-foreground truncate leading-tight">
            {monthLabel || 'RHO Islamabad'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {hasData && (
          <Button
            onClick={onExportClick}
            className="text-label h-8 px-2.5 gap-1.5 font-semibold bg-primary text-primary-foreground"
            title="Export PDF Report"
          >
            <FileText size={14} />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'cursor-pointer size-8')}
            title="Menu"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem disabled={!hasData} onClick={onAddRecordsClick} className="gap-2">
              <FileSpreadsheet size={14} />
              Add records (CSV)…
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!hasData} onClick={onLoadFileClick} className="gap-2">
              <FolderOpen size={14} />
              Load a different file…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSettingsClick} className="gap-2">
              <Settings size={14} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-caption">Theme</DropdownMenuLabel>
            {THEMES.map(({ value, label, Icon }) => (
              <DropdownMenuItem key={value} onClick={() => onThemeChange(value)} className="gap-2">
                <Icon size={14} />
                {label}
                {theme === value && <Check size={14} className="ml-auto text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
