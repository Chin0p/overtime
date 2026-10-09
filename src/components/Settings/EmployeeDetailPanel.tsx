import { useState, type ReactNode } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { SettingRow } from './SettingRow';
import { cn, toTitleCase } from '../../lib/utils';
import { EmployeeCategory } from '../../types';
import { ExcludedDaysChips } from './ExcludedDaysChips';
import { Eligibility, EmployeeInfo, InfoBadges, Rate, RuleChange, RuleSelect } from './employeeShared';

const CATEGORY_OPTIONS: { value: EmployeeCategory; label: string }[] = [
  { value: 'support', label: 'Support' },
  { value: 'official', label: 'Official' },
  { value: 'exempt', label: 'Exempt' },
];
const RATE_OPTIONS: { value: Rate; label: string }[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'dynamic', label: 'Dynamic' },
];
const ELIGIBILITY_OPTIONS: { value: Eligibility; label: string }[] = [
  { value: 'default', label: 'Follow designation' },
  { value: 'exempt', label: 'Exempt' },
  { value: 'included', label: 'Not exempt' },
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
  onEligibilityChange: (erps: string[], value: Eligibility) => void;
  /** Days excluded per ERP, and the dates of the loaded file to pick from. */
  excludedDays: Record<string, string[]>;
  dates: string[];
  /** Exclude (on) or include again (off) one day for the given people. */
  onExcludeDay: (erps: string[], date: string, on: boolean) => void;
  onClearExcluded: (erps: string[]) => void;
  onClearSelection: () => void;
}

export function EmployeeDetailPanel(props: Props) {
  const { className, selectedInfos, active, onBack } = props;
  const bulk = selectedInfos.length > 0;

  return (
    <div className={cn('flex flex-col min-h-0 min-w-0', className)}>
      <div className="lg:hidden shrink-0 h-9 flex items-center -ml-1 mb-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 h-8 pl-1 pr-2 rounded-[var(--radius-interactive)] text-ui font-medium hover:bg-muted"
          aria-label="Back to employee list"
        >
          <ChevronLeft size={18} />
          Employees
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {bulk ? (
          <BulkForm {...props} />
        ) : active ? (
          <SingleForm info={active} {...props} />
        ) : (
          <div className="h-full min-h-48 flex items-center justify-center text-center text-caption text-muted-foreground select-none rounded-xl border border-dashed border-border bg-card/60 p-4">
            Pick an employee to edit their pay,
            <br />
            or tick several to edit them together.
          </div>
        )}
      </div>
    </div>
  );
}

/** Pick days to leave out of pay: they stay on the dashboard (greyed, "Excluded") but not in totals or the PDF. */
function ExcludedDaysCard({
  erps,
  excludedDays,
  dates,
  onExcludeDay,
  onClearExcluded,
}: Pick<Props, 'excludedDays' | 'dates' | 'onExcludeDay' | 'onClearExcluded'> & { erps: string[] }) {
  const sets = erps.map((erp) => new Set(excludedDays[erp] || []));
  const stateOf = (date: string) => {
    const n = sets.filter((s) => s.has(date)).length;
    return n === 0 ? 'none' : n === sets.length ? 'all' : 'some';
  };
  const many = erps.length > 1;
  return (
    <Card
      title="Excluded days"
      note={
        many
          ? `Applies only to the ${erps.length} ticked. Left out of pay and the PDF; still shown on the dashboard.`
          : 'Left out of this employee’s pay and the PDF; still shown on the dashboard, greyed.'
      }
    >
      <ExcludedDaysChips
        dates={dates}
        stateOf={stateOf}
        onSet={(date, on) => onExcludeDay(erps, date, on)}
        onClear={() => onClearExcluded(erps)}
      />
    </Card>
  );
}

