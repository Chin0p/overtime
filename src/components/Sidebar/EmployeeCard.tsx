import React from 'react';
import { cn, toTitleCase, formatAmount } from '../../lib/utils';
import { ProcessedEmployee } from '../../types';
import { AlertTriangle, Info } from 'lucide-react';

interface EmployeeCardProps {
  employee: ProcessedEmployee;
  isSelected: boolean;
  onClick: () => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, isSelected, onClick }) => {
  const hasBasicPay = employee.basicPay > 0;
  const missingPay = !hasBasicPay && employee.rateType === 'dynamic';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-[var(--radius-interactive)] transition-[background-color,box-shadow,color] duration-[var(--duration-fast)] flex flex-col group relative shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-focus-ring)]',
        isSelected
          ? 'bg-[var(--color-selection)] text-[var(--color-selection-fg)] shadow-[inset_3px_0_0_0_var(--color-accent)]'
          : 'hover:bg-[var(--color-neutral-hover)] active:bg-[var(--color-neutral-pressed)] text-foreground',
      )}
    >
      <div className="flex justify-between items-center mb-0.5 w-full min-w-0">
        <h3
          className={cn(
            'font-semibold text-label truncate pr-2 flex-1',
            isSelected ? 'text-[var(--color-selection-fg)]' : 'text-foreground',
          )}
        >
          {toTitleCase(employee.name)}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          {missingPay && (
            <span title="Missing basic pay" aria-label="Missing basic pay">
              <AlertTriangle size={13} className="text-[var(--color-danger)]" />
            </span>
          )}
          {employee.isSupport && (
            <span title="Support staff" aria-label="Support staff">
              <Info size={13} className="text-muted-foreground" />
            </span>
          )}
          <span
            className={cn(
              'px-1.5 py-0.5 border text-caption font-medium tracking-tight rounded-[var(--radius-interactive)] leading-none',
              isSelected
                ? 'bg-background/60 border-[var(--color-accent)]/30 text-[var(--color-selection-fg)]'
                : 'bg-card border-border text-muted-foreground',
            )}
          >
            {employee.totalOTHours}h
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between w-full min-w-0 gap-2">
        <p
          className={cn(
            'text-caption truncate min-w-0',
            isSelected ? 'text-[var(--color-selection-fg)] opacity-85' : 'text-muted-foreground',
          )}
        >
          {employee.designation} <span className="mx-0.5 opacity-40">&bull;</span> {employee.erp}
        </p>
        {employee.totalAmount > 0 && (
          <span
            className={cn(
              'text-caption font-mono tabular-nums shrink-0',
              isSelected ? 'text-[var(--color-selection-fg)] font-semibold' : 'text-muted-foreground',
            )}
          >
            {formatAmount(employee.totalAmount)}
          </span>
        )}
      </div>
    </button>
  );
};
