import { useMemo } from 'react';
import { Holiday } from '../../types';
import { flexibleParseDate, cn, formatCanonicalDate } from '../../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

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

  const toggleHoliday = (dateFormatted: string) => {
    if (holidaySet.has(dateFormatted)) {
      onChange(holidays.filter((h) => h.date !== dateFormatted));
    } else {
      onChange([...holidays, { date: dateFormatted, name: 'Holiday' }]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Title left, legend right — saves a row of vertical space */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-56">
          <h3 className="text-[12px] font-bold text-foreground">Holidays</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Select the dates that should be marked as gazetted holidays. Weekends (Saturday
            &amp; Sunday) are already treated as off-days.
          </p>
        </div>
        {months.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 items-center pt-0.5">
            <LegendItem swatch="bg-muted/30 border-border/50 opacity-50" label="Weekend" />
            <LegendItem swatch="bg-primary/10 border-primary/30" label="Holiday" />
            <LegendItem swatch="bg-card border-dashed border-border opacity-50" label="Not in file" />
          </div>
        )}
      </div>

      {months.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-[11px] border-2 border-dashed border-border rounded-lg select-none">
          Upload a file (JSON or CSV) to view the current month's dates
        </div>
      ) : (
        <div className="space-y-5">
          {months.map(({ monthStart, days }) => (
            <div key={monthStart.getTime()} className="max-w-[420px] mx-auto">
              {months.length > 1 && (
                <h4 className="text-[11px] font-semibold text-foreground mb-1.5">
                  {format(monthStart, 'MMMM yyyy')}
                </h4>
              )}
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
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
                      className={cn(
                        'relative flex items-center justify-center h-8 rounded-md border transition-all active:scale-95',
                        pd.isWeekend
                          ? 'bg-muted/30 border-border/50 opacity-50 cursor-not-allowed'
                          : isHoliday
                            ? 'bg-primary/10 border-primary/30 shadow-sm'
                            : !pd.inCsv
                              ? 'bg-card border-border border-dashed opacity-50 hover:border-primary hover:opacity-100'
                              : 'bg-card border-border hover:border-primary hover:bg-muted/50',
                      )}
                    >
                      <span
                        className={cn(
                          'text-[12px] font-bold',
                          pd.isWeekend
                            ? 'text-muted-foreground'
                            : isHoliday
                              ? 'text-primary'
                              : 'text-foreground',
                        )}
                      >
                        {format(pd.dateObj, 'd')}
                      </span>
                      {isHoliday && !pd.isWeekend && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-3 h-3 rounded border', swatch)} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
