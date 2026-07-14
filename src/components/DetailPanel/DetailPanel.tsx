import React, { useState, useMemo } from 'react';
import { ProcessedEmployee, OTSettings, ColumnId } from '../../types';
import { EmployeeHeader } from './EmployeeHeader';
import { RecordsTable } from './RecordsTable';
import { ArrowDownAZ, ArrowUpZA, LayoutList, LayoutGrid, Check, Columns } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DetailPanelProps {
  employee: ProcessedEmployee;
  monthLabel: string;
}

const ALL_COLUMNS: ColumnId[] = ['Worked (OT)', 'Adjustment', 'Office Timing', 'Total Hours Worked'];

export function DetailPanel({ employee, monthLabel }: DetailPanelProps) {
  const [filter, setFilter] = useState<'all' | 'ot_only' | 'holidays'>('ot_only');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(['Worked (OT)', 'Adjustment', 'Total Hours Worked']);
  const [showColumns, setShowColumns] = useState(false);

  const toggleColumn = (id: ColumnId) => {
    setVisibleColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const processedRecords = useMemo(() => {
    let result = [...employee.records];
    
    // Filter
    if (filter === 'ot_only') {
      result = result.filter(r => r.otHours >= 1 || r.isHoliday);
    } else if (filter === 'holidays') {
      result = result.filter(r => r.isHoliday);
    }

    // Sort
    result.sort((a, b) => {
      // sort by original index conceptually, but date strings (e.g. DD-MM-YYYY) can be compared if we parse them.
      // But employee.records are already sorted by date usually. We'll just reverse them if desc.
      return sortOrder === 'asc' ? 0 : -1;
    });
    
    if (sortOrder === 'desc') {
      result.reverse();
    }

    return result;
  }, [employee.records, filter, sortOrder]);

  return (
    <div className="min-h-full bg-background flex flex-col">
      <EmployeeHeader employee={employee} monthLabel={monthLabel} />
      
      <div className="p-6 flex-1 flex flex-col">
        <div className="max-w-6xl mx-auto w-full space-y-4 flex-1 flex flex-col">
          
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-surface rounded-xl border border-white/5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex bg-background border border-white/10 rounded-lg p-1">
                <button
                  onClick={() => setFilter('all')}
                  className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filter === 'all' ? "bg-accent text-black shadow-sm" : "text-muted hover:text-white")}
                >
                  All Days
                </button>
                <button
                  onClick={() => setFilter('ot_only')}
                  className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filter === 'ot_only' ? "bg-accent text-black shadow-sm" : "text-muted hover:text-white")}
                >
                  Eligible (OT + Hol)
                </button>
                <button
                  onClick={() => setFilter('holidays')}
                  className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-all", filter === 'holidays' ? "bg-accent text-black shadow-sm" : "text-muted hover:text-white")}
                >
                  Holidays Only
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-background border border-white/10 rounded-lg p-1">
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 text-muted hover:text-white hover:bg-white/5 rounded-md transition-all"
                  title="Toggle Sort Order"
                >
                  {sortOrder === 'asc' ? <ArrowDownAZ size={16} /> : <ArrowUpZA size={16} />}
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                  onClick={() => setDensity('comfortable')}
                  className={cn("p-1.5 rounded-md transition-all", density === 'comfortable' ? "bg-white/10 text-white" : "text-muted hover:text-white hover:bg-white/5")}
                  title="Comfortable Density"
                >
                  <LayoutList size={16} />
                </button>
                <button
                  onClick={() => setDensity('compact')}
                  className={cn("p-1.5 rounded-md transition-all", density === 'compact' ? "bg-white/10 text-white" : "text-muted hover:text-white hover:bg-white/5")}
                  title="Compact Density"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowColumns(!showColumns)}
                  className={cn("flex items-center gap-2 px-3 py-2 bg-background border rounded-lg text-xs font-bold transition-all", showColumns ? "border-accent text-accent" : "border-white/10 text-muted hover:text-white")}
                >
                  <Columns size={16} />
                  Columns
                </button>
                
                {showColumns && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1">
                    {ALL_COLUMNS.map(col => {
                      const isVisible = visibleColumns.includes(col);
                      return (
                        <button
                          key={col}
                          onClick={() => toggleColumn(col)}
                          className={cn("flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left", isVisible ? "bg-white/5 text-white" : "text-muted hover:bg-white/5 hover:text-white")}
                        >
                          {col}
                          {isVisible && <Check size={14} className="text-accent" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <RecordsTable 
            records={processedRecords} 
            totalAmount={employee.totalAmount} 
            totalOTHours={employee.totalOTHours}
            visibleColumns={visibleColumns}
            density={density}
          />
        </div>
      </div>
    </div>
  );
}
