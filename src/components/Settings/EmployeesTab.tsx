import { useState, useMemo, Fragment } from 'react';
import { Search, Layers, X, ChevronDown } from 'lucide-react';
import { EmployeeRow, EmployeeCategory } from '../../types';
import { NumberInput } from '../ui/NumberInput';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Button, buttonVariants } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { resolveRateType, resolveCapExempt } from '../../parser/parserUtils';
import { toTitleCase, cn } from '../../lib/utils';

interface EmployeesTabProps {
  basicPay: Record<string, number>;
  employees: EmployeeRow[];
  designationCategories: Record<string, EmployeeCategory>;
  designationRateTypes: Record<string, 'fixed' | 'dynamic'>;
  designationCapExempt: Record<string, boolean>;
  onBasicPayChange: (basicPay: Record<string, number>) => void;
  onDesignationChange: (
    categories: Record<string, EmployeeCategory>,
    rateTypes: Record<string, 'fixed' | 'dynamic'>,
    capExempt: Record<string, boolean>,
  ) => void;
}

const BADGE_STYLES = {
  Support: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Official: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  Exempt: 'bg-muted text-muted-foreground border-border',
  Fixed: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Dynamic: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  Capped: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
} as const;

function Badge({ label }: { label: keyof typeof BADGE_STYLES }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-semibold leading-none whitespace-nowrap',
        BADGE_STYLES[label],
      )}
    >
      {label}
    </span>
  );
}

