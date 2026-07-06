import { Search } from 'lucide-react';
import { ProcessedEmployee } from '../../types';
import { EmployeeCard } from './EmployeeCard';

interface SidebarProps {
  employees: ProcessedEmployee[];
  selectedErp: string | null;
  onSelect: (erp: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Sidebar({ employees, selectedErp, onSelect, searchQuery, onSearchChange }: SidebarProps) {
  return (
    <aside className="w-80 bg-surface border-r border-white/5 flex flex-col shrink-0">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-md font-semibold text-muted tracking-wide mb-4">Employees</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim" size={16} />
          <input
            type="text"
            placeholder="Search name or ERP..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-white/5 rounded-xl text-sm text-white placeholder-muted-dim focus:ring-2 focus:ring-white/20 outline-none transition-all"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {employees.length > 0 ? (
          employees.map(emp => (
            <EmployeeCard
              key={emp.erp}
              employee={emp}
              isSelected={selectedErp === emp.erp}
              onClick={() => onSelect(emp.erp)}
            />
          ))
        ) : (
          <div className="p-8 text-center text-sm text-gray-500">
            No employees found
          </div>
        )}
      </div>
    </aside>
  );
}
