import { Search, Filter, Check, ArrowUpDown } from 'lucide-react';
import { ProcessedEmployee } from '../../types';
import { EmployeeCard } from './EmployeeCard';
import { Input } from '../ui/input';
import { buttonVariants } from '../ui/button';
import { cn } from '../../lib/utils';
import { SidebarFilter, SidebarSortKey, SidebarView, DEFAULT_SIDEBAR_FILTER } from '../../store/useSidebarView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';

interface SidebarProps {
  /** Already searched, filtered and sorted by App. */
  employees: ProcessedEmployee[];
  view: SidebarView;
  selectedErp: string | null;
  onSelect: (erp: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const FILTER_OPTIONS: { value: SidebarFilter; label: string }[] = [
  { value: 'has_ot', label: 'Has OT Hours' },
  { value: 'all', label: 'All Employees' },
  { value: 'missing_pay', label: 'Missing Basic Pay' },
  { value: 'exempt', label: 'Exempt' },
];

const EMPTY_TEXT: Record<SidebarFilter, string> = {
  has_ot: 'No employees with OT hours',
  all: 'No employees found',
  missing_pay: 'Nobody is missing basic pay',
  exempt: 'No exempt employees',
};

const SORT_OPTIONS: { key: SidebarSortKey; label: string; asc?: string; desc?: string }[] = [
  { key: 'file', label: 'File order' },
  { key: 'name', label: 'Name', asc: 'A to Z', desc: 'Z to A' },
  { key: 'designation', label: 'Designation', asc: 'A to Z', desc: 'Z to A' },
  { key: 'ot', label: 'Overtime hours', asc: 'Lowest first', desc: 'Highest first' },
  { key: 'amount', label: 'Total amount', asc: 'Lowest first', desc: 'Highest first' },
];

const iconBtn = cn(
  buttonVariants({ variant: 'outline' }),
  'size-8 p-0 shrink-0 justify-center cursor-pointer',
);
const activeCls = 'text-primary border-primary';

export function Sidebar({ employees, view, selectedErp, onSelect, searchQuery, onSearchChange }: SidebarProps) {
  const { filterBy, setFilterBy, sortKey, sortOrder, setSort } = view;
  const filteredEmployees = employees;

  return (
    <aside className="w-full h-full bg-card flex flex-col shrink-0">
      <div className="p-2 md:p-3 border-b border-border">
        <h2 className="hidden md:block text-label text-foreground tracking-wide mb-2 uppercase">Employees</h2>
        <div className="flex items-center gap-1.5 mb-1">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              type="text"
              placeholder="Search name, ERP or designation..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 text-body h-8"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className={cn(iconBtn, filterBy !== DEFAULT_SIDEBAR_FILTER && activeCls)} title="Filter employees" aria-label="Filter employees">
              <Filter size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-body">
              <DropdownMenuLabel className="text-caption">Filter Employees</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {FILTER_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => setFilterBy(opt.value)} className="text-body">
                  {opt.label}
                  {filterBy === opt.value && <Check size={13} className="ml-auto text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className={cn(iconBtn, sortKey !== 'file' && activeCls)} title="Sort employees" aria-label="Sort employees">
              <ArrowUpDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-ui w-52">
              {SORT_OPTIONS.map((opt, i) => (
                <div key={opt.key}>
                  {i > 0 && <DropdownMenuSeparator />}
                  {opt.asc ? (
                    <>
                      <DropdownMenuLabel className="text-caption">{opt.label}</DropdownMenuLabel>
                      {(['asc', 'desc'] as const).map((order) => (
                        <DropdownMenuItem
                          key={order}
                          onClick={() => setSort(opt.key, order)}
                          className="text-body"
                        >
                          {opt[order]}
                          {sortKey === opt.key && sortOrder === order && <Check size={13} className="ml-auto text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </>
                  ) : (
                    <DropdownMenuItem onClick={() => setSort('file', 'asc')} className="text-body">
                      {opt.label}
                      {sortKey === 'file' && <Check size={13} className="ml-auto text-primary" />}
                    </DropdownMenuItem>
                  )}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-1.5 gap-1 flex flex-col" style={{ WebkitOverflowScrolling: 'touch' }}>
        {filteredEmployees.length > 0 ? (
          filteredEmployees.map(emp => (
            <EmployeeCard
              key={emp.erp}
              employee={emp}
              isSelected={selectedErp === emp.erp}
              onSelect={onSelect}
            />
          ))
        ) : (
          <div className="p-6 w-full text-center text-caption text-muted-foreground select-none">
            {searchQuery.trim() ? 'No employees match your search' : EMPTY_TEXT[filterBy]}
            {filterBy !== 'all' && (
              <button
                type="button"
                onClick={() => setFilterBy('all')}
                className="block mx-auto mt-2 text-primary font-medium hover:underline cursor-pointer"
              >
                Show all employees
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
