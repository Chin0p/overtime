import { Fragment, useState, type ReactNode } from 'react';
import { ListFilter } from 'lucide-react';
import { cn } from '../../lib/utils';
import { buttonVariants, Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  HolidayOption,
  matchesFilters,
  NO_FILTERS,
  OvertimeFilter,
  SidebarFilters,
  WEEKEND_KEY,
} from '../../store/useSidebarView';
import { ProcessedEmployee } from '../../types';

interface FilterButtonProps {
  filters: SidebarFilters;
  onChange: (next: SidebarFilters) => void;
  holidayOptions: HolidayOption[];
  /** The employees the search already lets through; the Apply button counts how many of them a draft keeps. */
  candidates: ProcessedEmployee[];
}

const OVERTIME_OPTIONS: { key: OvertimeFilter; label: string }[] = [
  { key: 'hours', label: 'Has OT hours' },
  { key: 'amount', label: 'Has OT amount' },
  { key: 'none', label: 'No overtime' },
];

/** Switch one Overtime option on or off. "None" excludes the other two. */
function setOvertime(f: SidebarFilters, key: OvertimeFilter, on: boolean): SidebarFilters {
  const rest = f.overtime.filter((k) => k !== key && (key === 'none' ? false : k !== 'none'));
  return { ...f, overtime: on ? [...rest, key] : f.overtime.filter((k) => k !== key) };
}

/** How many filters are in use (the Overtime and Holiday groups count once each). */
function activeCount(f: SidebarFilters): number {
  return (
    (f.overtime.length > 0 ? 1 : 0) +
    (f.eligibility !== 'any' ? 1 : 0) +
    (f.category !== 'any' ? 1 : 0) +
    (f.pay !== 'any' ? 1 : 0) +
    (f.hasExcluded ? 1 : 0) +
    (f.holidays.length > 0 ? 1 : 0)
  );
}

/** Mutually exclusive choices side by side, each as wide as the others. */
function Strip<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-border bg-muted/50 p-0.5">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-10 md:h-8 min-w-0 flex-1 px-1.5 rounded-md text-caption font-medium truncate transition-colors cursor-pointer',
              selected ? 'bg-card text-foreground shadow-xs ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-label text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  // The Checkbox is a label itself, so the text is a separate tap target instead of a second, nested label.
  return (
    <div className="flex items-center gap-2.5 min-h-10 md:min-h-8 text-body select-none">
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span onClick={() => onChange(!checked)} className="flex-1 min-w-0 self-stretch flex items-center cursor-pointer">
        {label}
      </span>
    </div>
  );
}

/**
 * One Filter button that opens a panel. The panel edits a draft; the list only changes when Apply is
 * pressed, and closing the panel any other way throws the draft away.
 */
export function FilterButton({ filters, onChange, holidayOptions, candidates }: FilterButtonProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SidebarFilters>(filters);

  const count = activeCount(filters);
  const draftCount = open ? candidates.filter((e) => matchesFilters(e, draft)).length : 0;
  // Saturdays and Sundays first, then the named holidays by date.
  const holidays = [...holidayOptions].sort((a, b) => Number(b.key === WEEKEND_KEY) - Number(a.key === WEEKEND_KEY));

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(filters);
    setOpen(next);
  };
  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'relative size-11 md:size-8 p-0 shrink-0 justify-center cursor-pointer',
          count > 0 && 'text-primary border-primary',
        )}
        title="Filter employees"
        aria-label={count > 0 ? `Filter employees, ${count} active` : 'Filter employees'}
      >
        <ListFilter size={14} />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 font-semibold text-center tabular-nums">
            {count}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="text-body">
        <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">
          <Section title="Eligibility">
            <Strip
              label="Eligibility"
              value={draft.eligibility}
              options={[
                { value: 'any', label: 'Any' },
                { value: 'paid', label: 'Non-exempt' },
                { value: 'exempt', label: 'Exempt' },
              ]}
              onChange={(v) => setDraft({ ...draft, eligibility: v })}
            />
          </Section>

          <Section title="Category">
            <Strip
              label="Category"
              value={draft.category}
              options={[
                { value: 'any', label: 'Any' },
                { value: 'official', label: 'Official' },
                { value: 'support', label: 'Support' },
              ]}
              onChange={(v) => setDraft({ ...draft, category: v })}
            />
          </Section>

          <Section title="Pay">
            <Strip
              label="Pay"
              value={draft.pay}
              options={[
                { value: 'any', label: 'Any' },
                { value: 'dynamic', label: 'Dynamic' },
                { value: 'fixed', label: 'Fixed' },
                { value: 'missing', label: 'Missing', hint: 'Dynamic-rate employees with no basic pay set' },
              ]}
              onChange={(v) => setDraft({ ...draft, pay: v })}
            />
          </Section>

          <Section title="Overtime">
            <div>
              {OVERTIME_OPTIONS.map((o) => (
                <Fragment key={o.key}>
                  <CheckRow
                    label={o.label}
                    checked={draft.overtime.includes(o.key)}
                    onChange={(on) => setDraft(setOvertime(draft, o.key, on))}
                  />
                </Fragment>
              ))}
            </div>
          </Section>

          {holidays.length > 0 && (
            <Section title="Holiday availed">
              <div className="max-h-44 overflow-y-auto rounded-lg border border-border px-2.5">
                {holidays.map((o) => (
                  <Fragment key={o.key}>
                    <CheckRow
                      label={o.label}
                      checked={draft.holidays.includes(o.key)}
                      onChange={(on) =>
                        setDraft({
                          ...draft,
                          holidays: on ? [...draft.holidays, o.key] : draft.holidays.filter((k) => k !== o.key),
                        })
                      }
                    />
                  </Fragment>
                ))}
              </div>
            </Section>
          )}

          <div className="flex items-center justify-between gap-3 min-h-10 md:min-h-8 select-none">
            <span
              onClick={() => setDraft({ ...draft, hasExcluded: !draft.hasExcluded })}
              className="flex-1 self-stretch flex items-center text-body cursor-pointer"
            >
              Has excluded days
            </span>
            <Switch
              checked={draft.hasExcluded}
              onCheckedChange={(on) => setDraft({ ...draft, hasExcluded: on })}
              aria-label="Has excluded days"
            />
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-border p-3">
          <button
            type="button"
            onClick={() => setDraft(NO_FILTERS)}
            disabled={activeCount(draft) === 0}
            className="text-caption font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer disabled:opacity-50 disabled:no-underline disabled:cursor-default"
          >
            Clear all
          </button>
          <Button onClick={apply} className="h-10 md:h-8 px-4 cursor-pointer tabular-nums">
            Apply · {draftCount} {draftCount === 1 ? 'employee' : 'employees'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
