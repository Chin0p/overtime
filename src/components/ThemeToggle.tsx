import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '../lib/utils';
import { buttonVariants } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
  className?: string;
}

export function ThemeToggle({ theme, onChange, className }: ThemeToggleProps) {
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "cursor-pointer")} title="Theme">
          <Icon size={18} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(['light', 'dark', 'system'] as Theme[]).map(t => {
            const TIcon = t === 'light' ? Sun : t === 'dark' ? Moon : Monitor;
            return (
              <DropdownMenuItem
                key={t}
                onClick={() => onChange(t)}
                className={cn(
                  "flex items-center gap-2",
                  theme === t && "bg-accent text-accent-foreground font-medium"
                )}
              >
                <TIcon size={14} />
                <span className="capitalize">{t}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
