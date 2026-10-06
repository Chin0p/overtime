import { useMemo, useState } from 'react';
import { ChevronLeft, Plus, X, AlertCircle } from 'lucide-react';
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { AttendanceData, EmployeeRow } from '../../types';
import { Input } from '../ui/input';
import { NumberInput } from '../ui/NumberInput';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';
import { SettingRow } from './SettingRow';
import { cn, flexibleParseDate, formatCanonicalDate, toTitleCase } from '../../lib/utils';
import { manualEntryToRows } from '../../parser/mergeRecords';
import { parseJSON } from '../../parser/jsonParser';

interface Props {
  employees: EmployeeRow[];
  dates: string[];
  onBack: () => void;
  onSubmit: (data: AttendanceData) => { addedEmployees: number; updatedEmployees: number; days: number } | void;
}

interface Day {
  date: string; // dd-MMM-yyyy
  timeIn: string; // HH:MM
  timeOut: string;
}

const NEW = '__new__';

export function ManualEntryView({ employees, dates, onBack, onSubmit }: Props) {
  const sorted = useMemo(() => [...employees].sort((a, b) => a.name.localeCompare(b.name)), [employees]);

  // The month(s) of the loaded file bound the date picker.
  const bounds = useMemo(() => {
    const ds = dates.map((d) => flexibleParseDate(d)).filter((d) => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
    if (ds.length === 0) return null;
    return { min: startOfMonth(ds[0]), max: endOfMonth(ds[ds.length - 1]), first: ds[0] };
  }, [dates]);

  const [who, setWho] = useState<string>(sorted[0]?.erp ?? NEW);
  const [erp, setErp] = useState('');
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [basicPay, setBasicPay] = useState(0);

  const [dateStr, setDateStr] = useState(bounds ? format(bounds.first, 'yyyy-MM-dd') : '');
  const [timeIn, setTimeIn] = useState('08:00');
  const [timeOut, setTimeOut] = useState('18:00');
  const [days, setDays] = useState<Day[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isNew = who === NEW;
  const current = sorted.find((e) => e.erp === who);
  const erpClash = isNew && erp.trim() !== '' && employees.some((e) => e.erp === erp.trim());

  const addDay = () => {
    if (!dateStr) return setError('Pick a date.');
    if (!timeIn || !timeOut) return setError('Enter both the In and the Out time.');
    if (timeOut <= timeIn) return setError('Out time must be later than In time.');
    const [y, m, d] = dateStr.split('-').map(Number);
    const canonical = formatCanonicalDate(new Date(y, m - 1, d));
    setError(null);
    setDays((prev) => [...prev.filter((x) => x.date !== canonical), { date: canonical, timeIn, timeOut }].sort(
      (a, b) => flexibleParseDate(a.date).getTime() - flexibleParseDate(b.date).getTime(),
    ));
    // move on to the next day, ready for the next entry
    const next = addDays(new Date(y, m - 1, d), 1);
    if (!bounds || next <= bounds.max) setDateStr(format(next, 'yyyy-MM-dd'));
  };

  const canSubmit =
    days.length > 0 && (isNew ? erp.trim() !== '' && name.trim() !== '' && designation.trim() !== '' && !erpClash : !!current);

  const submit = () => {
    if (!canSubmit) return;
    try {
      const rows = manualEntryToRows({
        erp: isNew ? erp.trim() : current!.erp,
        name: isNew ? name.trim() : current!.name,
        designation: isNew ? designation.trim() : current!.designation,
        basicPay: isNew ? basicPay : current!.basicPay,
        days,
      });
      onSubmit(parseJSON(rows, 'manual-entry'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add these records.');
    }
  };

  return (
    <div className="-m-3 sm:-m-5 flex flex-col min-h-full">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-3 sm:px-5 py-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="size-8 -ml-1.5 shrink-0 flex items-center justify-center rounded-[var(--radius-interactive)] hover:bg-muted"
          aria-label="Back to Backup / Reset"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold text-foreground leading-tight">Enter days manually</h3>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Add attendance for one employee.</p>
        </div>
      </div>

      <div className="px-3 sm:px-5 py-4 space-y-5 max-w-xl">
        {/* 1. Who */}
        <section className="space-y-3">
          <h4 className="text-[12px] font-bold text-foreground">1 · Employee</h4>
          <Select value={who} onValueChange={(v) => v && setWho(v)}>
            <SelectTrigger className="w-full">
              <span className="truncate">
                {isNew ? 'New employee (not in the file)' : current ? `${toTitleCase(current.name)} · ${current.erp}` : 'Choose…'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NEW}>New employee (not in the file)</SelectItem>
              {sorted.map((e) => (
                <SelectItem key={e.erp} value={e.erp}>
                  {toTitleCase(e.name)} · {e.erp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isNew ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-3">
              <SettingRow title="ERP" description={erpClash ? 'This ERP is already in the file — pick that employee above instead.' : 'Unique employee number.'}>
                <Input value={erp} onChange={(e) => setErp(e.target.value)} inputMode="numeric" className={cn('w-28 h-8 text-[12px]', erpClash && 'border-destructive')} />
              </SettingRow>
              <SettingRow title="Name" description="As it should appear in reports.">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="w-40 h-8 text-[12px]" />
              </SettingRow>
              <SettingRow title="Designation" description="Decides the category and rate type (see Employees & Pay).">
                <Input value={designation} onChange={(e) => setDesignation(e.target.value)} className="w-40 h-8 text-[12px]" />
              </SettingRow>
              <SettingRow title="Basic pay" description="Used for the dynamic rate. Leave 0 for fixed-rate designations.">
                <NumberInput value={basicPay} onChange={setBasicPay} suffix="PKR" maxDigits={5} className="w-32" />
              </SettingRow>
            </div>
          ) : current ? (
            <p className="text-[11px] text-muted-foreground">
              {current.designation} · days you add are merged with their existing records. A date that already has a record is replaced.
            </p>
          ) : null}
        </section>

        {/* 2. Days */}
        <section className="space-y-3">
          <h4 className="text-[12px] font-bold text-foreground">2 · Days</h4>
          <div className="grid grid-cols-[minmax(0,1fr)_92px_92px] gap-2 items-end">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</span>
              <Input
                type="date"
                value={dateStr}
                min={bounds ? format(bounds.min, 'yyyy-MM-dd') : undefined}
                max={bounds ? format(bounds.max, 'yyyy-MM-dd') : undefined}
                onChange={(e) => setDateStr(e.target.value)}
                className="h-9 text-[12px] w-full"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">In</span>
              <Input type="time" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} className="h-9 text-[12px] w-full px-2" />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Out</span>
              <Input type="time" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} className="h-9 text-[12px] w-full px-2" />
            </label>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addDay} className="h-8 gap-1.5 text-[12px]">
            <Plus size={14} /> Add day
          </Button>

          {error && (
            <div className="p-2 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-[11px] flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {days.length === 0 ? (
            <p className="text-[11px] text-muted-foreground border-2 border-dashed border-border rounded-lg py-5 text-center select-none">
              No days added yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {days.map((d) => (
                <li key={d.date} className="flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-md border border-border bg-card">
                  <span className="flex-1 text-[12px] font-medium text-foreground">{format(flexibleParseDate(d.date), 'EEE, d MMM yyyy')}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{d.timeIn} → {d.timeOut}</span>
                  <button
                    type="button"
                    onClick={() => setDays((p) => p.filter((x) => x.date !== d.date))}
                    className="size-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label={`Remove ${d.date}`}
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex items-center gap-2 pt-1">
          <Button type="button" onClick={submit} disabled={!canSubmit} className="h-8 text-[12px] px-4">
            {days.length > 0 ? `Add ${days.length} day${days.length === 1 ? '' : 's'}` : 'Add days'}
          </Button>
          <Button type="button" variant="outline" onClick={onBack} className="h-8 text-[12px] px-3">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
