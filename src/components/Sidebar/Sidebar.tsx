import { useState } from 'react';
import { Search, Filter, Check } from 'lucide-react';
import { ProcessedEmployee } from '../../types';
import { EmployeeCard } from './EmployeeCard';
import { Input } from '../ui/input';
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

export function Sidebar({ employees, selectedErp, onSelect, searchQuery, onSearchChange }: SidebarProps) {
  const [filterBy, setFilterBy] = useState<'all' | 'missing_pay' | 'has_ot'>('all');

  const filteredEmployees = employees.filter(emp => {
    if (filterBy === 'missing_pay') return emp.rateType === 'dynamic' && emp.basicPay === 0;
    if (filterBy === 'has_ot') return emp.totalOTHours > 0;
    return true;
  });

  return (
    <aside className="w-full h-full bg-card flex flex-col shrink-0">
      <div className="p-2 md:p-3 border-b border-border">
        <h2 className="hidden md:block text-[12px] font-bold text-foreground tracking-wide mb-2 uppercase">Employees</h2>
        <div className="relative mb-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input
            type="text"
            placeholder="Search name or ERP..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-8 text-[12px] h-8"
          />
          <DropdownMenu>
            <DropdownMenuTrigger className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <Filter size={13} />
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
