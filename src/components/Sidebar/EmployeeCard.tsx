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
        "w-full text-left p-3 rounded-[var(--radius-interactive)] transition-all flex flex-col group relative shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-focus-ring)]",
        isSelected 
          ? "bg-[var(--color-neutral-active)] z-10 text-[var(--color-accent)]" 
          : "hover:bg-[var(--color-neutral-hover)] active:bg-[var(--color-neutral-pressed)] text-[var(--color-text-main)]"
      )}
    >
      <div className="flex justify-between items-center mb-1 w-full min-w-0">
        <h3 className={cn(
          "font-medium text-sm truncate pr-2 flex-1",
          isSelected ? "text-[var(--color-accent)]" : "text-[var(--color-text-main)]"
        )}>
          {employee.name}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          {!hasBasicPay && employee.rateType === 'dynamic' && (
            <div className="group/tooltip relative">
              <AlertTriangle size={14} className="text-[var(--color-danger)]" />
            </div>
          )}
          {employee.isSupport && (
            <div className="group/tooltip relative">
              <Info size={14} className="text-[var(--color-text-muted)]" />
            </div>
          )}
          <span className="px-1.5 py-0.5 bg-card border border-[var(--color-border)] text-[10px] md:text-xs text-[var(--color-text-muted)] font-medium tracking-tight rounded-[var(--radius-interactive)] leading-none">
            {employee.totalOTHours}h
          </span>
        </div>
      </div>
      
      <div className="flex items-center justify-between w-full min-w-0">
        <p className={cn(
          "text-[11px] md:text-xs truncate w-full",
          isSelected ? "text-[var(--color-accent)] opacity-85" : "text-[var(--color-text-muted)]"
        )}>
          {employee.designation} <span className="mx-1 opacity-20">•</span> {employee.erp}
        </p>
      </div>
    </button>
  );
}
