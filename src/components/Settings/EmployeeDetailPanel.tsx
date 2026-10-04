import { useState, type ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { SettingRow } from './SettingRow';
import { cn, toTitleCase } from '../../lib/utils';
import { EmployeeCategory } from '../../types';
import { EmployeeInfo, InfoBadges, Rate, RuleChange, RuleSelect } from './employeeShared';

const CATEGORY_OPTIONS: { value: EmployeeCategory; label: string }[] = [
  { value: 'support', label: 'Support' },
  { value: 'official', label: 'Official' },
  { value: 'exempt', label: 'Exempt' },
];
const RATE_OPTIONS: { value: Rate; label: string }[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'dynamic', label: 'Dynamic' },
];
const CAP_OPTIONS = [
  { value: 'capped', label: 'Capped' },
  { value: 'exempt', label: 'Exempt' },
];

interface Props {
  className?: string;
  /** Everyone currently ticked in the list; non-empty puts the panel in bulk mode. */
  selectedInfos: EmployeeInfo[];
  /** The employee whose row was opened (single mode). */
  active: EmployeeInfo | null;
  /** How many employees share each designation (rule changes ripple to all of them). */
  designationCounts: Record<string, number>;
  onBack: () => void;
  onPayChange: (erps: string[], value: number) => void;
  onRulesChange: (designations: string[], change: RuleChange) => void;
  onClearSelection: () => void;
}

