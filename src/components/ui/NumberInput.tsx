import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Input } from './input';

interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  suffix?: string;
  className?: string;
  min?: number;
  max?: number;
  maxDigits?: number;
  disabled?: boolean;
}

export function NumberInput({
  value,
  onChange,
  suffix,
  className,
  min = 0,
  max,
  maxDigits,
  disabled,
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState<string>(value === 0 ? '' : String(value));

  // Sync external value changes (e.g. bulk apply) into local display
  useEffect(() => {
    const externalNum = value;
    const localNum = localValue === '' ? 0 : Number(localValue);
    if (externalNum !== localNum) {
      setLocalValue(externalNum === 0 ? '' : String(externalNum));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, '');
    if (maxDigits) raw = raw.slice(0, maxDigits);
    setLocalValue(raw);
    onChange(raw === '' ? 0 : Number(raw));
  };

  const handleBlur = () => {
    let num = localValue === '' ? 0 : Number(localValue);
    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);
    onChange(num);
    setLocalValue(num === 0 ? '' : String(num));
  };

  return (
    <div
      className={cn(
        'relative flex items-center group w-28',
        disabled && 'opacity-60',
        className,
      )}
    >
      <Input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="0"
        className={cn('w-full text-right h-8', suffix ? 'pr-12' : '')}
      />
      {suffix && (
        <span className="absolute right-3 text-xs font-semibold text-muted-foreground pointer-events-none uppercase select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}