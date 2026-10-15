import React, { memo } from 'react';
import { cn, toTitleCase, formatAmount } from '../../lib/utils';
import { ProcessedEmployee } from '../../types';
import { AlertTriangle } from 'lucide-react';

interface EmployeeCardProps {
  employee: ProcessedEmployee;
  isSelected: boolean;
  /** Stable callback taking the ERP, so a memoized card is not re-rendered by unrelated list updates. */
  onSelect: (erp: string) => void;
}

export const EmployeeCard = memo(function EmployeeCard({ employee, isSelected, onSelect }: EmployeeCardProps) {
  const isExempt = employee.category === 'exempt';
  const hasBasicPay = employee.basicPay > 0;
  const missingPay = !isExempt && !hasBasicPay && employee.rateType === 'dynamic';

  return (
    <button
      onClick={() => onSelect(employee.erp)}
      className={cn(
        'w-full text-left p-3 rounded-[var(--radius-interactive)] transition-[background-color,box-shadow,color] duration-[var(--duration-fast)] flex flex-col group relative shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-focus-ring)]',
        isSelected
          ? 'bg-[var(--color-selection)] shadow-[inset_3px_0_0_0_var(--primary)]'
          : 'hover:bg-[var(--color-neutral-hover)] active:bg-[var(--color-neutral-pressed)] text-foreground',
      )}
    >
      <div className="flex justify-between items-center mb-0.5 w-full min-w-0">
        <h3 className="font-semibold text-label truncate pr-2 flex-1 text-foreground">
          {toTitleCase(employee.name)}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          {missingPay && (
            <span title="Missing basic pay" aria-label="Missing basic pay">
              <AlertTriangle size={13} className="text-[var(--destructive)]" />
            </span>
          )}
          {(isExempt || employee.totalOTHours > 0) && (
            <span className="px-1.5 py-0.5 border border-border bg-card text-muted-foreground text-caption font-medium tracking-tight rounded-[var(--radius-interactive)] leading-none">
              {isExempt ? 'Exempt' : `${employee.totalOTHours}h`}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between w-full min-w-0 gap-2">
        <p className="text-caption truncate min-w-0 text-muted-foreground">
          {employee.designation} · {employee.erp}
        </p>
        {employee.totalAmount > 0 && (
          <span className="text-caption font-mono tabular-nums shrink-0 text-muted-foreground">
            {formatAmount(employee.totalAmount)}
          </span>
        )}
      </div>
    </button>
  );
});
