import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Holiday } from '../../types';
import { flexibleParseDate, cn, formatCanonicalDate } from '../../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';

interface HolidaysTabProps {
  holidays: Holiday[];
  dates: string[];
  onChange: (holidays: Holiday[]) => void;
}

type DayKind = 'working' | 'weekend' | 'holiday' | 'nofile';

const LEGEND: { kind: DayKind; label: string; hint: string; swatch: string }[] = [
  { kind: 'working', label: 'Working day', hint: 'Overtime counts after office hours', swatch: 'bg-card border-border' },
  { kind: 'weekend', label: 'Weekend', hint: 'Off-day: attendance is paid at the holiday rate', swatch: 'bg-muted/40 border-transparent' },
  { kind: 'holiday', label: 'Holiday', hint: 'Marked by you: paid at the holiday rate', swatch: 'bg-primary border-primary' },
  { kind: 'nofile', label: 'Not in file', hint: 'Date is in the month but not in the upload', swatch: 'bg-card border-dashed border-border' },
];

const FLASH_MS = 1500;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HolidaysTab({ holidays, dates, onChange }: HolidaysTabProps) {
  // One calendar per month present in the file (files can span e.g. Jan–Feb).
  const months = useMemo(() => {
    const validDates = dates.map((d) => flexibleParseDate(d)).filter((d) => !isNaN(d.getTime()));
    if (validDates.length === 0) return [];

    const inFile = new Set(validDates.map((d) => formatCanonicalDate(d)));
    const monthStarts = new Map<number, Date>();
    validDates.forEach((d) => {
      const ms = startOfMonth(d);
      monthStarts.set(ms.getTime(), ms);
    });

    return Array.from(monthStarts.values())
      .sort((a, b) => a.getTime() - b.getTime())
      .map((monthStart) => ({
        monthStart,
        days: eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) }).map((dateObj) => {
          const formatted = formatCanonicalDate(dateObj);
          return {
            dateObj,
            formatted,
            isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
            inCsv: inFile.has(formatted),
          };
        }),
      }));
  }, [dates]);

  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

  // Tapping a legend entry flashes the matching days (and dims the rest) for a moment.
  const [flash, setFlash] = useState<DayKind | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);
  const flashFrame = useRef<number | undefined>(undefined);
  useEffect(() => () => {
    window.clearTimeout(flashTimer.current);
    window.cancelAnimationFrame(flashFrame.current ?? 0);
  }, []);
  const flashDays = (kind: DayKind) => {
    window.clearTimeout(flashTimer.current);
    setFlash(null); // clear first so tapping the same entry again restarts the animation
    flashFrame.current = window.requestAnimationFrame(() => {
      setFlash(kind);
      flashTimer.current = window.setTimeout(() => setFlash(null), FLASH_MS);
    });
  };

  // Holidays that fall in the month(s) shown, in date order; anything else is "saved for other months".
  const { shownHolidays, otherCount, stats, hasDaysOutsideFile, counts } = useMemo(() => {
    const parsed = holidays
      .map((h) => ({ h, d: flexibleParseDate(h.date) }))
      .filter((x) => !isNaN(x.d.getTime()))
      .sort((a, b) => a.d.getTime() - b.d.getTime());
    const inShown = parsed.filter((x) => months.some((m) => isSameMonth(m.monthStart, x.d)));
    let weekdays = 0;
    let weekend = 0;
    let outside = false;
    const counts: Record<DayKind, number> = { working: 0, weekend: 0, holiday: 0, nofile: 0 };
    months.forEach((m) =>
      m.days.forEach((d) => {
        if (d.isWeekend) weekend++;
        else weekdays++;
        if (!d.inCsv && !d.isWeekend) outside = true;
        counts[d.isWeekend ? 'weekend' : holidaySet.has(d.formatted) ? 'holiday' : !d.inCsv ? 'nofile' : 'working']++;
      }),
    );
    const weekdayHolidays = inShown.filter((x) => x.d.getDay() !== 0 && x.d.getDay() !== 6).length;
    return {
      shownHolidays: inShown,
      otherCount: parsed.length - inShown.length,
      stats: { working: weekdays - weekdayHolidays, weekend, holidays: weekdayHolidays },
      hasDaysOutsideFile: outside,
      counts,
    };
  }, [holidays, months, holidaySet]);

  const toggleHoliday = (dateFormatted: string) => {
    if (holidaySet.has(dateFormatted)) {
      onChange(holidays.filter((h) => h.date !== dateFormatted));
    } else {
      onChange([...holidays, { date: dateFormatted, name: 'Holiday' }]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-body font-bold text-foreground">Holidays</h3>
        <p className="text-caption text-muted-foreground mt-0.5">
          Tap a date to mark it as a gazetted holiday. Saturdays and Sundays are already off-days.
        </p>
      </div>

      {months.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-caption border-2 border-dashed border-border rounded-lg select-none">
          Upload a JSON file to view the current month's dates
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_230px] items-start">
          {/* Calendars */}
          <div className="space-y-5 min-w-0">
            {months.map(({ monthStart, days }) => (
              <div key={monthStart.getTime()} className="w-full max-w-[520px] mx-auto md:mx-0">
                <h4 className="text-body font-bold text-foreground mb-2">{format(monthStart, 'MMMM yyyy')}</h4>
                <div className="grid grid-cols-7 gap-1.5">
                  {WEEKDAYS.map((day, i) => (
                    <div
                      key={day}
                      className={cn(
                        'text-center text-micro font-bold uppercase tracking-wider pb-1',
                        i === 0 || i === 6 ? 'text-muted-foreground/50' : 'text-muted-foreground',
                      )}
                    >
                      {day}
                    </div>
                  ))}

                  {/* Empty slots so the 1st lands on its real weekday */}
                  {Array.from({ length: days[0].dateObj.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {days.map((pd) => {
                    const isHoliday = holidaySet.has(pd.formatted);
                    const kind: DayKind = pd.isWeekend ? 'weekend' : isHoliday ? 'holiday' : !pd.inCsv ? 'nofile' : 'working';
                    return (
                      <button
                        key={pd.formatted}
                        data-kind={kind}
                        type="button"
                        disabled={pd.isWeekend}
                        onClick={() => toggleHoliday(pd.formatted)}
                        title={
                          pd.isWeekend
                            ? 'Weekend — already an off-day'
                            : isHoliday
                              ? 'Holiday — tap to remove'
                              : !pd.inCsv
                                ? 'No attendance in this file for this date'
                                : 'Tap to mark as holiday'
                        }
                        aria-pressed={isHoliday}
                        className={cn(
                          'relative flex items-center justify-center h-10 rounded-md border text-ui font-bold transition-all active:scale-95',
                          flash && (flash === kind ? 'cal-flash z-10' : 'opacity-30'),
                          pd.isWeekend
                            ? 'bg-muted/40 border-transparent text-muted-foreground/50 cursor-not-allowed'
                            : isHoliday
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : !pd.inCsv
                                ? 'bg-card border-dashed border-border text-muted-foreground hover:border-primary hover:text-foreground'
                                : 'bg-card border-border text-foreground hover:border-primary hover:bg-muted/50',
                        )}
                      >
                        {format(pd.dateObj, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {hasDaysOutsideFile && (
              <p className="text-micro text-muted-foreground">Dashed dates have no attendance in the uploaded file.</p>
            )}
          </div>

          {/* Summary + selected holidays */}
          <aside className="rounded-lg border border-border bg-muted/10 md:sticky md:top-0">
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
              <Stat value={stats.working} label="Working" />
              <Stat value={stats.weekend} label="Weekend" />
              <Stat value={stats.holidays} label="Holiday" accent={stats.holidays > 0} />
            </div>

            <div className="p-3">
              <h4 className="text-caption font-bold text-foreground">Legend</h4>
              <p className="text-micro text-muted-foreground mt-0.5 mb-2">Tap one to find those days in the calendar.</p>
              <ul className="space-y-1">
                {LEGEND.map((item) => (
                  <Fragment key={item.kind}>
                    <LegendItem {...item} count={counts[item.kind]} active={flash === item.kind} onSelect={flashDays} />
                  </Fragment>
                ))}
              </ul>

              {shownHolidays.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange(holidays.filter((h) => !shownHolidays.some((x) => x.h.date === h.date)))}
                  className="mt-3 text-micro text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Clear holidays
                </button>
              )}

              {otherCount > 0 && (
                <p className="text-micro text-muted-foreground mt-2">
                  +{otherCount} more saved for other months.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="py-2.5 text-center">
      <div className={cn('text-title font-extrabold tabular-nums leading-none', accent ? 'text-primary' : 'text-foreground')}>
        {value}
      </div>
      <div className="text-micro uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function LegendItem({
  kind,
  label,
  hint,
  swatch,
  count,
  active,
  onSelect,
}: {
  kind: DayKind;
  label: string;
  hint: string;
  swatch: string;
  count: number;
  active: boolean;
  onSelect: (kind: DayKind) => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={count === 0}
        onClick={() => onSelect(kind)}
        className={cn(
          'w-full flex items-start gap-2 rounded-md px-1.5 py-1.5 -mx-1.5 text-left transition-colors',
          'enabled:hover:bg-muted/60 enabled:active:bg-muted disabled:opacity-50 cursor-pointer disabled:cursor-default',
          active && 'bg-muted/60',
        )}
      >
        <span className={cn('size-4 rounded border shrink-0 mt-0.5', swatch)} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2 text-caption font-medium text-foreground">
            {label}
            <span className="text-micro tabular-nums text-muted-foreground">{count}</span>
          </span>
          <span className="block text-micro leading-snug text-muted-foreground">{hint}</span>
        </span>
      </button>
    </li>
  );
}
