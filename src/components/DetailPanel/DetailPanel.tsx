import { useLayoutEffect, useMemo, useRef } from 'react';
import { ProcessedEmployee } from '../../types';
import { ALL_COLUMNS, DEFAULT_COLUMNS, DEFAULT_FILTER, RecordsSortKey as SortKey, RecordsView } from '../../store/useRecordsView';
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
  onBack?: () => void;
  /** Filter / sort / columns, owned by App so they persist across employees. */
  view: RecordsView;
}

const SORT_OPTIONS: { key: SortKey; label: string; asc: string; desc: string }[] = [
  { key: 'date', label: 'Date', asc: 'Oldest first', desc: 'Newest first' },
  { key: 'ot', label: 'Overtime hours', asc: 'Lowest first', desc: 'Highest first' },
  { key: 'amount', label: 'Amount', asc: 'Lowest first', desc: 'Highest first' },
];

const btn = cn(buttonVariants({ variant: 'outline' }), 'w-full md:w-auto h-9 md:h-8 justify-center gap-1.5 px-3 cursor-pointer');
const active = 'text-primary border-primary';

export function DetailPanel({ employee, onBack, view }: DetailPanelProps) {
  const { filter, setFilter, sortKey, sortOrder, setSort, visibleColumns, toggleColumn } = view;

  const processedRecords = useMemo(() => {
    let result = [...(employee?.records || [])];
    
    // Filter
    if (filter === 'ot_only') {
      result = result.filter(r =>
        r.otHours > 0 ||
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

  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const sync = () => el.style.setProperty('--pw', `${el.clientWidth}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sortActive = sortKey !== 'date' || sortOrder !== 'asc';

  return (
    // The panel is the ONE scroll container (both axes). The pinned bars size themselves to the
    // visible width (--pw, set below) while the table scrolls sideways underneath them.
    // --pw is the panel's clientWidth, i.e. WITHOUT its vertical scrollbar. 100cqw is not: it
    // includes the scrollbar, which made every pinned bar 15px too wide on Windows and produced a
    // horizontal scrollbar even when the table fit.
    <div ref={scrollRef} data-scroll-root className="@container h-full min-h-0 bg-background overflow-auto overscroll-contain">
      <div className="w-max min-w-full">
        <EmployeeHeader employee={employee} onBack={onBack} />

        <div className="max-w-6xl mx-auto px-3 @3xl:px-6 pt-3 pb-6 md:pt-5 flex flex-col gap-2 md:gap-4">

          {/* Full-width action row: labelled buttons (3 equal columns on phones) */}
          {/* Pinned at the same offset as its natural position (the side padding), so it does not slide when the table is scrolled sideways. */}
          <div className="sticky left-3 @3xl:left-6 w-[min(100%,calc(var(--pw,100cqw)-1.5rem))] @3xl:w-[min(100%,calc(var(--pw,100cqw)-3rem))] grid grid-cols-3 gap-2 md:flex md:justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(btn, filter !== DEFAULT_FILTER && active)}>
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
                        onClick={() => setSort(opt.key, order)}
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
              if (sortKey !== 'date') setSort('date', 'asc');
              else setSort('date', sortOrder === 'asc' ? 'desc' : 'asc');
            }}
          />
        </div>
      </div>
    </div>
  );
}