/** One line explaining what the selected eligibility means for this person. */
function eligibilityNote(eligibility: 'exempt' | 'included' | undefined, designationExempt: boolean): string {
  if (eligibility === 'exempt') {
    return designationExempt
      ? 'Exempt — same as the designation.'
      : 'Gets no overtime, even though the designation is paid.';
  }
  if (eligibility === 'included') {
    return designationExempt
      ? 'Paid overtime, even though the designation is exempt.'
      : 'Paid overtime — same as the designation.';
  }
  return designationExempt
    ? 'Follows the designation: exempt from overtime.'
    : 'Follows the designation: paid overtime.';
}

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-xs p-4 space-y-3">
      <div>
        <h4 className="text-body font-semibold text-foreground">{title}</h4>
        {note && <p className="text-ui text-muted-foreground mt-0.5">{note}</p>}
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
  onEligibilityChange,
  excludedDays,
  dates,
  onExcludeDay,
  onClearExcluded,
}: { info: EmployeeInfo } & Props) {
  const excludedProps = { excludedDays, dates, onExcludeDay, onClearExcluded };
  const { emp, category, designationCategory, eligibility, rate, capExempt, pay } = info;
  const designation = emp.designation || '';
  // This person is not paid overtime (their own setting or their designation's).
  const isExempt = category === 'exempt';
  // The designation itself is exempt: only then do its rate / cap rules not apply.
  const designationExempt = designationCategory === 'exempt';
  const isFixed = rate === 'fixed';
  const n = designationCounts[designation] || 1;

  const payNote = isExempt
    ? 'Not used — this employee is exempt from overtime.'
    : isFixed
      ? 'Not used — this designation is paid a fixed rate.'
      : 'Used to derive the hourly and daily overtime rate.';

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h3 className="text-title font-bold text-foreground break-words">{toTitleCase(emp.name)}</h3>
        <p className="text-caption text-muted-foreground mt-0.5 break-words">
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

      <Card title="Overtime eligibility" note="Applies to this employee only.">
        <SettingRow title="This employee" description={eligibilityNote(eligibility, designationExempt)}>
          <RuleSelect
            widthClass="w-40"
            value={eligibility ?? 'default'}
            options={ELIGIBILITY_OPTIONS}
            onChange={(v) => onEligibilityChange([emp.erp], v)}
          />
        </SettingRow>
      </Card>

      <ExcludedDaysCard erps={[emp.erp]} {...excludedProps} />

      <Card
        title="Designation rules"
        note={`Applies to all ${n} employee${n === 1 ? '' : 's'} with the designation “${designation}”.`}
      >
        <RulesRows
          category={designationCategory}
          rate={designationExempt ? null : rate}
          cap={designationExempt || !isFixed ? null : capExempt ? 'exempt' : 'capped'}
          exempt={designationExempt}
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
  onEligibilityChange,
  excludedDays,
  dates,
  onExcludeDay,
  onClearExcluded,
  onClearSelection,
}: Props) {
  const excludedProps = { excludedDays, dates, onExcludeDay, onClearExcluded };
  const [bulkPay, setBulkPay] = useState(0);
  const designations = Array.from(new Set(selectedInfos.map((i) => i.emp.designation || '')));
  const affected = designations.reduce((sum, d) => sum + (designationCounts[d] || 0), 0);
  const erps = selectedInfos.map((i) => i.emp.erp);

  const same = <T,>(vals: T[]): T | null => (vals.length > 0 && vals.every((v) => v === vals[0]) ? vals[0] : null);
  const category = same(selectedInfos.map((i) => i.designationCategory));
  const eligibility = same(selectedInfos.map((i) => i.eligibility ?? 'default'));
  const ruled = selectedInfos.filter((i) => i.designationCategory !== 'exempt');
  const rate = same(ruled.map((i) => i.rate));
  const fixedOnes = ruled.filter((i) => i.rate === 'fixed');
  const cap = same(fixedOnes.map((i) => (i.capExempt ? 'exempt' : 'capped')));

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-title font-bold text-foreground">{selectedInfos.length} selected</h3>
          <p className="text-caption text-muted-foreground mt-0.5">
            Edit them all at once. Changes are kept when you press Save &amp; Apply.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-7 px-2 text-caption gap-1" onClick={onClearSelection}>
          <X size={12} /> Clear
        </Button>
      </div>

      <Card title="Basic pay" note="People on the same pay? Set it once for everyone selected.">
        <div className="flex flex-wrap items-center gap-2">
          <NumberInput value={bulkPay} onChange={setBulkPay} suffix="PKR" maxDigits={5} className="w-32" />
          <Button size="sm" className="h-8 px-3 text-caption" disabled={bulkPay <= 0} onClick={() => onPayChange(erps, bulkPay)}>
            Apply to {selectedInfos.length}
          </Button>
        </div>
      </Card>

      <Card
        title="Overtime eligibility"
        note={`Applies only to the ${selectedInfos.length} ticked — not to everyone with the same designation.`}
      >
        <SettingRow title="Selected employees" description="Follow their designation, or exempt / include just these people.">
          <RuleSelect
            widthClass="w-40"
            value={eligibility}
            options={ELIGIBILITY_OPTIONS}
            onChange={(v) => onEligibilityChange(erps, v)}
          />
        </SettingRow>
      </Card>

      <ExcludedDaysCard erps={erps} {...excludedProps} />

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
