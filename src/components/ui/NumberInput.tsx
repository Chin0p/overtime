import React from 'react';
import { cn } from '../../lib/utils';
import { Input } from './input';

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
    <div className={cn("relative flex items-center group w-28", className)}>
      <Input
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
        className={cn("w-full text-right h-[38px]", suffix ? "pr-12" : "")}
      />
      {suffix && (
        <span className="absolute right-3 text-xs font-semibold text-muted-foreground pointer-events-none uppercase select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
