import React, { useEffect, useRef, useState } from 'react';
import { formatCurrency, cn, toTitleCase } from '../../lib/utils';
import { ProcessedEmployee } from '../../types';
import { Banknote, Coins, Clock, Zap, AlertTriangle, ChevronLeft, Activity, Lock } from 'lucide-react';

interface EmployeeHeaderProps {
  employee: ProcessedEmployee;
  onBack?: () => void;
}

const CATEGORY_LABEL = { support: 'Support', official: 'Official', exempt: 'Exempt' } as const;

/**
 * Renders as siblings inside DetailPanel's scroll content:
 *  - a pinned "title bar" (44px) showing only "Name • Designation". On phones it is always
 *    visible (Back + name) and the designation slides in once the full header scrolls away.
 *    On desktop the bar stays invisible until then, so the page starts with just the full header.
 *  - the full header: name/badges, ERP · designation, then stat cards.
 * The month/year lives in the navbar subtitle, not here.
 * Pinned elements use `sticky left-0 w-[100cqw]` so they stay put while the table scrolls sideways,
 * and share the table's centred max width + side padding so everything lines up.
 */
export function EmployeeHeader({ employee, onBack }: EmployeeHeaderProps) {
  const isExempt = employee.category === 'exempt';
  const isDynamic = employee.rateType === 'dynamic';
  const hourlyRate = employee.hourlyRate ?? 0;
  const dayRate = employee.dayRate ?? 0;
  const missingPay = isDynamic && !isExempt && employee.basicPay <= 0;
  const name = toTitleCase(employee.name);

  // "Condensed" once the full header has (almost) scrolled up under the title bar.
  // Driven by the scroll event rather than an IntersectionObserver: the observer's callback
  // lands a couple of frames late, which on a fast scroll let table rows show through the
  // still-transparent bar. The background flips on the very frame the scroll happens.
  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const el = headerRef.current;
    const root = el?.closest('[data-scroll-root]') as HTMLElement | null;
    if (!el || !root) return;
    const update = () => {
      const lead = (barRef.current?.offsetHeight ?? 44) + 24;
      setCondensed(el.getBoundingClientRect().bottom - root.getBoundingClientRect().top < lead);
    };
    update();
    root.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      root.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const categoryBadge = (
    <span className="shrink-0 px-2 py-0.5 rounded text-caption font-semibold bg-primary/10 text-primary border border-primary/20">
      {CATEGORY_LABEL[employee.category] ?? (employee.isSupport ? 'Support' : 'Official')}
    </span>
  );

  const rateBadge = isExempt ? null : (
    <span
      className="shrink-0 inline-flex items-center gap-1 text-caption font-medium text-muted-foreground"
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

  return (
    <>
      {/* Pinned title bar. Background/border switch instantly (no transition) so rows can
          never show through it; only the text fades. */}
      <div
        ref={barRef}
        className={cn(
          'sticky top-0 left-0 z-30 w-[100cqw] h-[var(--header-sticky)] md:-mb-[var(--header-sticky)] border-b',
          condensed
            ? 'bg-card border-border shadow-sm'
            : 'bg-card border-border md:bg-transparent md:border-transparent md:pointer-events-none',
        )}
      >
        <div
          className={cn(
            'h-full max-w-6xl mx-auto flex items-center gap-1.5 pl-1.5 pr-3 md:px-3 @3xl:px-6',
            'transition-[opacity,transform] duration-[var(--duration-smooth)] ease-out',
            !condensed && 'md:opacity-0 md:-translate-y-1',
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
          <h2 className="min-w-0 truncate text-title text-foreground tracking-tight pl-1 md:pl-0">{name}</h2>

          {/* "• designation" slides in next to the name once condensed. */}
          <div
            className={cn(
              'min-w-0 flex items-center gap-1.5 overflow-hidden whitespace-nowrap',
              'transition-[max-width,opacity] duration-[var(--duration-smooth)] ease-out',
              condensed ? 'max-w-[320px] opacity-100' : 'max-w-0 opacity-0',
            )}
          >
            <span className="text-muted-foreground/40 select-none">•</span>
            <span className="min-w-0 truncate text-caption font-medium text-muted-foreground">{employee.designation}</span>
          </div>
        </div>
      </div>

      <header ref={headerRef} className="sticky left-0 w-[100cqw] bg-card border-b border-border py-3 lg:py-5 shadow-xs">
        <div className="max-w-6xl mx-auto px-3 @3xl:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6">
          <div className="flex flex-col min-w-0 flex-1 gap-1.5">
            {/* Row 1 (md+): name · category · rate */}
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
                'flex gap-2 select-none overflow-x-auto no-scrollbar -mx-3 px-3 @3xl:-mx-6 @3xl:px-6 lg:mx-0 lg:px-0 lg:overflow-visible',
                missingPay && 'hidden lg:flex',
              )}
            >
              {isDynamic && !isExempt && (
                <StatCard
                  icon={<Banknote size={13} />}
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
                icon={<Coins size={13} />}
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
      <div className="flex items-center gap-1.5 text-caption font-semibold tracking-wide opacity-75 leading-none whitespace-nowrap">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`font-mono tabular-nums leading-tight whitespace-nowrap ${highlight ? 'text-[13px] sm:text-body font-extrabold text-primary' : 'text-label sm:text-body font-bold text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}
