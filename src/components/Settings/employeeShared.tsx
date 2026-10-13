import { EmployeeRow, EmployeeCategory } from '../../types';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';
import { cn } from '../../lib/utils';

export type Rate = 'fixed' | 'dynamic';
/** One person's overtime eligibility: follow the designation, or override it just for them. */
export type Eligibility = 'default' | 'exempt' | 'included';
export type GroupBy = 'none' | 'designation' | 'pay' | 'category';
export type SortBy = 'name' | 'erp' | 'designation' | 'pay';

/** An employee plus everything the Employees tab derives about them. */
export interface EmployeeInfo {
  emp: EmployeeRow;
  /** What actually applies to this person (personal override included). */
  category: EmployeeCategory;
  /** What the designation says, ignoring any personal override. */
  designationCategory: EmployeeCategory;
  /** Days excluded from this person's pay (Settings). */
  excludedCount: number;
  /** All holidays and weekends are left out of this person's pay. */
  excludesHolidays: boolean;
  /** This person's own override, if any. */
  eligibility?: 'exempt' | 'included';
  rate: Rate;
  capExempt: boolean;
  pay: number;
}

export interface Filters {
  categories: EmployeeCategory[];
  rates: Rate[];
  missingPay: boolean;
}

export const EMPTY_FILTERS: Filters = { categories: [], rates: [], missingPay: false };

export const filterCount = (f: Filters) => f.categories.length + f.rates.length + (f.missingPay ? 1 : 0);

/** Designation-level rule changes (rules are keyed by designation, not by person). */
export interface RuleChange {
  category?: EmployeeCategory;
  rate?: Rate;
  capExempt?: boolean;
}

export interface InfoGroup {
  key: string;
  label: string;
  items: EmployeeInfo[];
}

export const CATEGORY_LABEL: Record<EmployeeCategory, string> = {
  support: 'Support',
  official: 'Official',
  exempt: 'Exempt',
};

/** A row of mutually exclusive choices (two or three), shown side by side instead of in a dropdown. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled,
  label,
}: {
  /** `null` = the selection disagrees (bulk edit): nothing is highlighted. */
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-lg border border-border bg-muted/50 p-0.5', disabled && 'opacity-50')}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-10 md:h-7 min-w-[4.5rem] px-3 rounded-md text-ui font-medium transition-colors',
              selected ? 'bg-card text-foreground shadow-xs ring-1 ring-border' : 'text-muted-foreground',
              !disabled && !selected && 'hover:text-foreground cursor-pointer',
              disabled && 'cursor-not-allowed',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Fixed-width (w-28 by default, h-8) select used for every rule field so they line up. */
export function RuleSelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
  mixedLabel = 'Mixed',
  widthClass = 'w-28',
}: {
  /** Wider selects for longer option labels. */
  widthClass?: string;
  /** `null` = the selection disagrees (bulk edit). */
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  mixedLabel?: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <div className={widthClass}>
      <Select value={value} onValueChange={(v) => v && onChange(v as T)} disabled={disabled}>
        <SelectTrigger className="w-full">
          <span className={cn('truncate', !current && 'text-muted-foreground')}>
            {current ? current.label : mixedLabel}
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
