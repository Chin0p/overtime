import { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmployeeRow, EmployeeCategory } from '../../types';
import { cn } from '../../lib/utils';
import { isFixedRateRole, isDriver } from '../../parser/parserUtils';

interface DesignationsTabProps {
  categories: Record<string, EmployeeCategory>;
  rateTypes: Record<string, 'fixed' | 'dynamic'>;
  capExempt: Record<string, boolean>;
  employees: EmployeeRow[];
  onChange: (
    categories: Record<string, EmployeeCategory>,
    rateTypes: Record<string, 'fixed' | 'dynamic'>,
    capExempt: Record<string, boolean>,
  ) => void;
}

const CATEGORY_OPTIONS: { value: EmployeeCategory; label: string }[] = [
  { value: 'support', label: 'Support' },
  { value: 'official', label: 'Official' },
  { value: 'exempt', label: 'Exempt' },
];

export function DesignationsTab({
  categories,
  rateTypes,
  capExempt,
  employees,
  onChange,
}: DesignationsTabProps) {
  const employeeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => {
      const d = e.designation || '(none)';
      counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  }, [employees]);

  const uniqueDesignations = useMemo(
    () => Array.from(new Set(employees.map(e => e.designation))).filter(Boolean).sort(),
    [employees],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Resolve effective config for a designation (defaults folded in).
  const resolveCategory = (d: string): EmployeeCategory =>
    categories[d] ?? (d.toLowerCase().includes('officer') ? 'exempt' : 'official');
  const resolveRate = (d: string): 'fixed' | 'dynamic' =>
    rateTypes[d] ?? (isFixedRateRole(d) ? 'fixed' : 'dynamic');
  const resolveCap = (d: string): boolean => {
    const rt = resolveRate(d);
    if (rt !== 'fixed') return false;
    return capExempt[d] ?? isDriver(d);
  };

  const allExempt =
    uniqueDesignations.length > 0 &&
    uniqueDesignations.every(d => resolveCategory(d) === 'exempt');

  const update = (
    nextCategories: Record<string, EmployeeCategory>,
    nextRateTypes: Record<string, 'fixed' | 'dynamic'>,
    nextCapExempt: Record<string, boolean>,
  ) => onChange(nextCategories, nextRateTypes, nextCapExempt);

  const setCategory = (d: string, c: EmployeeCategory) => {
    const next = { ...categories, [d]: c };
    // Exempt designations don't carry rate-type or cap config.
    const nextRate = { ...rateTypes };
    const nextCap = { ...capExempt };
    if (c === 'exempt') {
      delete nextRate[d];
      delete nextCap[d];
    }
    update(next, nextRate, nextCap);
  };

  const setRate = (d: string, rt: 'fixed' | 'dynamic') => {
    const next = { ...rateTypes, [d]: rt };
    const nextCap = { ...capExempt };
    if (rt !== 'fixed') delete nextCap[d];
    update(categories, next, nextCap);
  };

  const setCap = (d: string, exempt: boolean) => {
    update(categories, rateTypes, { ...capExempt, [d]: exempt });
  };

  const toggleSelectAll = () => {
    setSelected(prev =>
      prev.size === uniqueDesignations.length ? new Set() : new Set(uniqueDesignations),
    );
  };

  const toggleSelect = (d: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };

  const bulkCategory = (c: EmployeeCategory) => {
    const next = { ...categories };
    const nextRate = { ...rateTypes };
    const nextCap = { ...capExempt };
    selected.forEach(d => {
      next[d] = c;
      if (c === 'exempt') {
        delete nextRate[d];
        delete nextCap[d];
      }
    });
    update(next, nextRate, nextCap);
  };

  const bulkRate = (rt: 'fixed' | 'dynamic') => {
    const nextRate = { ...rateTypes };
    const nextCap = { ...capExempt };
    selected.forEach(d => {
      // Skip exempt rows — no rate type.
      if (resolveCategory(d) === 'exempt') return;
      nextRate[d] = rt;
      if (rt !== 'fixed') delete nextCap[d];
    });
    update(categories, nextRate, nextCap);
  };

  const bulkCap = (exempt: boolean) => {
    const nextCap = { ...capExempt };
    selected.forEach(d => {
      if (resolveCategory(d) === 'exempt') return;
      if (resolveRate(d) !== 'fixed') return;
      nextCap[d] = exempt;
    });
    update(categories, rateTypes, nextCap);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-[12px] font-bold text-foreground">Designations</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Category, rate type, and monthly-cap exemption for each designation. Cap
          exemption only applies to fixed-rate designations.
        </p>
      </div>

      {allExempt && (
        <div className="p-2.5 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-light)] text-[11px] flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 text-[var(--color-warning)] mt-0.5" />
          <span className="text-[var(--color-warning)]">
            <strong>All designations are exempt.</strong> No overtime will be paid to anyone.
          </span>
        </div>
      )}

      {uniqueDesignations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-[11px] border-2 border-dashed border-border rounded-lg">
          No designations available. Please upload a file first.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap p-2 bg-muted/20 border border-border rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-3.5 h-3.5 rounded border-border focus:ring-ring"
                checked={selected.size === uniqueDesignations.length && uniqueDesignations.length > 0}
                onChange={toggleSelectAll}
              />
              <span className="text-[11px] font-medium">
                {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
              </span>
            </label>

            {selected.size > 0 && (
              <>
                <div className="w-px h-4 bg-border" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Set:
                </span>
                {CATEGORY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => bulkCategory(opt.value)}
                    className="px-2 py-0.5 rounded text-[10px] font-medium border border-border bg-card hover:bg-muted"
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="w-px h-4 bg-border" />
                <button
                  type="button"
                  onClick={() => bulkRate('fixed')}
                  className="px-2 py-0.5 rounded text-[10px] font-medium border border-border bg-card hover:bg-muted"
                >
                  Fixed
                </button>
                <button
                  type="button"
                  onClick={() => bulkRate('dynamic')}
                  className="px-2 py-0.5 rounded text-[10px] font-medium border border-border bg-card hover:bg-muted"
                >
                  Dynamic
                </button>
                <div className="w-px h-4 bg-border" />
                <button
                  type="button"
                  onClick={() => bulkCap(true)}
                  className="px-2 py-0.5 rounded text-[10px] font-medium border border-border bg-card hover:bg-muted"
                >
                  Cap: Exempt
                </button>
                <button
                  type="button"
                  onClick={() => bulkCap(false)}
                  className="px-2 py-0.5 rounded text-[10px] font-medium border border-border bg-card hover:bg-muted"
                >
                  Cap: Apply
                </button>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            {uniqueDesignations.map(designation => {
              const cat = resolveCategory(designation);
              const rt = resolveRate(designation);
              const cx = resolveCap(designation);
              const isExempt = cat === 'exempt';
              const isFixed = rt === 'fixed';
              const isSelected = selected.has(designation);
              const count = employeeCounts[designation] || 0;

              return (
                <div
                  key={designation}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors',
                    isSelected ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/10',
                  )}
                >
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-border focus:ring-ring cursor-pointer shrink-0"
                    checked={isSelected}
                    onChange={() => toggleSelect(designation)}
                  />

                  <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                    <span className="text-[12px] font-semibold text-foreground truncate">
                      {designation}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
                      ({count})
                    </span>
                  </div>

                  {/* Category segmented control */}
                  <div className="flex shrink-0 rounded-md border border-border overflow-hidden">
                    {CATEGORY_OPTIONS.map((opt, i) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCategory(designation, opt.value)}
                        className={cn(
                          'px-2 py-0.5 text-[10px] font-medium transition-colors',
                          i > 0 && 'border-l border-border',
                          cat === opt.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Rate segmented control — hidden for exempt */}
                  {!isExempt && (
                    <div className="flex shrink-0 rounded-md border border-border overflow-hidden">
                      {(['fixed', 'dynamic'] as const).map((rtOpt, i) => (
                        <button
                          key={rtOpt}
                          type="button"
                          onClick={() => setRate(designation, rtOpt)}
                          className={cn(
                            'px-2 py-0.5 text-[10px] font-medium transition-colors',
                            i > 0 && 'border-l border-border',
                            rt === rtOpt
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          {rtOpt === 'fixed' ? 'Fixed' : 'Dynamic'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cap exemption — only for fixed */}
                  {!isExempt && isFixed && (
                    <label
                      className="flex items-center gap-1 shrink-0 cursor-pointer select-none"
                      title="Exempt from monthly day cap"
                    >
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-border focus:ring-ring"
                        checked={cx}
                        onChange={(e) => setCap(designation, e.target.checked)}
                      />
                      <span className="text-[10px] text-foreground whitespace-nowrap">No cap</span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
