import { Notice } from '../ui/notice';
import { OTSettings } from '../../types';
import { NumberInput } from '../ui/NumberInput';
import { Switch } from '../ui/switch';
import { SettingRow } from './SettingRow';
import { SettingsSection } from './SettingsSection';
import { RoundingPreview, ThresholdPreview } from './CalculationPreviews';
import { SegmentedControl } from './employeeShared';

interface CalculationTabProps {
  policy: OTSettings['policy'];
  onChange: (policy: OTSettings['policy']) => void;
}

export function CalculationTab({ policy, onChange }: CalculationTabProps) {
  const issues: string[] = [];
  if (policy.minThresholdMinutes >= policy.official.dailyOTCap * 60) {
    issues.push(`Min threshold (${policy.minThresholdMinutes} min) ≥ dynamic daily cap (${policy.official.dailyOTCap}h) — no dynamic OT will ever be paid.`);
  }
  if (policy.minThresholdMinutes >= policy.support.dailyOTCap * 60) {
    issues.push(`Min threshold (${policy.minThresholdMinutes} min) ≥ fixed daily cap (${policy.support.dailyOTCap}h) — no fixed-rate OT will ever be paid.`);
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
    <div className="space-y-6 max-w-3xl mx-auto">
      {issues.length > 0 && (
        <Notice tone="warning" title="Policy issues">
          <ul className="list-disc list-inside space-y-0.5 pl-1">
            {issues.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </Notice>
      )}

      <SettingsSection title="Global rules">
          <SettingRow
            title="Shift duration"
            description="Length of the working day. Overtime starts this long after the office start."
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
            title="Grace period"
            description="The file's shift start includes this grace. With 08:10 and 10 min, the office starts at 08:00 and lateness counts after 08:10."
          >
            <NumberInput
              value={policy.lateGraceMinutes ?? 10}
              onChange={(val) => onChange({ ...policy, lateGraceMinutes: val })}
              suffix="min"
              min={0}
              max={120}
            />
          </SettingRow>

          <SettingRow
            title="Min overtime threshold"
            description="Minimum overtime, in minutes, required to be eligible for payment."
            preview={<ThresholdPreview policy={policy} />}
          >
            <NumberInput
              value={policy.minThresholdMinutes}
              onChange={(val) => onChange({ ...policy, minThresholdMinutes: val })}
              suffix="min"
              min={0}
              max={600}
            />
          </SettingRow>

          <SettingRow
            title="Late arrival adjustment"
            description="Deduct late arrival time from the total overtime hours."
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
            <SegmentedControl
              label="Rounding mode"
              value={policy.roundingMode || 'round'}
              options={[{ value: 'floor', label: 'Floor' }, { value: 'round', label: 'Round' }]}
              onChange={(val) => onChange({ ...policy, roundingMode: val })}
            />
          </SettingRow>
      </SettingsSection>

      <SettingsSection title="Dynamic rate">
          <SettingRow
            title="Daily overtime cap"
            description="Most overtime hours that count per day for dynamic-rate staff."
          >
            <NumberInput
              value={policy.official.dailyOTCap}
              onChange={(val) => updateOfficial({ dailyOTCap: val })}
              suffix="hrs"
            />
          </SettingRow>

          <SettingRow
            title="Max daily amount"
            description="Most that can be paid per day to dynamic-rate staff."
          >
            <NumberInput
              value={policy.official.maxDailyAmount}
              onChange={(val) => updateOfficial({ maxDailyAmount: val })}
              suffix="PKR"
            />
          </SettingRow>

          <SettingRow
            title="Monthly day cap"
            description="Most working days per month that can earn overtime. Fixed-rate designations can opt out."
          >
            <NumberInput
              value={policy.official.monthlyDayCap}
              onChange={(val) => updateOfficial({ monthlyDayCap: val })}
              suffix="days"
            />
          </SettingRow>
      </SettingsSection>

      <SettingsSection title="Fixed rate">
          <SettingRow
            title="Daily overtime cap"
            description="Most overtime hours that count per day for fixed-rate staff."
          >
            <NumberInput
              value={policy.support.dailyOTCap}
              onChange={(val) => updateSupport({ dailyOTCap: val })}
              suffix="hrs"
            />
          </SettingRow>

          <SettingRow
            title="Hourly rate"
            description="Hourly overtime rate for fixed-rate staff."
          >
            <NumberInput
              value={policy.support.hourlyRate}
              onChange={(val) => updateSupport({ hourlyRate: val })}
              suffix="PKR"
            />
          </SettingRow>

          <SettingRow
            title="Holiday rate"
            description="Daily rate for fixed-rate staff who work on a holiday."
          >
            <NumberInput
              value={policy.support.holidayRate}
              onChange={(val) => updateSupport({ holidayRate: val })}
              suffix="PKR"
            />
          </SettingRow>
      </SettingsSection>
    </div>
  );
}
