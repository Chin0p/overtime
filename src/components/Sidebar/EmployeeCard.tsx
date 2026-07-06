import React from 'react';
import { cn } from '../../lib/utils';
import { ProcessedEmployee } from '../../types';
import { AlertTriangle, Info } from 'lucide-react';

interface EmployeeCardProps {
  employee: ProcessedEmployee;
  isSelected: boolean;
  onClick: () => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, isSelected, onClick }) => {
  const hasBasicPay = employee.basicPay > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-xl transition-all group relative",
        isSelected 
          ? "bg-accent/10 ring-1 ring-accent/20 z-10" 
          : "hover:bg-surface-hover hover:z-20"
      )}
    >
      <div className="flex justify-between items-center mb-1">
        <h3 className={cn(
          "font-semibold text-sm truncate pr-2",
          isSelected ? "text-white" : "text-gray-100"
        )}>
          {employee.name}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {!hasBasicPay && !employee.isSupport && (
            <div className="group/tooltip relative">
              <AlertTriangle size={14} className="text-amber-500" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-surface text-white text-xs font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-white/10">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface border-t border-l border-white/10 rotate-45" />
                Basic pay missing
              </div>
            </div>
          )}
          {employee.isSupport && (
            <div className="group/tooltip relative">
              <Info size={14} className="text-white" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-surface text-white text-xs font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-white/10">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface border-t border-l border-white/10 rotate-45" />
                Support Staff
              </div>
            </div>
          )}
          <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 text-xs text-muted font-medium tracking-tight rounded select-none leading-none">
            {employee.totalOTHours}h
          </span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted truncate">
          {employee.designation} <span className="mx-1 text-white/20">•</span> {employee.erp}
        </p>
      </div>
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full" />
      )}
    </button>
  );
}
