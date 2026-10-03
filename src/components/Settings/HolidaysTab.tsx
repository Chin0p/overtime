import { useMemo } from 'react';
import { Holiday } from '../../types';
import { flexibleParseDate, cn, formatCanonicalDate } from '../../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

interface HolidaysTabProps {
  holidays: Holiday[];
  dates: string[];
  onChange: (holidays: Holiday[]) => void;
}

export function HolidaysTab({ holidays, dates, onChange }: HolidaysTabProps) {
  const calendarDates = useMemo(() => {
    const validDates = dates.map(d => flexibleParseDate(d)).filter(d => !isNaN(d.getTime()));
    if (validDates.length === 0) return [];
    
    // Get the month of the first valid date
    const firstDate = validDates[0];
    const monthStart = startOfMonth(firstDate);
    const monthEnd = endOfMonth(firstDate);
    
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return allDays.map(dateObj => {
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      return { 
        dateObj, 
        isWeekend, 
        formatted: formatCanonicalDate(dateObj),
        inCsv: validDates.some(vd => formatCanonicalDate(vd) === formatCanonicalDate(dateObj))
      };
    });
  }, [dates]);

  const toggleHoliday = (dateFormatted: string) => {
    const exists = holidays.find(h => h.date === dateFormatted);
    if (exists) {
      onChange(holidays.filter(h => h.date !== dateFormatted));
    } else {
      onChange([...holidays, { date: dateFormatted, name: 'Holiday' }]);
    }
  };

  return (
  <div className="space-y-6">
    <div>
      <h3 className="text-[12px] font-bold text-foreground">Holidays</h3>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        Select the dates that should be marked as gazetted holidays. Weekends (Saturday
        &amp; Sunday) are already treated as off-days.
      </p>
    </div>

    {calendarDates.length === 0 ? (
      <div className="text-center py-10 text-muted-foreground text-[11px] border-2 border-dashed border-border rounded-lg select-none">
        Upload a file (JSON or CSV) to view the current month's dates
      </div>
    ) : (
      <div className="max-w-[420px] mx-auto">
        <div className="grid grid-cols-7 gap-1.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1"
            >
              {day}
            </div>
          ))}

          {/* Empty slots before first day */}
          {Array.from({ length: calendarDates[0].dateObj.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {calendarDates.map((pd, idx) => {
            const isHoliday = holidays.some((h) => h.date === pd.formatted);
            const isWeekend = pd.isWeekend;

            return (
              <button
                key={idx}
                disabled={isWeekend}
                onClick={() => toggleHoliday(pd.formatted)}
                className={cn(
                  'relative flex items-center justify-center aspect-square rounded-lg border transition-all active:scale-95',
                  isWeekend
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
                    isWeekend
                      ? 'text-muted-foreground'
                      : isHoliday
                        ? 'text-primary'
                        : 'text-foreground',
                  )}
                >
                  {format(pd.dateObj, 'd')}
                </span>
                {isHoliday && !isWeekend && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 items-center mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted/30 border border-border/50 opacity-50" />
            <span className="text-[11px] text-muted-foreground">Weekend</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/10 border border-primary/30" />
            <span className="text-[11px] text-muted-foreground">Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-card border border-dashed border-border opacity-50" />
            <span className="text-[11px] text-muted-foreground">Not in file</span>
          </div>
        </div>
      </div>
    )}
  </div>
);