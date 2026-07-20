import { useState, useMemo } from 'react';
import { ProcessedEmployee, ColumnId } from '../../types';
import { RecordsTable } from './RecordsTable';
import { EmployeeHeader } from './EmployeeHeader';
import { ArrowDownAZ, ArrowUpZA, Filter, Check, Columns } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, buttonVariants } from '../ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';

interface DetailPanelProps {
  employee: ProcessedEmployee;
  monthLabel: string;
  onBack?: () => void;
}

const ALL_COLUMNS: ColumnId[] = ['Office Timing', 'Total Hours Worked', 'Worked (OT)', 'Adjustment'];
const DEFAULT_COLUMNS: ColumnId[] = ['Adjustment'];

export function DetailPanel({ employee, monthLabel, onBack }: DetailPanelProps) {
  const [filter, setFilter] = useState<'all' | 'ot_only' | 'holidays'>('ot_only');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(DEFAULT_COLUMNS);
  
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
    if (sortOrder === 'desc') {
      result.reverse();
    }

    return result;
  }, [employee.records, filter, sortOrder]);

  return (
    <div className="min-h-full bg-background flex flex-col">
      <EmployeeHeader employee={employee} monthLabel={monthLabel} onBack={onBack} />
      
      <div className="py-4 md:p-6 flex-1 flex flex-col px-0 md:px-6">
        <div className="max-w-6xl mx-auto w-full space-y-2 md:space-y-4 flex-1 flex flex-col">
          
          <div className="flex flex-nowrap items-center justify-end gap-2 md:gap-4 px-4 md:px-0 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline" }), "gap-2 cursor-pointer", filter !== 'ot_only' && "text-primary border-primary")}>
                  <Filter size={16} />
                  <span className="hidden sm:inline">Filter</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>View options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilter('all')}>
                    All Days
                    {filter === 'all' && <Check size={14} className="ml-auto text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('ot_only')}>
                    Eligible
                    {filter === 'ot_only' && <Check size={14} className="ml-auto text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('holidays')}>
                    Holidays
                    {filter === 'holidays' && <Check size={14} className="ml-auto text-primary" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline" }), "gap-2 cursor-pointer", visibleColumns.length !== DEFAULT_COLUMNS.length && "text-primary border-primary")}>
                  <Columns size={16} />
                  <span className="hidden sm:inline">Columns</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ALL_COLUMNS.map(col => (
                    <DropdownMenuCheckboxItem
                      key={col}
                      checked={visibleColumns.includes(col)}
                      onCheckedChange={() => toggleColumn(col)}
                    >
                      {col}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <RecordsTable 
            records={processedRecords} 
            totalAmount={employee.totalAmount} 
            totalOTHours={employee.totalOTHours}
            visibleColumns={visibleColumns}
            sortOrder={sortOrder}
            onToggleSort={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          />
        </div>
      </div>
    </div>
  );
}
