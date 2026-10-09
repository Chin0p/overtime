import React from 'react';
import { OTSettings } from '../../types';
import { computeOTHours } from '../../engine/otCalculator';

/**
 * One-line hints under a setting. Numbers come from the engine's own computeOTHours, so a hint
 * can never disagree with what the dashboard calculates.
 */

type Policy = OTSettings['policy'];

/** 1.6 → "1h 36m", 2 → "2h", 0.5 → "30m". */
function hm(hours: number): string {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-caption text-muted-foreground tabular-nums">{children}</p>
);
const Strong = ({ children }: { children: React.ReactNode }) => (
  <span className="font-semibold text-foreground">{children}</span>
);

const paid = (hours: number, policy: Policy, mode: 'floor' | 'round') => {
  const p = computeOTHours(hours, policy.minThreshold, mode);
  return p > 0 ? hm(p) : 'not paid';
};

export function RoundingPreview({ policy }: { policy: Policy }) {
  const mode = policy.roundingMode === 'floor' ? 'floor' : 'round';
  const label = mode === 'floor' ? 'Floor' : 'Round';
  // 1h 36m is where the two modes part ways (1h vs 2h).
  return (
    <Hint>
      {label}: 1h 20m → <Strong>{paid(80 / 60, policy, mode)}</Strong>, 1h 36m → <Strong>{paid(96 / 60, policy, mode)}</Strong>,
      2h 50m → <Strong>{paid(170 / 60, policy, mode)}</Strong>
    </Hint>
  );
}

export function ThresholdPreview({ policy }: { policy: Policy }) {
  const mode = policy.roundingMode === 'floor' ? 'floor' : 'round';
  const t = policy.minThreshold;
  const tMin = Math.round(t * 60);
  if (t <= 0) return <Hint>No minimum: any overtime counts.</Hint>;
  return (
    <Hint>
      {hm((tMin - 1) / 60)} → <Strong>{paid((tMin - 1) / 60, policy, mode)}</Strong>, {hm(tMin / 60)} →{' '}
      <Strong>{paid(tMin / 60, policy, mode)}</Strong>
    </Hint>
  );
}
