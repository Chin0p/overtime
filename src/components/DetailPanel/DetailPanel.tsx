import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProcessedEmployee, OTSettings, ColumnId } from '../../types';
import { EmployeeHeader } from './EmployeeHeader';
import { RecordsTable } from './RecordsTable';
import { ArrowDownAZ, ArrowUpZA, LayoutList, LayoutGrid, Check, Columns, Filter } from 'lucide-react';
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
  const [showFilters, setShowFilters] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
      if (columnsRef.current && !columnsRef.current.contains(event.target as Node)) {
        setShowColumns(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      
      <div className="py-4 md:p-6 flex-1 flex flex-col px-0 md:px-6">
        <div className="max-w-6xl mx-auto w-full space-y-2 md:space-y-4 flex-1 flex flex-col">
          
          <div className="flex flex-nowrap items-center justify-end gap-2 md:gap-4 px-4 md:px-0 shrink-0">
            
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="flex items-center bg-background border border-white/10 rounded-lg p-1">
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 text-muted hover:text-white hover:bg-white/5 rounded-md transition-all btn-click"
                  title="Toggle Sort Order"
                >
                  {sortOrder === 'asc' ? <ArrowDownAZ size={16} /> : <ArrowUpZA size={16} />}
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                  onClick={() => setDensity('comfortable')}
                  className={cn("p-1.5 rounded-md transition-all btn-click", density === 'comfortable' ? "bg-white/10 text-white" : "text-muted hover:text-white hover:bg-white/5")}
                  title="Comfortable Density"
                >
                  <LayoutList size={16} />
                </button>
                <button
                  onClick={() => setDensity('compact')}
                  className={cn("p-1.5 rounded-md transition-all btn-click", density === 'compact' ? "bg-white/10 text-white" : "text-muted hover:text-white hover:bg-white/5")}
                  title="Compact Density"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>

              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn("flex items-center gap-2 px-3 py-2 bg-background border rounded-lg text-xs font-bold transition-all btn-click", showFilters ? "border-accent text-accent" : "border-white/10 text-muted hover:text-white")}
                >
                  <Filter size={16} />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                
                {showFilters && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-xl z-[100] p-2 flex flex-col gap-1">
                    <button
                      onClick={() => { setFilter('all'); setShowFilters(false); }}
                      className={cn("flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left", filter === 'all' ? "bg-white/5 text-white" : "text-muted hover:bg-white/5 hover:text-white")}
                    >
                      All Days
                      {filter === 'all' && <Check size={14} className="text-accent" />}
                    </button>
                    <button
                      onClick={() => { setFilter('ot_only'); setShowFilters(false); }}
                      className={cn("flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left", filter === 'ot_only' ? "bg-white/5 text-white" : "text-muted hover:bg-white/5 hover:text-white")}
                    >
                      Eligible (OT + Hol)
                      {filter === 'ot_only' && <Check size={14} className="text-accent" />}
                    </button>
                    <button
                      onClick={() => { setFilter('holidays'); setShowFilters(false); }}
                      className={cn("flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left", filter === 'holidays' ? "bg-white/5 text-white" : "text-muted hover:bg-white/5 hover:text-white")}
                    >
                      Holidays Only
                      {filter === 'holidays' && <Check size={14} className="text-accent" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="relative" ref={columnsRef}>
                <button
                  onClick={() => setShowColumns(!showColumns)}
                  className={cn("flex items-center gap-2 px-3 py-2 bg-background border rounded-lg text-xs font-bold transition-all btn-click", showColumns ? "border-accent text-accent" : "border-white/10 text-muted hover:text-white")}
                >
                  <Columns size={16} />
                  <span className="hidden sm:inline">Columns</span>
                </button>
                
                {showColumns && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-white/10 rounded-xl shadow-xl z-[100] p-2 flex flex-col gap-1">
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
