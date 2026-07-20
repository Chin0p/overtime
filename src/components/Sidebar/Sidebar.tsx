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
      <div className="p-4 border-b border-border hidden md:block">
        <h2 className="text-base font-semibold text-foreground tracking-wide mb-4">Employees</h2>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            type="text"
            placeholder="Search name or ERP..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          <DropdownMenu>
            <DropdownMenuTrigger className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <Filter size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter Employees</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterBy('all')}>
                All Employees
                {filterBy === 'all' && <Check size={14} className="ml-auto text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('missing_pay')}>
                Missing Basic Pay
                {filterBy === 'missing_pay' && <Check size={14} className="ml-auto text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('has_ot')}>
                Has OT Hours
                {filterBy === 'has_ot' && <Check size={14} className="ml-auto text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Mobile search */}
      <div className="p-2 md:hidden border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          <DropdownMenu>
            <DropdownMenuTrigger className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <Filter size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter Employees</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterBy('all')}>
                All Employees
                {filterBy === 'all' && <Check size={14} className="ml-auto text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('missing_pay')}>
                Missing Basic Pay
                {filterBy === 'missing_pay' && <Check size={14} className="ml-auto text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterBy('has_ot')}>
                Has OT Hours
                {filterBy === 'has_ot' && <Check size={14} className="ml-auto text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 gap-1 flex flex-col" style={{ WebkitOverflowScrolling: 'touch' }}>
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
          <div className="p-8 w-full text-center text-sm text-muted-foreground select-none">
            No employees found
          </div>
        )}
      </div>
    </aside>
  );
}
