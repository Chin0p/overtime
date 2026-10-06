import React, { useEffect, useRef, useState } from 'react';
import { formatCurrency, cn, toTitleCase } from '../../lib/utils';
import { ProcessedEmployee } from '../../types';
import { CreditCard, Clock, Calendar, Zap, AlertTriangle, ChevronLeft, Activity, Lock } from 'lucide-react';

interface EmployeeHeaderProps {
  employee: ProcessedEmployee;
  monthLabel: string;
  onBack?: () => void;
}

const CATEGORY_LABEL = { support: 'Support', official: 'Official', exempt: 'Exempt' } as const;

/**
 * Renders as siblings inside DetailPanel's scroll content:
 *  - a pinned "title bar" (44px). On phones it is always visible (Back + name + month).
 *    As the full header scrolls out of view it condenses: the tags (category, rate, ERP)
 *    slide in next to the name and the month swaps for the total. On desktop the bar is
 *    hidden until then, so the page starts with just the full header.
 *  - the full header: 2 rows (name/badges/month, then ERP · designation) + stat cards.
 * Pinned elements use `sticky left-0 w-[100cqw]` so they stay put while the table scrolls sideways.
 */
export function EmployeeHeader({ employee, monthLabel, onBack }: EmployeeHeaderProps) {
  const isExempt = employee.category === 'exempt';
  const isDynamic = employee.rateType === 'dynamic';
  const hourlyRate = employee.hourlyRate ?? 0;
  const dayRate = employee.dayRate ?? 0;
  const missingPay = isDynamic && !isExempt && employee.basicPay <= 0;
  const name = toTitleCase(employee.name);

  // "Condensed" once the full header has scrolled up under the title bar.
  const headerRef = useRef<HTMLElement>(null);
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const root = el.closest('[data-scroll-root]');
    const io = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { root, rootMargin: '-44px 0px 0px 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const categoryBadge = (
    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
      {CATEGORY_LABEL[employee.category] ?? (employee.isSupport ? 'Support' : 'Official')}
    </span>
  );

  const rateBadge = isExempt ? null : (
    <span
      className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
      title={!isDynamic ? 'Fixed Rate Policy' : 'Dynamic Rate calculated from Basic Pay'}
    >
      {!isDynamic ? (
        <>
          <Lock size={12} className="shrink-0" />
          <span>Fixed</span>
        </>
      ) : (
        <>
          <Activity size={12} className="shrink-0 text-emerald-500" />
          <span className="text-foreground">Dynamic</span>
        </>
      )}
    </span>
  );

  const monthChip = monthLabel ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap">
      <Calendar size={12} className="text-primary/70 shrink-0" />
      <span className="font-medium">{monthLabel}</span>
    </span>
  ) : null;

  return (
    <>
      {/* Pinned title bar */}
      <div
        className={cn(
          'sticky top-0 left-0 z-30 w-[100cqw] h-11 md:-mb-11 bg-card border-b border-border',
          'flex items-center gap-1.5 pl-1.5 pr-3 transition-[opacity,transform,box-shadow] duration-200 ease-out',
          condensed
            ? 'opacity-100 translate-y-0 shadow-sm'
            : 'md:opacity-0 md:-translate-y-1 md:pointer-events-none',
        )}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden size-9 shrink-0 flex items-center justify-center rounded-[var(--radius-interactive)] hover:bg-muted text-foreground transition-colors"
            aria-label="Back to employee list"
            id="mobile-back-button"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h2 className="min-w-0 truncate text-[14px] font-bold text-foreground tracking-tight pl-1 md:pl-3">{name}</h2>

        {/* ERP · designation slides in next to the name once condensed (always visible on desktop, where the bar only appears when condensed) */}
        <div
          className={cn(
            'min-w-0 flex items-center gap-1.5 overflow-hidden whitespace-nowrap transition-all duration-200 ease-out',
            condensed ? 'max-w-[320px] opacity-100' : 'max-w-0 opacity-0 md:max-w-[320px] md:opacity-100',
          )}
        >
          <span className="text-muted-foreground/40 select-none hidden md:inline">|</span>
          <span className="font-mono text-[11px] font-semibold text-foreground shrink-0">{employee.erp}</span>
          <span className="hidden sm:inline text-muted-foreground/40 select-none">•</span>
          <span className="hidden sm:inline min-w-0 truncate text-[11px] font-medium text-muted-foreground">{employee.designation}</span>
        </div>

        {/* Right slot: month while expanded (phones), KPI chips once condensed. Chips drop out as the panel narrows. */}
        <div className="ml-auto pl-2 shrink-0 flex items-center gap-1.5">
          {condensed ? (
            <div className="animate-in fade-in duration-200 flex items-center gap-1.5">
              {isDynamic && !isExempt && (
                <BarStat label="Basic Pay" value={employee.basicPay > 0 ? formatCurrency(employee.basicPay) : 'Required'} warn={employee.basicPay <= 0} className="hidden @3xl:flex" />
              )}
              <BarStat label="Rate / Day" value={formatCurrency(dayRate)} className="hidden @2xl:flex" />
              <BarStat label="Rate / Hour" value={formatCurrency(hourlyRate)} className="hidden @xl:flex" />
              <BarStat label="Total OT" value={formatCurrency(employee.totalAmount)} highlight />
            </div>
          ) : (
            <span className="md:hidden">{monthChip}</span>
          )}
        </div>
      </div>

      <header ref={headerRef} className="sticky left-0 w-[100cqw] bg-card border-b border-border px-4 lg:px-8 py-3 lg:py-5 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6">
          <div className="flex flex-col min-w-0 flex-1 gap-1.5">
            {/* Row 1 (md+): name · category · rate ........ month */}
            <div className="hidden md:flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight break-words min-w-0">
                {name}
              </h1>
              {categoryBadge}
              {rateBadge}
            </div>

            {/* Row 2: ERP · designation (+ badges on mobile, where row 1 is the pinned bar) */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground min-w-0">
              <span className="font-mono font-medium text-foreground shrink-0">{employee.erp}</span>
              <span className="text-muted-foreground/40 select-none shrink-0">•</span>
              <span className="font-medium text-foreground min-w-0 break-words">{employee.designation}</span>
              <span className="md:hidden inline-flex items-center gap-2">
                {categoryBadge}
                {rateBadge}
              </span>
              {monthChip && (
                <>
                  <span className="hidden md:inline text-muted-foreground/40 select-none shrink-0">•</span>
                  <span className="hidden md:inline-flex">{monthChip}</span>
                </>
              )}
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-col lg:flex-row gap-2.5">
            {missingPay && (
              <div className="lg:hidden w-full p-2.5 bg-[var(--color-warning-light)] border border-[var(--color-warning)]/20 rounded-md flex items-center justify-center gap-1.5 text-[var(--color-warning)]">
                <AlertTriangle size={14} />
                <span className="text-xs font-semibold">Basic Pay is required for dynamic rate calculations</span>
              </div>
            )}

            {/* Stat cards: one horizontal strip on phones (Total first), a row on desktop */}
            <div
              className={cn(
                'flex gap-2 select-none overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible',
                missingPay && 'hidden lg:flex',
              )}
            >
              {isDynamic && !isExempt && (
                <StatCard
                  icon={<CreditCard size={13} />}
                  label="Basic Pay"
                  value={employee.basicPay > 0 ? formatCurrency(employee.basicPay) : (
                    <div className="flex items-center gap-1 text-[var(--color-warning)]">
                      <AlertTriangle size={12} />
                      <span className="text-xs font-bold">Required</span>
                    </div>
                  )}
                  color="bg-muted/50 text-foreground border-border"
                />
              )}
              <StatCard
                icon={<Zap size={13} />}
                label="Rate / Day"
                value={formatCurrency(dayRate)}
                color="bg-card text-foreground border-border"
              />
              <StatCard
                icon={<Clock size={13} />}
                label="Rate / Hour"
                value={formatCurrency(hourlyRate)}
                color="bg-card text-foreground border-border"
              />
              <StatCard
                icon={<CreditCard size={13} />}
                label="Total Overtime"
                value={formatCurrency(employee.totalAmount)}
                color="bg-primary/10 text-primary border-primary/20"
                highlight
                className="order-first lg:order-last"
              />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  highlight,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('shrink-0 min-w-[104px] px-3 py-2 rounded-lg border flex flex-col justify-center gap-1 shadow-xs', color, className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide opacity-75 leading-none whitespace-nowrap">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`font-mono tabular-nums leading-tight whitespace-nowrap ${highlight ? 'text-[13px] sm:text-sm font-extrabold text-primary' : 'text-[12px] sm:text-[13px] font-bold text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}

/** Compact label-over-value chip used in the condensed title bar. */
function BarStat({
  label,
  value,
  highlight,
  warn,
  className,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'h-8 px-2 rounded-md border flex-col justify-center gap-0.5 whitespace-nowrap flex',
        highlight ? 'bg-primary/10 border-primary/20' : 'bg-muted/50 border-border',
        className,
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wide leading-none text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-mono tabular-nums text-[11px] leading-none',
          highlight ? 'font-extrabold text-primary' : warn ? 'font-bold text-[var(--color-warning)]' : 'font-bold text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  );
}
