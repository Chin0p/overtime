import { useMemo } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Holiday } from '../../types';
import { flexibleParseDate, cn, formatCanonicalDate } from '../../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';

interface HolidaysTabProps {
  holidays: Holiday[];
  dates: string[];
  onChange: (holidays: Holiday[]) => void;
}

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

  // Holidays that fall in the month(s) shown, in date order; anything else is "saved for other months".
  const { shownHolidays, otherCount, stats, hasDaysOutsideFile } = useMemo(() => {
    const parsed = holidays
      .map((h) => ({ h, d: flexibleParseDate(h.date) }))
      .filter((x) => !isNaN(x.d.getTime()))
      .sort((a, b) => a.d.getTime() - b.d.getTime());
    const inShown = parsed.filter((x) => months.some((m) => isSameMonth(m.monthStart, x.d)));
    let weekdays = 0;
    let weekend = 0;
    let outside = false;
    months.forEach((m) =>
      m.days.forEach((d) => {
        if (d.isWeekend) weekend++;
        else weekdays++;
        if (!d.inCsv && !d.isWeekend) outside = true;
      }),
    );
    const weekdayHolidays = inShown.filter((x) => x.d.getDay() !== 0 && x.d.getDay() !== 6).length;
    return {
      shownHolidays: inShown,
      otherCount: parsed.length - inShown.length,
      stats: { working: weekdays - weekdayHolidays, weekend, holidays: weekdayHolidays },
      hasDaysOutsideFile: outside,
    };
  }, [holidays, months]);

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
        <h3 className="text-[12px] font-bold text-foreground">Holidays</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Tap a date to mark it as a gazetted holiday. Saturdays and Sundays are already off-days.
        </p>
      </div>

      {months.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-[11px] border-2 border-dashed border-border rounded-lg select-none">
          Upload a JSON file to view the current month's dates
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_230px] items-start">
          {/* Calendars */}
          <div className="space-y-5 min-w-0">
            {months.map(({ monthStart, days }) => (
              <div key={monthStart.getTime()} className="w-full max-w-[520px] mx-auto md:mx-0">
                <h4 className="text-[13px] font-bold text-foreground mb-2">{format(monthStart, 'MMMM yyyy')}</h4>
                <div className="grid grid-cols-7 gap-1.5">
                  {WEEKDAYS.map((day, i) => (
                    <div
                      key={day}
                      className={cn(
                        'text-center text-[10px] font-bold uppercase tracking-wider pb-1',
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
                    return (
                      <button
                        key={pd.formatted}
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
                          'relative flex items-center justify-center h-10 rounded-md border text-[12px] font-bold transition-all active:scale-95',
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
              <p className="text-[10px] text-muted-foreground">Dashed dates have no attendance in the uploaded file.</p>
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
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-bold text-foreground">Selected holidays</h4>
                {shownHolidays.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange(holidays.filter((h) => !shownHolidays.some((x) => x.h.date === h.date)))}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>

              {shownHolidays.length === 0 ? (
                <div className="flex flex-col items-center text-center py-5 text-muted-foreground select-none">
                  <CalendarDays size={20} className="opacity-40 mb-1.5" />
                  <p className="text-[11px]">No holidays yet.</p>
                  <p className="text-[10px] opacity-80">Tap a date on the calendar.</p>
                </div>
              ) : (
                <ul className="space-y-1 max-h-[220px] overflow-y-auto">
                  {shownHolidays.map(({ h, d }) => (
                    <li
                      key={h.date}
                      className="flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-md bg-card border border-border"
                    >
                      <span className="flex-1 text-[11px] font-medium text-foreground">{format(d, 'EEE, d MMM')}</span>
                      <button
                        type="button"
                        onClick={() => toggleHoliday(h.date)}
                        className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                        aria-label={`Remove ${h.date}`}
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {otherCount > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
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
      <div className={cn('text-[15px] font-extrabold tabular-nums leading-none', accent ? 'text-primary' : 'text-foreground')}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
