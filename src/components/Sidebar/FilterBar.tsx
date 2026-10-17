import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { HolidayOption, NO_FILTERS, OvertimeFilter, SidebarFilters } from '../../store/useSidebarView';

interface FilterBarProps {
  filters: SidebarFilters;
  onChange: (next: SidebarFilters) => void;
  holidayOptions: HolidayOption[];
}

interface ChipOption {
  key: string;
  label: string;
  checked: boolean;
  /** The filters after this option is switched on or off. */
  set: (f: SidebarFilters, on: boolean) => SidebarFilters;
}

interface ChipDef {
  id: string;
  label: string;
  /** Text shown after the label while the chip is in use; null when it is not. */
  value: string | null;
  /** True when several options can be on at once (the menu then stays open). */
  multi: boolean;
  options: ChipOption[];
  clear: (f: SidebarFilters) => SidebarFilters;
}

const OVERTIME_OPTIONS: { key: OvertimeFilter; menu: string; short: string }[] = [
  { key: 'hours', menu: 'Has OT hours', short: 'Hours' },
  { key: 'amount', menu: 'Has OT amount', short: 'Amount' },
  { key: 'none', menu: 'No overtime', short: 'None' },
];

/** Switch one Overtime option on or off. "None" excludes the other two. */
function setOvertime(f: SidebarFilters, key: OvertimeFilter, on: boolean): SidebarFilters {
  const rest = f.overtime.filter((k) => k !== key && (key === 'none' ? false : k !== 'none'));
  return { ...f, overtime: on ? [...rest, key] : f.overtime.filter((k) => k !== key) };
}

/** A pick-one chip: choosing the chosen option again clears it. */
function pickOne<T extends string>(
  id: string,
  label: string,
  current: T,
  anyValue: T,
  choices: { value: T; menu: string; short: string }[],
  write: (f: SidebarFilters, v: T) => SidebarFilters,
): ChipDef {
  return {
    id,
    label,
    value: current === anyValue ? null : (choices.find((c) => c.value === current)?.short ?? null),
    multi: false,
    options: choices.map((c) => ({
      key: c.value,
      label: c.menu,
      checked: current === c.value,
      set: (f, on) => write(f, on ? c.value : anyValue),
    })),
    clear: (f) => write(f, anyValue),
  };
}

function buildChips(f: SidebarFilters, holidayOptions: HolidayOption[]): ChipDef[] {
  const chips: ChipDef[] = [
    {
      id: 'overtime',
      label: 'Overtime',
      value: f.overtime.length ? OVERTIME_OPTIONS.filter((o) => f.overtime.includes(o.key)).map((o) => o.short).join(', ') : null,
      multi: true,
      options: OVERTIME_OPTIONS.map((o) => ({
        key: o.key,
        label: o.menu,
        checked: f.overtime.includes(o.key),
        set: (x, on) => setOvertime(x, o.key, on),
      })),
      clear: (x) => ({ ...x, overtime: [] }),
    },
    pickOne('eligibility', 'Eligibility', f.eligibility, 'any', [
      { value: 'paid', menu: 'Non-exempt', short: 'Non-exempt' },
      { value: 'exempt', menu: 'Exempt', short: 'Exempt' },
    ], (x, v) => ({ ...x, eligibility: v })),
    pickOne('category', 'Category', f.category, 'any', [
      { value: 'official', menu: 'Official', short: 'Official' },
      { value: 'support', menu: 'Support', short: 'Support' },
    ], (x, v) => ({ ...x, category: v })),
    pickOne('pay', 'Pay', f.pay, 'any', [
      { value: 'dynamic', menu: 'Dynamic rate', short: 'Dynamic rate' },
      { value: 'fixed', menu: 'Fixed rate', short: 'Fixed rate' },
      { value: 'missing', menu: 'Missing basic pay', short: 'Missing basic pay' },
    ], (x, v) => ({ ...x, pay: v })),
  ];
  if (holidayOptions.length > 0) {
    // One holiday keeps its name and date; several are counted.
    const picked = f.holidays.map((k) => holidayOptions.find((o) => o.key === k)?.label.replace(' · ', ' ') ?? k);
    chips.push({
      id: 'holidays',
      label: 'Holiday availed',
      value: picked.length === 0 ? null : picked.length === 1 ? picked[0] : `${picked.length} holidays`,
      multi: true,
      options: holidayOptions.map((o) => ({
        key: o.key,
        label: o.label,
        checked: f.holidays.includes(o.key),
        set: (x, on) => ({ ...x, holidays: on ? [...x.holidays, o.key] : x.holidays.filter((k) => k !== o.key) }),
      })),
      clear: (x) => ({ ...x, holidays: [] }),
    });
  }
  return chips;
}

