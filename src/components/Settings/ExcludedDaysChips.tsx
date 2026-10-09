import { useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { cn, flexibleParseDate } from '../../lib/utils';
import { buttonVariants } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

/** Whether a day is excluded for everyone being edited, for some of them, or for none. */
export type DayState = 'all' | 'some' | 'none';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "03-Sep-2026" -> "Wed 03 Sep". */
function dayLabel(date: string): string {
  const d = flexibleParseDate(date);
  if (isNaN(d.getTime())) return date;
  return `${DAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]}`;
}

interface Props {
  /** Dates in the loaded file, dd-MMM-yyyy. */
  dates: string[];
  stateOf: (date: string) => DayState;
  /** Exclude (on) or include again (off) one day for everyone being edited. */
  onSet: (date: string, on: boolean) => void;
  onClear: () => void;
}

/**
 * Excluded days as chips: pick days from a dropdown and they appear as removable chips.
 * (The calendar lives only in the Holidays tab.)
 */
export function ExcludedDaysChips({ dates, stateOf, onSet, onClear }: Props) {
  const months = useMemo(() => {
    const groups = new Map<string, { label: string; days: string[] }>();
    dates.forEach((date) => {
      const d = flexibleParseDate(date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!groups.has(key)) groups.set(key, { label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, days: [] });
      groups.get(key)!.days.push(date);
    });
    return Array.from(groups.values());
  }, [dates]);

  const chosen = dates.filter((d) => stateOf(d) !== 'none');

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {chosen.length === 0 && <span className="text-ui text-muted-foreground mr-1">No days excluded.</span>}
        {chosen.map((date) => {
          const state = stateOf(date);
          const partial = state === 'some';
          return (
            <span
              key={date}
              className={cn(
                'inline-flex items-center h-7 rounded-full border text-ui font-medium tabular-nums overflow-hidden',
                partial ? 'border-dashed border-primary/50 bg-primary/5 text-primary' : 'border-primary/30 bg-primary/10 text-primary',
              )}
            >
              {/* A partial chip: tap the label to apply the day to everyone selected. */}
              <button
                type="button"
                disabled={!partial}
                onClick={() => onSet(date, true)}
                title={partial ? 'Excluded for some of the selected — tap to apply to all' : undefined}
                className={cn('pl-2.5 pr-1.5 h-full', partial ? 'cursor-pointer hover:bg-primary/10' : 'cursor-default')}
              >
                {dayLabel(date)}
                {partial && <span className="ml-1 text-micro opacity-70">some</span>}
              </button>
              <button
                type="button"
                onClick={() => onSet(date, false)}
                aria-label={`Include ${dayLabel(date)} again`}
                title="Include this day again"
                className="pr-2 pl-0.5 h-full cursor-pointer hover:bg-primary/10"
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ variant: 'outline' }), 'h-8 gap-1.5 px-2.5 text-ui cursor-pointer')}
            disabled={months.length === 0}
          >
            <Plus size={14} />
            Add days
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto text-ui">
            {months.map((m, i) => (
              <div key={m.label}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-caption">{m.label}</DropdownMenuLabel>
                {m.days.map((date) => (
                  <DropdownMenuCheckboxItem
                    key={date}
                    checked={stateOf(date) === 'all'}
                    onCheckedChange={(on) => onSet(date, on)}
                    className="tabular-nums"
                  >
                    {dayLabel(date)}
                    {stateOf(date) === 'some' && <span className="ml-auto mr-4 text-micro text-muted-foreground">some</span>}
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {chosen.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-caption font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
