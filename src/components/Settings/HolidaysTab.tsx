import React, { useMemo } from 'react';
import { Holiday } from '../../types';
import { flexibleParseDate, cn } from '../../lib/utils';
import { format } from 'date-fns';

interface HolidaysTabProps {
  holidays: Holiday[];
  dates: string[];
  onChange: (holidays: Holiday[]) => void;
}

export function HolidaysTab({ holidays, dates, onChange }: HolidaysTabProps) {
  const parsedDates = useMemo(() => {
    return dates.map(d => {
      const dateObj = flexibleParseDate(d);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      return { 
        raw: d, 
        dateObj, 
        isWeekend, 
        formatted: isNaN(dateObj.getTime()) ? d : format(dateObj, 'dd-MMM-yyyy') 
      };
    }).filter(d => !isNaN(d.dateObj.getTime()));
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
        <h3 className="text-lg font-bold text-foreground">Holidays</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select the dates that should be marked as gazetted holidays. 
          Weekends (Saturday & Sunday) are already treated as off-days.
        </p>
      </div>

      {parsedDates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg select-none">
          Upload a CSV to view the current month's dates
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 md:gap-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 md:mb-2">
              {day}
            </div>
          ))}
          
          {/* Fill empty slots before first day */}
          {Array.from({ length: parsedDates[0].dateObj.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="p-1 md:p-3" />
          ))}

          {parsedDates.map((pd, idx) => {
            const isHoliday = holidays.some(h => h.date === pd.formatted);
            const isWeekend = pd.isWeekend;

            return (
              <button
                key={idx}
                disabled={isWeekend}
                onClick={() => toggleHoliday(pd.formatted)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-1 h-11 md:p-2 md:h-14 rounded-lg border transition-all active:scale-95",
                  isWeekend 
                    ? "bg-muted/30 border-border/50 opacity-50 cursor-not-allowed"
                    : isHoliday 
                      ? "bg-primary/10 border-primary/30 shadow-sm"
                      : "bg-card border-border hover:border-primary hover:bg-muted/50"
                )}
              >
                <span className={cn(
                  "text-sm font-bold",
                  isWeekend ? "text-muted-foreground" 
                  : isHoliday ? "text-primary" 
                  : "text-foreground"
                )}>
                  {format(pd.dateObj, 'd')}
                </span>
                
                {isHoliday && !isWeekend && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}
      
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-muted/30 border border-border/50 opacity-50" />
          <span className="text-xs text-muted-foreground">Weekend</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/10 border border-primary/30" />
          <span className="text-xs text-muted-foreground">Holiday</span>
        </div>
      </div>
    </div>
  );
}
