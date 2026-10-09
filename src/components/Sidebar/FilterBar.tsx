import { Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { HolidayOption, SidebarFilters, DEFAULT_FILTERS, NO_FILTERS, shortDate } from '../../store/useSidebarView';

interface FilterBarProps {
  filters: SidebarFilters;
  onChange: (next: SidebarFilters) => void;
  holidayOptions: HolidayOption[];
}

interface Chip {
  id: string;
  label: string;
  remove: (f: SidebarFilters) => SidebarFilters;
}

/** One chip per active filter, in the order they read best. */
function activeChips(f: SidebarFilters, holidayOptions: HolidayOption[]): Chip[] {
  const chips: Chip[] = [];
  if (f.hasOT) chips.push({ id: 'hasOT', label: 'Has OT hours', remove: (x) => ({ ...x, hasOT: false }) });
  if (f.eligibility !== 'any')
    chips.push({
      id: 'eligibility',
      label: f.eligibility === 'paid' ? 'Non-exempt' : 'Exempt',
      remove: (x) => ({ ...x, eligibility: 'any' }),
    });
  if (f.category !== 'any')
    chips.push({ id: 'category', label: f.category === 'official' ? 'Official' : 'Support', remove: (x) => ({ ...x, category: 'any' }) });
  if (f.rateType !== 'any')
    chips.push({ id: 'rateType', label: f.rateType === 'dynamic' ? 'Dynamic rate' : 'Fixed rate', remove: (x) => ({ ...x, rateType: 'any' }) });
  if (f.missingPay) chips.push({ id: 'missingPay', label: 'Missing basic pay', remove: (x) => ({ ...x, missingPay: false }) });
  if (f.hasExcluded) chips.push({ id: 'hasExcluded', label: 'Has excluded days', remove: (x) => ({ ...x, hasExcluded: false }) });
  if (f.holidays.length > 0) {
    const names = f.holidays.map((k) => holidayOptions.find((o) => o.key === k)?.label.split(' · ')[0] ?? shortDate(k));
    chips.push({
      id: 'holidays',
      label: names.length <= 2 ? `Availed: ${names.join(', ')}` : `Availed: ${names.length} holidays`,
      remove: (x) => ({ ...x, holidays: [] }),
    });
  }
  return chips;
}

const chipBase =
  'inline-flex items-center gap-1 h-6 rounded-full border px-2 text-caption font-medium whitespace-nowrap cursor-pointer transition-colors';

/** Active filters as removable chips, plus a "+ Filter" menu for adding more. */
export function FilterBar({ filters, onChange, holidayOptions }: FilterBarProps) {
  const chips = activeChips(filters, holidayOptions);
  const toggleHoliday = (key: string, on: boolean) =>
    onChange({ ...filters, holidays: on ? [...filters.holidays, key] : filters.holidays.filter((k) => k !== key) });
  const same = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.remove(filters))}
          title={`Remove “${c.label}”`}
          aria-label={`Remove filter ${c.label}`}
          className={cn(chipBase, 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15')}
        >
          {c.label}
          <X size={11} className="shrink-0 opacity-70" />
        </button>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(chipBase, 'border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted/50')}
          aria-label="Add filter"
        >
          <Plus size={12} className="shrink-0" />
          Filter
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60 max-h-[22rem] overflow-y-auto text-ui">
          <DropdownMenuLabel className="text-caption">Overtime</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={filters.hasOT} onCheckedChange={(v) => onChange({ ...filters, hasOT: v })}>
            Has OT hours
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={filters.hasExcluded} onCheckedChange={(v) => onChange({ ...filters, hasExcluded: v })}>
            Has excluded days
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-caption">Eligibility</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={filters.eligibility === 'paid'} onCheckedChange={(v) => onChange({ ...filters, eligibility: v ? 'paid' : 'any' })}>
            Non-exempt
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={filters.eligibility === 'exempt'} onCheckedChange={(v) => onChange({ ...filters, eligibility: v ? 'exempt' : 'any' })}>
            Exempt
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-caption">Category</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={filters.category === 'official'} onCheckedChange={(v) => onChange({ ...filters, category: v ? 'official' : 'any' })}>
            Official
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={filters.category === 'support'} onCheckedChange={(v) => onChange({ ...filters, category: v ? 'support' : 'any' })}>
            Support
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-caption">Pay</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={filters.rateType === 'dynamic'} onCheckedChange={(v) => onChange({ ...filters, rateType: v ? 'dynamic' : 'any' })}>
            Dynamic rate
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={filters.rateType === 'fixed'} onCheckedChange={(v) => onChange({ ...filters, rateType: v ? 'fixed' : 'any' })}>
            Fixed rate
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={filters.missingPay} onCheckedChange={(v) => onChange({ ...filters, missingPay: v })}>
            Missing basic pay
          </DropdownMenuCheckboxItem>

          {holidayOptions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-caption">Holiday availed (attended on…)</DropdownMenuLabel>
              {holidayOptions.map((o) => (
                <DropdownMenuCheckboxItem key={o.key} checked={filters.holidays.includes(o.key)} onCheckedChange={(v) => toggleHoliday(o.key, v)}>
                  {o.label}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {chips.length > 1 && (
        <button
          type="button"
          onClick={() => onChange(NO_FILTERS)}
          className="text-caption font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
        >
          Clear
        </button>
      )}
      {/* After clearing everything the list shows all employees; offer the default view back. */}
      {chips.length === 0 && !same && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-caption font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
        >
          Reset
        </button>
      )}
    </div>
  );
}