export function EmployeeDetailPanel(props: Props) {
  const { className, selectedInfos, active, onBack } = props;
  const bulk = selectedInfos.length > 0;

  return (
    <div className={cn('flex flex-col min-h-0 min-w-0 bg-card', className)}>
      <div className="lg:hidden shrink-0 h-10 flex items-center px-1.5 border-b border-border">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 h-8 pl-1 pr-2 rounded-[var(--radius-interactive)] text-[12px] font-medium hover:bg-muted"
          aria-label="Back to employee list"
        >
          <ChevronLeft size={18} />
          Employees
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
        {bulk ? (
          <BulkForm {...props} />
        ) : active ? (
          <SingleForm info={active} {...props} />
        ) : (
          <div className="h-full min-h-48 flex items-center justify-center text-center text-[11px] text-muted-foreground select-none">
            Pick an employee to edit their pay,
            <br />
            or tick several to edit them together.
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-muted/10 p-3 space-y-3">
      <div>
        <h4 className="text-[12px] font-bold text-foreground">{title}</h4>
        {note && <p className="text-[11px] text-muted-foreground mt-0.5">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function SingleForm({
  info,
  designationCounts,
  onPayChange,
  onRulesChange,
}: { info: EmployeeInfo } & Props) {
  const { emp, category, rate, capExempt, pay } = info;
  const designation = emp.designation || '';
  const isExempt = category === 'exempt';
  const isFixed = rate === 'fixed';
  const n = designationCounts[designation] || 1;

  const payNote = isExempt
    ? 'Not used — this designation is exempt from overtime.'
    : isFixed
      ? 'Not used — this designation is paid a fixed rate.'
      : 'Used to derive the hourly and daily overtime rate.';

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h3 className="text-[15px] font-bold text-foreground break-words">{toTitleCase(emp.name)}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
          <span className="font-mono">{emp.erp}</span> · {designation}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <InfoBadges info={info} />
        </div>
      </div>

      <Card title="Basic pay" note="Set per employee.">
        <SettingRow title="Monthly basic pay" description={payNote}>
          <NumberInput
            value={pay}
            onChange={(v) => onPayChange([emp.erp], v)}
            suffix="PKR"
            maxDigits={5}
            className="w-32"
            disabled={isFixed || isExempt}
          />
        </SettingRow>
      </Card>

      <Card
        title="Designation rules"
        note={`Applies to all ${n} employee${n === 1 ? '' : 's'} with the designation “${designation}”.`}
      >
        <RulesRows
          category={category}
          rate={isExempt ? null : rate}
          cap={isExempt || !isFixed ? null : capExempt ? 'exempt' : 'capped'}
          exempt={isExempt}
          fixed={isFixed}
          onChange={(c) => onRulesChange([designation], c)}
        />
      </Card>
    </div>
  );
}

function BulkForm({
  selectedInfos,
  designationCounts,
  onPayChange,
  onRulesChange,
  onClearSelection,
}: Props) {
  const [bulkPay, setBulkPay] = useState(0);
  const designations = Array.from(new Set(selectedInfos.map((i) => i.emp.designation || '')));
  const affected = designations.reduce((sum, d) => sum + (designationCounts[d] || 0), 0);
  const erps = selectedInfos.map((i) => i.emp.erp);

  const same = <T,>(vals: T[]): T | null => (vals.length > 0 && vals.every((v) => v === vals[0]) ? vals[0] : null);
  const category = same(selectedInfos.map((i) => i.category));
  const ruled = selectedInfos.filter((i) => i.category !== 'exempt');
  const rate = same(ruled.map((i) => i.rate));
  const fixedOnes = ruled.filter((i) => i.rate === 'fixed');
  const cap = same(fixedOnes.map((i) => (i.capExempt ? 'exempt' : 'capped')));

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-foreground">{selectedInfos.length} selected</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Edit them all at once. Changes are kept when you press Save &amp; Apply.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1" onClick={onClearSelection}>
          <X size={12} /> Clear
        </Button>
      </div>

      <Card title="Basic pay" note="People on the same pay? Set it once for everyone selected.">
        <div className="flex flex-wrap items-center gap-2">
          <NumberInput value={bulkPay} onChange={setBulkPay} suffix="PKR" maxDigits={5} className="w-32" />
          <Button size="sm" className="h-8 px-3 text-[11px]" disabled={bulkPay <= 0} onClick={() => onPayChange(erps, bulkPay)}>
            Apply to {selectedInfos.length}
          </Button>
        </div>
      </Card>

      <Card
        title="Designation rules"
        note={`Applies to ${designations.length} designation${designations.length === 1 ? '' : 's'} — ${affected} employee${affected === 1 ? '' : 's'} in total, including anyone not ticked.`}
      >
        <RulesRows
          category={category}
          rate={ruled.length === 0 ? null : rate}
          cap={fixedOnes.length === 0 ? null : cap}
          exempt={category === 'exempt'}
          fixed={fixedOnes.length > 0}
          onChange={(c) => onRulesChange(designations, c)}
          showMixed
        />
      </Card>
    </div>
  );
}

function RulesRows({
  category,
  rate,
  cap,
  exempt,
  fixed,
  onChange,
  showMixed,
}: {
  category: EmployeeCategory | null;
  rate: Rate | null;
  cap: string | null;
  exempt: boolean;
  fixed: boolean;
  onChange: (c: RuleChange) => void;
  showMixed?: boolean;
}) {
  const mixed = showMixed ? 'Mixed' : '—';
  return (
    <div className="space-y-4">
      <SettingRow title="Category" description="Support, Official, or Exempt from overtime.">
        <RuleSelect value={category} options={CATEGORY_OPTIONS} onChange={(v) => onChange({ category: v })} mixedLabel={mixed} />
      </SettingRow>
      <SettingRow
        title="Rate type"
        description={exempt ? 'Exempt designations have no overtime rate.' : 'Fixed uses the policy rate; Dynamic uses basic pay.'}
      >
        <RuleSelect value={rate} options={RATE_OPTIONS} onChange={(v) => onChange({ rate: v })} disabled={exempt} mixedLabel={mixed} />
      </SettingRow>
      <SettingRow
        title="Monthly day cap"
        description={fixed ? 'Exempt lets this designation go past the monthly day cap.' : 'Only available for fixed-rate designations.'}
      >
        <RuleSelect
          value={cap as 'capped' | 'exempt' | null}
          options={CAP_OPTIONS}
          onChange={(v) => onChange({ capExempt: v === 'exempt' })}
          disabled={!fixed || exempt}
          mixedLabel={fixed ? mixed : '—'}
        />
      </SettingRow>
    </div>
  );
}