export function EmployeesTab({
  basicPay,
  employees,
  designationCategories,
  designationRateTypes,
  designationCapExempt,
  onBasicPayChange,
  onDesignationChange,
}: EmployeesTabProps) {
  const [search, setSearch] = useState('');
  const [groupByDesignation, setGroupByDesignation] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPay, setBulkPay] = useState(0);

  const effectiveCategory = (designation: string): EmployeeCategory =>
    designationCategories[designation] ??
    (designation.toLowerCase().includes('officer') ? 'exempt' : 'official');

  const effectiveRate = (designation: string): 'fixed' | 'dynamic' =>
    resolveRateType(designation, { designationRateTypes });

  const effectiveCap = (designation: string, rate: 'fixed' | 'dynamic'): boolean =>
    resolveCapExempt(designation, rate, { designationCapExempt });

  const displayEmployees = useMemo(() => {
    let list = [...employees];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (emp) =>
          emp.name.toLowerCase().includes(q) ||
          emp.erp.includes(q) ||
          (emp.designation || '').toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      if (groupByDesignation) {
        const dc = (a.designation || '').localeCompare(b.designation || '');
        if (dc !== 0) return dc;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
  }, [employees, search, groupByDesignation]);

  const visibleErps = useMemo(() => displayEmployees.map((e) => e.erp), [displayEmployees]);
  const allVisibleSelected =
    visibleErps.length > 0 && visibleErps.every((erp) => selected.has(erp));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleErps.forEach((erp) => next.delete(erp));
      else visibleErps.forEach((erp) => next.add(erp));
      return next;
    });
  };

  const toggleSelect = (erp: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(erp) ? next.delete(erp) : next.add(erp);
      return next;
    });
  };

  const selectedDesignations = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => {
      if (selected.has(e.erp) && e.designation) s.add(e.designation);
    });
    return Array.from(s);
  }, [employees, selected]);

  const updateBasicPay = (erp: string, value: number) => {
    onBasicPayChange({ ...basicPay, [erp]: value });
  };

  const bulkSetPay = () => {
    const next = { ...basicPay };
    selected.forEach((erp) => {
      next[erp] = bulkPay;
    });
    onBasicPayChange(next);
  };

  const bulkSetCategory = (c: EmployeeCategory) => {
    const nextCat = { ...designationCategories };
    const nextRate = { ...designationRateTypes };
    const nextCap = { ...designationCapExempt };
    selectedDesignations.forEach((d) => {
      nextCat[d] = c;
      if (c === 'exempt') {
        delete nextRate[d];
        delete nextCap[d];
      }
    });
    onDesignationChange(nextCat, nextRate, nextCap);
  };

  const bulkSetRate = (rt: 'fixed' | 'dynamic') => {
    const nextRate = { ...designationRateTypes };
    const nextCap = { ...designationCapExempt };
    selectedDesignations.forEach((d) => {
      if (effectiveCategory(d) === 'exempt') return;
      nextRate[d] = rt;
      if (rt !== 'fixed') delete nextCap[d];
    });
    onDesignationChange(designationCategories, nextRate, nextCap);
  };

  const bulkSetCap = (exempt: boolean) => {
    const nextCap = { ...designationCapExempt };
    selectedDesignations.forEach((d) => {
      if (effectiveCategory(d) === 'exempt') return;
      if (effectiveRate(d) !== 'fixed') return;
      nextCap[d] = exempt;
    });
    onDesignationChange(designationCategories, designationRateTypes, nextCap);
  };

  const designationCounts = useMemo(() => {
    const m: Record<string, number> = {};
    employees.forEach((e) => {
      if (e.designation) m[e.designation] = (m[e.designation] || 0) + 1;
    });
    return m;
  }, [employees]);

  const renderBadges = (emp: EmployeeRow) => {
    const cat = effectiveCategory(emp.designation || '');
    if (cat === 'exempt') return [<Badge key="cat" label="Exempt" />];

    const rate = effectiveRate(emp.designation || '');
    const badges: React.ReactNode[] = [
      <Badge key="rate" label={rate === 'fixed' ? 'Fixed' : 'Dynamic'} />,
    ];
    if (rate === 'fixed') {
      const capExempt = effectiveCap(emp.designation || '', rate);
      if (!capExempt) badges.push(<Badge key="cap" label="Capped" />);
    }
    return badges;
  };

  return (
    <div className="space-y-3 w-full min-w-0">
      {/* Header */}
      <div>
        <h3 className="text-[12px] font-bold text-foreground">Employees &amp; Pay</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Set basic pay per employee, and manage designation rules via bulk actions.
        </p>
      </div>

      {/* Toolbar — fixed widths to prevent modal reflow */}
      <div className="flex items-center gap-2 w-full min-w-0">
        <div className="relative flex-1 min-w-0 max-w-full">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            size={13}
          />
          <Input
            type="text"
            placeholder="Search name, ERP, or designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-[12px] h-8 w-full"
          />
        </div>
        <Button
          type="button"
          variant={groupByDesignation ? 'default' : 'outline'}
          size="sm"
          onClick={() => setGroupByDesignation((v) => !v)}
          className="text-[11px] h-8 px-2.5 gap-1.5 shrink-0"
          title="Group by designation"
        >
          <Layers size={13} />
          <span className="hidden sm:inline">Group</span>
        </Button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="rounded-lg border border-primary/20 bg-[var(--color-neutral-active)] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--color-accent)]">
              {selected.size} selected
              {selectedDesignations.length > 0 &&
                ` · ${selectedDesignations.length} designation${
                  selectedDesignations.length === 1 ? '' : 's'
                }`}
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-card/50"
              title="Clear selection"
            >
              <X size={12} />
            </button>
          </div>

          {/* Basic pay */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground min-w-[70px]">
              Basic Pay
            </span>
            <NumberInput
              value={bulkPay}
              onChange={setBulkPay}
              suffix="PKR"
              maxDigits={5}
              className="w-32"
            />
            <Button
              type="button"
              size="sm"
              onClick={bulkSetPay}
              className="text-[11px] h-7 px-2.5"
            >
              Apply to {selected.size}
            </Button>
          </div>

          {/* Designation rules */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground min-w-[70px]">
              Rules
            </span>

            {/* Category dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'gap-1.5 text-[11px] h-7 px-2.5',
                )}
              >
                <span>Category</span>
                <ChevronDown size={12} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuLabel>Set category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => bulkSetCategory('support')}>
                  Support
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkSetCategory('official')}>
                  Official
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkSetCategory('exempt')}>
                  Exempt
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Rate dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'gap-1.5 text-[11px] h-7 px-2.5',
                )}
              >
                <span>Rate</span>
                <ChevronDown size={12} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuLabel>Set rate type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => bulkSetRate('fixed')}>Fixed</DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkSetRate('dynamic')}>Dynamic</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Cap checkbox */}
            <label className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-card cursor-pointer select-none">
              <Checkbox
                size="sm"
                checked={false}
                onChange={(e) => bulkSetCap(e.target.checked)}
              />
              <span className="text-[11px] font-medium whitespace-nowrap">
                Exempt from cap
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Empty state */}
      {displayEmployees.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-[11px] border-2 border-dashed border-border rounded-lg select-none">
          {employees.length === 0
            ? 'Upload a file to see the employee list'
            : 'No employees match your search'}
        </div>
      ) : (
        <>
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[auto_1fr_auto] gap-3 px-2 py-1.5 border-b border-border text-[10px] font-semibold uppercase tracking-wide text-muted-foreground items-center">
            <Checkbox
              size="sm"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              title="Select all"
            />
            <div>Employee</div>
            <div className="text-right pr-1">Basic Pay</div>
          </div>

          <div className="space-y-2 md:space-y-1">
            {displayEmployees.map((emp, idx) => {
              const prev = displayEmployees[idx - 1];
              const showGroupHeader =
                groupByDesignation && (!prev || prev.designation !== emp.designation);

              const isSelected = selected.has(emp.erp);
              const cat = effectiveCategory(emp.designation || '');
              const isExempt = cat === 'exempt';
              const rate = effectiveRate(emp.designation || '');
              const isFixed = rate === 'fixed';
              const currentVal =
                basicPay[emp.erp] !== undefined ? basicPay[emp.erp] : emp.basicPay || 0;
              const badges = renderBadges(emp);

              // Input visibility rules:
              // - Exempt → never show
              // - Fixed  → mobile: hide, desktop: show disabled
              // - Dynamic → show everywhere
              const inputWrapperClass = cn(
                'shrink-0',
                isExempt && 'hidden',
                isFixed && !isExempt && 'hidden md:block',
              );

              return (
                <Fragment key={emp.erp}>
                  {showGroupHeader && (
                    <div className="flex items-center gap-2 pt-3 pb-1 first:pt-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {emp.designation}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[10px] text-muted-foreground">
                        {designationCounts[emp.designation] || 0}{' '}
                        {(designationCounts[emp.designation] || 0) === 1 ? 'person' : 'people'}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      'rounded-lg border transition-colors p-2.5',
                      'flex items-center gap-3',
                      isSelected
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-muted/10 hover:bg-muted/20',
                      isExempt && 'opacity-60',
                    )}
                  >
                    <Checkbox
                      size="sm"
                      checked={isSelected}
                      onChange={() => toggleSelect(emp.erp)}
                    />

                    {/* Info column: row1 = name + badges, row2 = erp · designation */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] md:text-[12px] font-semibold text-foreground truncate">
                          {toTitleCase(emp.name)}
                        </span>
                        {badges}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                        {emp.erp}
                        <span className="mx-1 opacity-50">·</span>
                        <span className="font-sans not-italic">{emp.designation}</span>
                      </div>
                    </div>

                    {/* Input column */}
                    <div className={inputWrapperClass}>
                      <NumberInput
                        value={currentVal}
                        onChange={(v) => updateBasicPay(emp.erp, v)}
                        suffix="PKR"
                        maxDigits={5}
                        className="w-28 md:w-28"
                        disabled={isFixed || isExempt}
                      />
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}