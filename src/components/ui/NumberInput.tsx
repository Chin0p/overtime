import React from 'react';
import { cn } from '../../lib/utils';

interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  suffix?: string;
  className?: string;
  min?: number;
  max?: number;
}

export function NumberInput({ value, onChange, suffix, className, min = 0, max }: NumberInputProps) {
  return (
    <div className={cn("relative flex items-center group w-24", className)}>
      <input
        type="number"
        min={min}
        max={max}
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
          }
        }}
        value={value}
        onChange={(e) => {
          const val = e.target.value === '' ? 0 : Number(e.target.value);
          onChange(val);
        }}
        onBlur={(e) => {
          let val = Number(e.target.value);
          if (min !== undefined) val = Math.max(min, val);
          if (max !== undefined) val = Math.min(max, val);
          onChange(val);
        }}
        className="w-full px-3 py-1.5 bg-background border border-white/10 rounded-lg text-sm text-white text-right focus:ring-2 focus:ring-white/20 focus:border-white/30 outline-none transition-all pr-12"
      />
      {suffix && (
        <span className="absolute right-3 text-[10px] font-bold text-muted-dim pointer-events-none uppercase select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