const chipShell = 'inline-flex shrink-0 items-center h-8 md:h-7 rounded-full border text-caption font-medium whitespace-nowrap transition-colors';
const chipIdle = 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50';
const chipOn = 'border-primary/30 bg-primary/10 text-primary';

function DimensionChip({ def, filters, onChange }: { def: ChipDef; filters: SidebarFilters; onChange: (f: SidebarFilters) => void }) {
  const active = def.value !== null;
  return (
    <span className={cn(chipShell, active ? chipOn : chipIdle)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn('inline-flex items-center gap-1 h-full pl-2.5 cursor-pointer whitespace-nowrap', active ? 'pr-1' : 'pr-2')}
          aria-label={active ? `${def.label}: ${def.value}. Change` : `Filter by ${def.label.toLowerCase()}`}
        >
          {active ? `${def.label}: ${def.value}` : def.label}
          <ChevronDown size={12} className="shrink-0 opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-[min(24rem,var(--available-height))] overflow-y-auto text-caption">
          {def.options.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.key}
              checked={o.checked}
              closeOnClick={!def.multi}
              onCheckedChange={(on) => onChange(o.set(filters, on))}
            >
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {active && (
        <button
          type="button"
          onClick={() => onChange(def.clear(filters))}
          aria-label={`Clear ${def.label} filter`}
          title={`Clear ${def.label}`}
          className="h-full pl-0.5 pr-2 inline-flex items-center cursor-pointer hover:text-foreground"
        >
          <X size={12} className="opacity-70" />
        </button>
      )}
    </span>
  );
}

/**
 * One chip per filter. A chip opens a small menu with its own options and shows its choice once
 * it is in use. The row never wraps: it scrolls sideways, with arrow buttons on desktop (there
 * is no touch there) and a fade on the right edge on phones.
 */
export function FilterBar({ filters, onChange, holidayOptions }: FilterBarProps) {
  const chips = buildChips(filters, holidayOptions);
  const anyActive = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

  const scroller = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const check = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);
  useEffect(() => {
    check();
    // The row grows and shrinks as chips gain a value or the sidebar is resized.
    const ro = new ResizeObserver(check);
    if (scroller.current) ro.observe(scroller.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [check]);

  const scrollBy = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: 'smooth' });

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <div
          ref={scroller}
          onScroll={check}
          // A mouse wheel over the row scrolls it sideways.
          onWheel={(e) => {
            if (scroller.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) scroller.current.scrollLeft += e.deltaY;
          }}
          className={cn('overflow-x-auto no-scrollbar', canRight && 'scroll-fade-x')}
        >
          <div ref={inner} className="flex w-max items-center gap-1.5 pr-1">
            {chips.map((c) => (
              <Fragment key={c.id}>
                <DimensionChip def={c} filters={filters} onChange={onChange} />
              </Fragment>
            ))}
            <button
              type="button"
              aria-pressed={filters.hasExcluded}
              onClick={() => onChange({ ...filters, hasExcluded: !filters.hasExcluded })}
              className={cn(chipShell, 'px-2.5 cursor-pointer', filters.hasExcluded ? chipOn : chipIdle)}
            >
              Has excluded days
            </button>
          </div>
        </div>

        {/* Desktop only: there is no touch to swipe with, so the hidden side gets an arrow. */}
        {canLeft && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Scroll filters left"
            onClick={() => scrollBy(-140)}
            className="hidden md:flex absolute left-0 inset-y-0 w-8 items-center justify-start bg-linear-to-r from-card from-55% to-transparent text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {canRight && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Scroll filters right"
            onClick={() => scrollBy(140)}
            className="hidden md:flex absolute right-0 inset-y-0 w-8 items-center justify-end bg-linear-to-l from-card from-55% to-transparent text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {anyActive && (
        <button
          type="button"
          onClick={() => onChange(NO_FILTERS)}
          className="shrink-0 text-caption font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
        >
          Clear
        </button>
      )}
    </div>
  );
}
