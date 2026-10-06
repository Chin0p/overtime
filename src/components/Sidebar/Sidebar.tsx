import { useState } from 'react';
import { Search, Filter, Check, ArrowUpDown } from 'lucide-react';
import { ProcessedEmployee } from '../../types';
import { EmployeeCard } from './EmployeeCard';
import { Input } from '../ui/input';
import { buttonVariants } from '../ui/button';
import { cn } from '../../lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';

interface SidebarProps {
  employees: ProcessedEmployee[];
  selectedErp: string | null;
  onSelect: (erp: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type SortKey = 'file' | 'name' | 'designation' | 'ot' | 'amount';
type SortOrder = 'asc' | 'desc';

const SORT_OPTIONS: { key: SortKey; label: string; asc?: string; desc?: string }[] = [
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

export function Sidebar({ employees, selectedErp, onSelect, searchQuery, onSearchChange }: SidebarProps) {
  const [filterBy, setFilterBy] = useState<'all' | 'missing_pay' | 'has_ot'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('file');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const filteredEmployees = employees.filter(emp => {
    if (filterBy === 'missing_pay') return emp.rateType === 'dynamic' && emp.basicPay === 0;
    if (filterBy === 'has_ot') return emp.totalOTHours > 0;
    return true;
  });

  if (sortKey !== 'file') {
    const dir = sortOrder === 'asc' ? 1 : -1;
    filteredEmployees.sort((a, b) => {
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name) * dir;
        case 'designation': return (a.designation.localeCompare(b.designation) || a.name.localeCompare(b.name)) * dir;
        case 'ot': return (a.totalOTHours - b.totalOTHours) * dir;
        default: return (a.totalAmount - b.totalAmount) * dir;
      }
    });
  }

  return (
    <aside className="w-full h-full bg-card flex flex-col shrink-0">
      <div className="p-2 md:p-3 border-b border-border">
        <h2 className="hidden md:block text-[12px] font-bold text-foreground tracking-wide mb-2 uppercase">Employees</h2>
        <div className="flex items-center gap-1.5 mb-1">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              type="text"
              placeholder="Search name, ERP or designation..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 text-[12px] h-8"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className={cn(iconBtn, filterBy !== 'all' && activeCls)} title="Filter employees" aria-label="Filter employees">
              <Filter size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-[12px]">
              <DropdownMenuLabel className="text-[11px]">Filter Employees</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterBy('all')} className="text-[12px]">
                All Employees
                {filterBy === 'all' && <Check size={13} className="ml-auto text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('missing_pay')} className="text-[12px]">
                Missing Basic Pay
                {filterBy === 'missing_pay' && <Check size={13} className="ml-auto text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('has_ot')} className="text-[12px]">
                Has OT Hours
                {filterBy === 'has_ot' && <Check size={13} className="ml-auto text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className={cn(iconBtn, sortKey !== 'file' && activeCls)} title="Sort employees" aria-label="Sort employees">
              <ArrowUpDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-[12px] w-52">
              {SORT_OPTIONS.map((opt, i) => (
                <div key={opt.key}>
                  {i > 0 && <DropdownMenuSeparator />}
                  {opt.asc ? (
                    <>
                      <DropdownMenuLabel className="text-[11px]">{opt.label}</DropdownMenuLabel>
                      {(['asc', 'desc'] as const).map((order) => (
                        <DropdownMenuItem
                          key={order}
                          onClick={() => { setSortKey(opt.key); setSortOrder(order); }}
                          className="text-[12px]"
                        >
                          {opt[order]}
                          {sortKey === opt.key && sortOrder === order && <Check size={13} className="ml-auto text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </>
                  ) : (
                    <DropdownMenuItem onClick={() => setSortKey('file')} className="text-[12px]">
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
              onClick={() => onSelect(emp.erp)}
            />
          ))
        ) : (
          <div className="p-6 w-full text-center text-[11px] text-muted-foreground select-none">
            No employees found
          </div>
        )}
      </div>
    </aside>
  );
}
