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

const BADGE_STYLES = {
  Support: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Official: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  Exempt: 'bg-muted text-muted-foreground border-border',
  Fixed: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Dynamic: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Capped: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
} as const;

export function Badge({ label }: { label: keyof typeof BADGE_STYLES }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded-md border text-micro font-semibold leading-none whitespace-nowrap',
        BADGE_STYLES[label],
      )}
    >
      {label}
    </span>
  );
}

export function InfoBadges({ info }: { info: EmployeeInfo }) {
  const cat = CATEGORY_LABEL[info.category] as 'Support' | 'Official' | 'Exempt';
  return (
    <>
      <Badge label={cat} />
      {info.category !== 'exempt' && <Badge label={info.rate === 'fixed' ? 'Fixed' : 'Dynamic'} />}
      {info.category !== 'exempt' && info.rate === 'fixed' && !info.capExempt && <Badge label="Capped" />}
    </>
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
