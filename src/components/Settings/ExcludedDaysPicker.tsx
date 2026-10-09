import { useMemo } from 'react';
import { cn, flexibleParseDate } from '../../lib/utils';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Whether a day is excluded for everyone being edited, for some of them, or for none. */
export type DayState = 'all' | 'some' | 'none';

interface Props {
  /** Dates in the loaded file, dd-MMM-yyyy. */
  dates: string[];
  stateOf: (date: string) => DayState;
  onToggle: (date: string) => void;
}

/**
 * A small calendar for picking days to leave out of someone's pay. Same idea as the Holidays tab,
 * but compact enough to sit inside an employee's settings.
 */
export function ExcludedDaysPicker({ dates, stateOf, onToggle }: Props) {
  const months = useMemo(() => {
    const groups = new Map<string, { label: string; days: { date: string; day: number; weekday: number }[] }>();
    dates.forEach((date) => {
      const d = flexibleParseDate(date);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!groups.has(key)) groups.set(key, { label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, days: [] });
      groups.get(key)!.days.push({ date, day: d.getDate(), weekday: d.getDay() });
    });
    return Array.from(groups.values());
  }, [dates]);

  if (months.length === 0) {
    return <p className="text-caption text-muted-foreground">No dates loaded yet.</p>;
  }

  return (
    <div className="space-y-4">
      {months.map((m) => (
        <div key={m.label}>
          <div className="text-ui font-semibold text-foreground mb-1.5">{m.label}</div>
          <div className="grid grid-cols-7 gap-1 max-w-sm">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-micro font-semibold text-muted-foreground text-center pb-0.5">{w}</div>
            ))}
            {Array.from({ length: m.days[0].weekday }).map((_, i) => <div key={`b${i}`} />)}
            {m.days.map((d) => {
              const state = stateOf(d.date);
              const weekend = d.weekday === 0 || d.weekday === 6;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => onToggle(d.date)}
                  aria-pressed={state === 'all'}
                  title={state === 'all' ? 'Excluded — tap to include again' : state === 'some' ? 'Excluded for some of the selected' : 'Tap to exclude this day'}
                  className={cn(
                    'h-9 rounded-md border text-ui font-semibold tabular-nums transition-colors cursor-pointer',
                    state === 'all' && 'bg-primary text-primary-foreground border-primary',
                    state === 'some' && 'bg-primary/15 text-primary border-primary/50 border-dashed',
                    state === 'none' && (weekend
                      ? 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                      : 'bg-card text-foreground border-border hover:bg-muted/60'),
                  )}
                >
                  {d.day}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
