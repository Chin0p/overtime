import { AlertTriangle } from 'lucide-react';
import { OTSettings } from '../../types';
import { NumberInput } from '../ui/NumberInput';
import { Switch } from '../ui/switch';
import { SettingRow } from './SettingRow';
import {
  RoundingPreview,
  ThresholdPreview,
  LateArrivalPreview,
  DailyCapPreview,
  MaxAmountPreview,
  MonthlyCapPreview,
  FixedRatePreview,
  HolidayRatePreview,
} from './CalculationPreviews';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';

interface CalculationTabProps {
  policy: OTSettings['policy'];
  onChange: (policy: OTSettings['policy']) => void;
}

export function CalculationTab({ policy, onChange }: CalculationTabProps) {
  const issues: string[] = [];
  if (policy.minThreshold >= policy.official.dailyOTCap) {
    issues.push(`Min threshold (${policy.minThreshold}h) ≥ dynamic daily cap (${policy.official.dailyOTCap}h) — no dynamic OT will ever be paid.`);
  }
  if (policy.minThreshold >= policy.support.dailyOTCap) {
    issues.push(`Min threshold (${policy.minThreshold}h) ≥ fixed daily cap (${policy.support.dailyOTCap}h) — no fixed-rate OT will ever be paid.`);
  }
  if (policy.official.dailyOTCap <= 0) issues.push('Dynamic daily cap is zero.');
  if (policy.support.dailyOTCap <= 0) issues.push('Fixed daily cap is zero.');
  if (policy.official.maxDailyAmount <= 0) issues.push('Dynamic daily max amount is zero.');
  if (policy.support.maxDailyAmount <= 0) issues.push('Fixed daily max amount is zero.');
  if (policy.official.monthlyDayCap <= 0) issues.push('Monthly day cap is zero — no OT will be paid.');
  if ((policy.shiftDurationHours ?? 8) <= 0) issues.push('Shift duration is zero.');

  const updateOfficial = (updates: Partial<typeof policy.official>) => {
    onChange({ ...policy, official: { ...policy.official, ...updates } });
  };

  const updateSupport = (updates: Partial<typeof policy.support>) => {
    onChange({ ...policy, support: { ...policy.support, ...updates } });
  };

  return (
    <div className="space-y-6">
      {issues.length > 0 && (
        <div className="p-2.5 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-light)] text-caption space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--color-warning)]">
            <AlertTriangle size={13} />
            <span>Policy issues</span>
          </div>
          <ul className="list-disc list-inside text-[var(--color-warning)]/90 space-y-0.5 pl-1">
            {issues.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      <section>
        <h3 className="text-body font-bold text-foreground mb-4">Global Rules</h3>
        <div className="space-y-4">
          <SettingRow
            title="Shift duration"
            description="Length of a standard working day. Only used when a day has no office end time of its own."
          >
            <NumberInput
              value={policy.shiftDurationHours ?? 8}
              onChange={(val) => onChange({ ...policy, shiftDurationHours: val })}
              suffix="hrs"
              min={1}
              max={24}
            />
          </SettingRow>

          <SettingRow
            title="Min overtime threshold"
            description="Minimum overtime hours required to be eligible for payment."
            preview={<ThresholdPreview policy={policy} />}
          >
            <NumberInput
              value={policy.minThreshold}
              onChange={(val) => onChange({ ...policy, minThreshold: val })}
              suffix="hrs"
            />
          </SettingRow>

          <SettingRow
            title="Late arrival adjustment"
            description="Deduct late arrival time from the total overtime hours."
            preview={<LateArrivalPreview policy={policy} />}
          >
            <Switch
              checked={policy.lateArrivalToggle}
              onCheckedChange={(checked) => onChange({ ...policy, lateArrivalToggle: checked })}
            />
          </SettingRow>
          
          <SettingRow
            title="Rounding mode"
            description="How calculated hours and money values are rounded."
            preview={<RoundingPreview policy={policy} />}
          >
            <div className="w-28">
              <Select
                value={policy.roundingMode || 'round'}
                onValueChange={(val) => onChange({ ...policy, roundingMode: val as 'floor' | 'round' })}
              >
                <SelectTrigger className="w-full">
                  <span className="truncate">{policy.roundingMode === 'round' ? 'Round' : 'Floor'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="floor">Floor</SelectItem>
                  <SelectItem value="round">Round</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SettingRow>
        </div>
      </section>

      <div className="h-px bg-border" />

      <section>
        <h3 className="text-body font-bold text-foreground mb-4">Dynamic rate</h3>
        <div className="space-y-4">
          <SettingRow
            title="Daily overtime cap"
            description="Maximum overtime hours allowed per day for official staff."
            preview={<DailyCapPreview policy={policy} />}
          >
            <NumberInput
              value={policy.official.dailyOTCap}
              onChange={(val) => updateOfficial({ dailyOTCap: val })}
              suffix="hrs"
            />
          </SettingRow>

          <SettingRow
            title="Max daily amount"
            description="Maximum amount payable per day for official staff."
            preview={<MaxAmountPreview policy={policy} />}
          >
            <NumberInput
              value={policy.official.maxDailyAmount}
              onChange={(val) => updateOfficial({ maxDailyAmount: val })}
              suffix="PKR"
            />
          </SettingRow>

          <SettingRow
            title="Monthly day cap"
            description="Maximum number of working days for which Overtime is payable in a month."
            preview={<MonthlyCapPreview policy={policy} />}
          >
            <NumberInput
              value={policy.official.monthlyDayCap}
              onChange={(val) => updateOfficial({ monthlyDayCap: val })}
              suffix="days"
            />
          </SettingRow>
        </div>
      </section>

      <div className="h-px bg-border" />

      <section>
        <h3 className="text-body font-bold text-foreground mb-4">Fixed rate</h3>
        <div className="space-y-4">
          <SettingRow
            title="Daily overtime cap"
            description="Maximum overtime hours allowed per day for support staff."
            preview={<DailyCapPreview policy={policy} fixed />}
          >
            <NumberInput
              value={policy.support.dailyOTCap}
              onChange={(val) => updateSupport({ dailyOTCap: val })}
              suffix="hrs"
            />
          </SettingRow>

          <SettingRow
            title="Hourly rate"
            description="Fixed hourly rate for support staff overtime."
            preview={<FixedRatePreview policy={policy} />}
          >
            <NumberInput
              value={policy.support.hourlyRate}
              onChange={(val) => updateSupport({ hourlyRate: val })}
              suffix="PKR"
            />
          </SettingRow>

          <SettingRow
            title="Holiday rate"
            description="Fixed daily rate for support staff working on holidays."
            preview={<HolidayRatePreview policy={policy} />}
          >
            <NumberInput
              value={policy.support.holidayRate}
              onChange={(val) => updateSupport({ holidayRate: val })}
              suffix="PKR"
            />
          </SettingRow>
        </div>
      </section>
    </div>
  );
}
