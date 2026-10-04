import * as React from 'react';
import { cn } from '../../lib/utils';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  size?: 'sm' | 'md';
}

export function Checkbox({ className, size = 'md', ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        'relative inline-flex items-center justify-center cursor-pointer select-none shrink-0',
        // enlarge the tap target without changing the visual size
        'before:absolute before:-inset-3 before:content-[""] md:before:-inset-1.5',
        size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4',
        className,
      )}
    >
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        className={cn(
          'absolute inset-0 rounded border transition-all',
          'border-[var(--color-border)] bg-card',
          'peer-checked:bg-primary peer-checked:border-primary',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-focus-ring)] peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background',
          'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
        )}
      />
      <svg
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          'relative z-10 pointer-events-none text-primary-foreground',
          'opacity-0 peer-checked:opacity-100 transition-opacity',
          size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3',
        )}
      >
        <polyline points="2,6 5,9 10,3" />
      </svg>
    </label>
  );
}