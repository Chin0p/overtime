import { useState, useMemo } from 'react';
import { ProcessedEmployee, ColumnId } from '../../types';
import { RecordsTable } from './RecordsTable';
import { EmployeeHeader } from './EmployeeHeader';
import { Filter, Check, Columns, ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { buttonVariants } from '../ui/button';
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

type SortKey = 'date' | 'ot' | 'amount';

const SORT_OPTIONS: { key: SortKey; label: string; asc: string; desc: string }[] = [
  { key: 'date', label: 'Date', asc: 'Oldest first', desc: 'Newest first' },
  { key: 'ot', label: 'Overtime hours', asc: 'Lowest first', desc: 'Highest first' },
  { key: 'amount', label: 'Amount', asc: 'Lowest first', desc: 'Highest first' },
];

const ALL_COLUMNS: ColumnId[] = ['Office Timing', 'Total Hours Worked', 'Worked (OT)', 'Adjustment'];
const DEFAULT_COLUMNS: ColumnId[] = ['Adjustment'];

const btn = cn(buttonVariants({ variant: 'outline' }), 'w-full md:w-auto h-9 md:h-8 justify-center gap-1.5 px-3 cursor-pointer');
const active = 'text-primary border-primary';

export function DetailPanel({ employee, monthLabel, onBack }: DetailPanelProps) {
  const [filter, setFilter] = useState<'all' | 'ot_only' | 'holidays'>('ot_only');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(DEFAULT_COLUMNS);
  
  const toggleColumn = (id: ColumnId) => {
    setVisibleColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const processedRecords = useMemo(() => {
    let result = [...(employee?.records || [])];
    
    // Filter
    if (filter === 'ot_only') {
      result = result.filter(r =>
        r.otHours >= 1 ||
        (r.isHoliday && r.timeIn !== '' && r.timeOut !== '')
      );
    } else if (filter === 'holidays') {
      result = result.filter(r => r.isHoliday);
    }

    // Sort (stable: ties keep date order)
    if (sortKey === 'date') {
      if (sortOrder === 'desc') result.reverse();
    } else {
      const val = (r: (typeof result)[number]) => (sortKey === 'ot' ? r.otHours : r.amount);
      const dir = sortOrder === 'asc' ? 1 : -1;
      result.sort((a, b) => (val(a) - val(b)) * dir);
    }

    return result;
  }, [employee?.records, filter, sortKey, sortOrder]);

  const sortActive = sortKey !== 'date' || sortOrder !== 'asc';

  return (
    // The panel is the ONE scroll container (both axes). `@container` lets the
    // pinned bars size themselves to the visible width (100cqw) while the table
    // scrolls sideways underneath them.
    <div data-scroll-root className="@container h-full min-h-0 bg-background overflow-auto overscroll-contain">
      <div className="w-max min-w-full">
        <EmployeeHeader employee={employee} monthLabel={monthLabel} onBack={onBack} />

        <div className="max-w-6xl mx-auto px-3 md:px-6 pt-3 pb-6 md:pt-5 flex flex-col gap-2 md:gap-4">

          {/* Full-width action row: labelled buttons (3 equal columns on phones) */}
          <div className="sticky left-0 w-[calc(100cqw-1.5rem)] md:w-[calc(100cqw-3rem)] grid grid-cols-3 gap-2 md:flex md:justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(btn, filter !== 'all' && active)}>
                <Filter size={15} />
                <span>Filter</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
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
              <DropdownMenuTrigger className={cn(btn, sortActive && active)}>
                <ArrowUpDown size={15} />
                <span>Sort</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                {SORT_OPTIONS.map((opt, i) => (
                  <div key={opt.key}>
                    {i > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel>{opt.label}</DropdownMenuLabel>
                    {(['asc', 'desc'] as const).map(order => (
                      <DropdownMenuItem
                        key={order}
                        onClick={() => { setSortKey(opt.key); setSortOrder(order); }}
                      >
                        {opt[order]}
                        {sortKey === opt.key && sortOrder === order && <Check size={14} className="ml-auto text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className={cn(btn, visibleColumns.length !== DEFAULT_COLUMNS.length && active)}>
                <Columns size={15} />
                <span>Columns</span>
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

          <RecordsTable 
            records={processedRecords} 
            visibleColumns={visibleColumns}
            sortOrder={sortOrder}
            sortKey={sortKey}
            onToggleSort={() => {
              // Clicking the Date column always sorts by date, flipping direction.
              if (sortKey !== 'date') { setSortKey('date'); setSortOrder('asc'); }
              else setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            }}
          />
        </div>
      </div>
    </div>
  );
}
