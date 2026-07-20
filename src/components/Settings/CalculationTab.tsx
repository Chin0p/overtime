import React from 'react';
import { OTSettings } from '../../types';
import { NumberInput } from '../ui/NumberInput';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../../lib/utils';

interface CalculationTabProps {
  policy: OTSettings['policy'];
  onChange: (policy: OTSettings['policy']) => void;
}

export function CalculationTab({ policy, onChange }: CalculationTabProps) {
  const updateOfficial = (updates: Partial<typeof policy.official>) => {
    onChange({ ...policy, official: { ...policy.official, ...updates } });
  };

  const updateSupport = (updates: Partial<typeof policy.support>) => {
    onChange({ ...policy, support: { ...policy.support, ...updates } });
  };

  return (
    <div className="space-y-10">
      <section>
        <h3 className="text-lg font-bold text-foreground mb-6">Global Rules</h3>
        <div className="space-y-6">
          <SettingRow
            title="Office timing"
            description="Standard daily working hours."
          >
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={policy.officeTiming.start}
                onChange={(e) => onChange({ ...policy, officeTiming: { ...policy.officeTiming, start: e.target.value } })}
                className="w-[110px]"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="time"
                value={policy.officeTiming.end}
                onChange={(e) => onChange({ ...policy, officeTiming: { ...policy.officeTiming, end: e.target.value } })}
                className="w-[110px]"
              />
            </div>
          </SettingRow>

          <SettingRow
            title="Min overtime threshold"
            description="Minimum overtime hours required to be eligible for payment."
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
          >
            <Switch
              checked={policy.lateArrivalToggle}
              onCheckedChange={(checked) => onChange({ ...policy, lateArrivalToggle: checked })}
            />
          </SettingRow>
          
          <SettingRow
            title="Rounding mode"
            description="How calculated hours and money values are rounded."
          >
            <div className="relative w-fit max-w-[200px]">
              <Select
                value={(policy as any).roundingMode || 'floor'}
                onValueChange={(val) => onChange({ ...policy, roundingMode: val as 'floor' | 'round' } as any)}
              >
                <SelectTrigger>
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
        <h3 className="text-lg font-bold text-foreground mb-6">Official staff</h3>
        <div className="space-y-6">
          <SettingRow
            title="Daily overtime cap"
            description="Maximum overtime hours allowed per day for official staff."
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
        <h3 className="text-lg font-bold text-foreground mb-6">Support staff</h3>
        <div className="space-y-6">
          <SettingRow
            title="Daily overtime cap"
            description="Maximum overtime hours allowed per day for support staff."
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

function SettingRow({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-row items-center justify-between gap-3 sm:gap-8">
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-base md:text-sm font-bold text-foreground truncate">{title}</h4>
        <p className="text-sm md:text-xs text-muted-foreground mt-1 leading-snug line-clamp-2 md:line-clamp-none">{description}</p>
      </div>
      <div className="shrink-0 flex items-center">
        {children}
      </div>
    </div>
  );
}
