import React from 'react';
import { OTSettings } from '../../types';
import {
  computeOTHours,
  lateAdjustmentHours,
  netOvertimeHours,
} from '../../engine/otCalculator';
import { round } from '../../lib/math';
import { formatAmount, parseHHMM, cn } from '../../lib/utils';

/**
 * Live examples shown under settings. Every number here comes from the same functions the engine
 * uses (computeOTHours, lateAdjustmentHours, netOvertimeHours, round), so an example can never
 * disagree with what the dashboard calculates.
 */

type Mode = 'floor' | 'round';
type Policy = OTSettings['policy'];

/** Sample basic pay that lands on a half rupee (÷176 = 312.50) so Floor and Round visibly differ. */
const SAMPLE_PAY = 55000;

/** 1.6 → "1h 36m", 2 → "2h", 0.5 → "30m". */
function hm(hours: number): string {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const paidText = (hours: number) => (hours > 0 ? `pays ${hm(hours)}` : 'not paid');

function clock(decimal: number): string {
  const totalMin = Math.round(decimal * 60);
  return `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
}

export function Preview({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-caption text-muted-foreground space-y-1">
      <div className="text-micro font-bold uppercase tracking-wider text-muted-foreground/70">Example</div>
      {children}
    </div>
  );
}

const Strong = ({ children }: { children: React.ReactNode }) => (
  <span className="font-semibold text-foreground tabular-nums">{children}</span>
);

export function RoundingPreview({ policy }: { policy: Policy }) {
  const mode: Mode = policy.roundingMode === 'floor' ? 'floor' : 'round';
  const samples = [80 / 60, 96 / 60, 170 / 60]; // 1h 20m, 1h 36m, 2h 50m
  const exact = SAMPLE_PAY / 176;
  const cols: { id: Mode; label: string }[] = [
    { id: 'floor', label: 'Floor' },
    { id: 'round', label: 'Round' },
  ];
  return (
    <Preview>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-0.5 items-baseline tabular-nums">
        <span className="text-micro uppercase tracking-wider">Stays past office end</span>
        {cols.map((c) => (
          <span key={c.id} className={cn('text-micro uppercase tracking-wider text-right', mode === c.id && 'text-primary font-bold')}>
            {c.label}
          </span>
        ))}
        {samples.map((s) => (
          <React.Fragment key={s}>
            <span>{hm(s)}</span>
            {cols.map((c) => {
              const paid = computeOTHours(s, policy.minThreshold, c.id);
              return (
                <span key={c.id} className={cn('text-right', mode === c.id ? 'text-foreground font-semibold' : 'opacity-60')}>
                  {paid > 0 ? hm(paid) : 'none'}
                </span>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <p>
        Money is rounded the same way: PKR {formatAmount(SAMPLE_PAY)} ÷ 176 = {exact.toFixed(2)}/hr →{' '}
        <Strong>{round(exact, mode)}</Strong> under {mode === 'floor' ? 'Floor' : 'Round'}
        {' '}({round(exact, mode === 'floor' ? 'round' : 'floor')} under {mode === 'floor' ? 'Round' : 'Floor'}).
      </p>
    </Preview>
  );
}

export function ThresholdPreview({ policy }: { policy: Policy }) {
  const mode: Mode = policy.roundingMode === 'floor' ? 'floor' : 'round';
  const t = policy.minThreshold;
  const tMin = Math.round(t * 60);
  const minutes = Array.from(new Set([tMin - 1, tMin, tMin + 36].filter((m) => m > 0))).sort((a, b) => a - b);
  return (
    <Preview>
      {t <= 0 && <p>No minimum: any overtime counts.</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
        {minutes.map((m) => {
          const paid = computeOTHours(m / 60, t, mode);
          return (
            <span key={m} className="tabular-nums">
              {hm(m / 60)} → <Strong>{paid > 0 ? hm(paid) : 'not paid'}</Strong>
            </span>
          );
        })}
      </div>
    </Preview>
  );
}

export function LateArrivalPreview({ policy }: { policy: Policy }) {
  const mode: Mode = policy.roundingMode === 'floor' ? 'floor' : 'round';
  const start = parseHHMM(policy.officeTiming?.start || '08:00');
  const end = parseHHMM(policy.officeTiming?.end || '16:00');
  const gross = 2;
  const examples = [30 / 60, 100 / 60].map((lateH) => {
    const adj = lateAdjustmentHours(lateH, mode);
    const net = netOvertimeHours(gross, adj, policy.lateArrivalToggle);
    return { lateH, adj, net, paid: computeOTHours(net, policy.minThreshold, mode) };
  });
  return (
    <Preview>
      {!policy.lateArrivalToggle && (
        <p>
          Off: arriving late never reduces overtime. Staying {hm(gross)} after {clock(end)} →{' '}
          <Strong>{paidText(computeOTHours(gross, policy.minThreshold, mode))}</Strong>.
        </p>
      )}
      {policy.lateArrivalToggle &&
        examples.map((e) => (
          <p key={e.lateH}>
            In at {clock(start + e.lateH)} ({hm(e.lateH)} late), out {hm(gross)} after {clock(end)}: lateness counts as{' '}
            <Strong>{hm(e.adj)}</Strong> → {hm(gross)} − {hm(e.adj)} = {hm(e.net)} → <Strong>{paidText(e.paid)}</Strong>
          </p>
        ))}
    </Preview>
  );
}

function capExamples(cap: number, minThreshold: number, mode: Mode) {
  const over = cap + 2;
  const paidOver = Math.min(computeOTHours(over, minThreshold, mode), cap);
  const under = cap - 1;
  const paidUnder = under > 0 ? Math.min(computeOTHours(under, minThreshold, mode), cap) : 0;
  return { over, paidOver, under, paidUnder };
}

export function DailyCapPreview({ policy, fixed }: { policy: Policy; fixed?: boolean }) {
  const mode: Mode = policy.roundingMode === 'floor' ? 'floor' : 'round';
  const cap = fixed ? policy.support.dailyOTCap : policy.official.dailyOTCap;
  if (!(cap > 0)) return null;
  const { over, paidOver, under, paidUnder } = capExamples(cap, policy.minThreshold, mode);
  return (
    <Preview>
      <p>
        Stays {hm(over)} after office end → <Strong>{paidText(paidOver)}</Strong> (capped at {hm(cap)}).
      </p>
      {under > 0 && (
        <p>
          Stays {hm(under)} → <Strong>{paidText(paidUnder)}</Strong>.
        </p>
      )}
    </Preview>
  );
}

export function MaxAmountPreview({ policy }: { policy: Policy }) {
  const mode: Mode = policy.roundingMode === 'floor' ? 'floor' : 'round';
  const { dailyOTCap: cap, maxDailyAmount: max } = policy.official;
  if (!(cap > 0)) return null;
  const hourly = round(SAMPLE_PAY / 176, mode);
  const raw = cap * hourly;
  const pays = round(Math.min(raw, max), mode);
  return (
    <Preview>
      <p>
        PKR {formatAmount(SAMPLE_PAY)} basic, {hm(cap)} of overtime: {cap} × {hourly} = {formatAmount(raw)} →{' '}
        <Strong>PKR {formatAmount(pays)}</Strong>
        {raw > max ? ` (capped at ${formatAmount(max)})` : ' (under the cap)'}.
      </p>
    </Preview>
  );
}

export function MonthlyCapPreview({ policy }: { policy: Policy }) {
  const cap = policy.official.monthlyDayCap;
  if (!(cap > 0)) return null;
  const extra = 3;
  return (
    <Preview>
      <p>
        With overtime on {cap + extra} days in a month, the <Strong>{cap} days with the most overtime hours</Strong> are
        paid and the other {extra} are not. Holidays never count towards the limit.
      </p>
    </Preview>
  );
}

export function FixedRatePreview({ policy }: { policy: Policy }) {
  const mode: Mode = policy.roundingMode === 'floor' ? 'floor' : 'round';
  const { dailyOTCap: cap, hourlyRate, maxDailyAmount: max } = policy.support;
  if (!(cap > 0)) return null;
  const raw = cap * hourlyRate;
  const pays = round(Math.min(raw, max), mode);
  return (
    <Preview>
      <p>
        {hm(cap)} of overtime: {cap} × {hourlyRate} = {formatAmount(raw)} → <Strong>PKR {formatAmount(pays)}</Strong>
        {raw > max ? ` (capped at ${formatAmount(max)})` : ''}.
      </p>
    </Preview>
  );
}

export function HolidayRatePreview({ policy }: { policy: Policy }) {
  return (
    <Preview>
      <p>
        Support staff who attend on a holiday or weekend get <Strong>PKR {formatAmount(policy.support.holidayRate)}</Strong>,
        whatever the hours.
      </p>
    </Preview>
  );
}
