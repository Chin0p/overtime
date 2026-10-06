import React, { useRef, useState, useMemo } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, FileJson, UserPlus } from 'lucide-react';
import { OTSettings, Holiday, AttendanceData, EmployeeRow } from '../../types';
import { DEFAULT_SETTINGS } from '../../constants';
import { parseJSON } from '../../parser/jsonParser';
import { CustomConfirmDialog } from '../ui/CustomConfirmDialog';
import { ManualEntryView } from './ManualEntryView';

interface AddRecordsSummary {
  addedEmployees: number;
  updatedEmployees: number;
  days: number;
}

interface DataFlowTabProps {
  policy: OTSettings['policy'];
  appearance: OTSettings['appearance'];
  pdf: OTSettings['pdf'];
  basicPay: Record<string, number>;
  holidays: Holiday[];
  employees: EmployeeRow[];
  dates: string[];
  onImport: (data: {
    policy: OTSettings['policy'];
    appearance: OTSettings['appearance'];
    pdf: OTSettings['pdf'];
    basicPay: Record<string, number>;
    holidays: Holiday[];
  }) => void;
  /** Merge parsed records into the data that is currently loaded. */
  onAddRecords: (incoming: AttendanceData) => AddRecordsSummary;
}

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Turn whatever was in a settings backup into a complete, safe settings set.
 * Older or hand-edited files may miss sections; fill them from the defaults instead of crashing.
 */
function normalizeBackup(json: any, current: { appearance: OTSettings['appearance'] }) {
  if (!isObj(json) || !isObj(json.policy) || !isObj(json.pdf)) {
    throw new Error('This is not a settings backup. Use a file made with "Export Settings".');
  }
  const d = DEFAULT_SETTINGS;
  const policy: OTSettings['policy'] = {
    ...d.policy,
    ...json.policy,
    officeTiming: { ...d.policy.officeTiming, ...(isObj(json.policy.officeTiming) ? json.policy.officeTiming : {}) },
    support: { ...d.policy.support, ...(isObj(json.policy.support) ? json.policy.support : {}) },
    official: { ...d.policy.official, ...(isObj(json.policy.official) ? json.policy.official : {}) },
    designationCategories: isObj(json.policy.designationCategories) ? json.policy.designationCategories : {},
    designationRateTypes: isObj(json.policy.designationRateTypes) ? json.policy.designationRateTypes : {},
    designationCapExempt: isObj(json.policy.designationCapExempt) ? json.policy.designationCapExempt : {},
  };
  const pdf: OTSettings['pdf'] = {
    ...d.pdf,
    ...json.pdf,
    // fixed wording, same as when settings are loaded at start-up
    signatureLeft: 'employee signature',
    signatureRight: 'officer signature',
    summarySubject: 'overtime of admin branch for the month',
  };
  const basicPay: Record<string, number> = {};
  if (isObj(json.basicPay)) {
    Object.entries(json.basicPay).forEach(([erp, v]) => {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) basicPay[erp] = n;
    });
  }
  const holidays: Holiday[] = Array.isArray(json.holidays)
    ? json.holidays
        .filter((h: any) => isObj(h) && typeof h.date === 'string')
        .map((h: any) => ({ date: h.date, name: typeof h.name === 'string' ? h.name : 'Holiday' }))
    : [];
  const appearance = isObj(json.appearance) ? { ...current.appearance, ...json.appearance } : current.appearance;
  return { policy, appearance, pdf, basicPay, holidays };
}

const cardCls =
  'flex flex-col items-center justify-center p-4 bg-muted/20 border border-border rounded-lg hover:bg-muted/50 transition-all group active:scale-95 disabled:opacity-50 disabled:pointer-events-none';
const iconCls =
  'w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2 group-hover:scale-105 transition-transform';

export function DataFlowTab({
  policy,
  appearance,
  pdf,
  basicPay,
  holidays,
  employees,
  dates,
  onImport,
  onAddRecords,
}: DataFlowTabProps) {
  const settingsInputRef = useRef<HTMLInputElement>(null);
  const recordsInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<'main' | 'manual'>('main');
  const [importData, setImportData] = useState<ReturnType<typeof normalizeBackup> & { version?: string; timestamp?: string } | null>(null);
  const [pendingRecords, setPendingRecords] = useState<{ data: AttendanceData; fileName: string } | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const hasData = employees.length > 0;

  // ---------------- settings backup ----------------
  const handleExport = () => {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      policy,
      appearance,
      pdf,
      basicPay,
      holidays,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ot-manager-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice({ kind: 'success', text: 'Settings exported to a .json file.' });
  };

  const readFile = (file: File, onText: (text: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => onText(String(event.target?.result ?? ''));
    reader.onerror = () => setNotice({ kind: 'error', text: 'The file could not be read.' });
    reader.readAsText(file);
  };

  const handleImportSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    readFile(file, (text) => {
      try {
        const json = JSON.parse(text);
        const normalized = normalizeBackup(json, { appearance });
        setImportData({ ...normalized, version: json.version, timestamp: json.timestamp });
        setNotice(null);
      } catch (err) {
        setNotice({
          kind: 'error',
          text: err instanceof SyntaxError ? 'That file is not valid JSON.' : err instanceof Error ? err.message : 'Failed to read settings file.',
        });
      }
    });
  };

  const diffSummary = useMemo(() => {
    if (!importData) return null;
    const lines: string[] = [];
    const inPolicy = importData.policy;
    const policyDiffs: string[] = [];
    if (inPolicy.minThreshold !== policy.minThreshold) policyDiffs.push('Min threshold');
    if (inPolicy.shiftDurationHours !== policy.shiftDurationHours) policyDiffs.push('Shift duration');
    if (inPolicy.roundingMode !== policy.roundingMode) policyDiffs.push('Rounding mode');
    if (inPolicy.official.dailyOTCap !== policy.official.dailyOTCap) policyDiffs.push('Dynamic daily cap');
    if (inPolicy.support.hourlyRate !== policy.support.hourlyRate) policyDiffs.push('Fixed hourly rate');
    if (JSON.stringify(inPolicy.designationCategories) !== JSON.stringify(policy.designationCategories)) policyDiffs.push('Designation categories');
    if (policyDiffs.length) lines.push(`Policy: ${policyDiffs.join(', ')}`);

    const keys = new Set([...Object.keys(importData.basicPay), ...Object.keys(basicPay)]);
    const bpChanged = Array.from(keys).filter((k) => basicPay[k] !== importData.basicPay[k]).length;
    if (bpChanged) lines.push(`Basic pay: ${bpChanged} entr${bpChanged === 1 ? 'y' : 'ies'} changed`);

    if (importData.holidays.length !== holidays.length) lines.push(`Holidays: ${holidays.length} → ${importData.holidays.length}`);
    if (!lines.length) lines.push('No differences detected.');
    return lines;
  }, [importData, policy, basicPay, holidays]);

  const confirmImport = () => {
    if (!importData) return;
    const { policy: p, appearance: a, pdf: pd, basicPay: bp, holidays: h } = importData;
    onImport({ policy: p, appearance: a, pdf: pd, basicPay: bp, holidays: h });
    setImportData(null);
    setNotice({ kind: 'success', text: 'Settings loaded. Press Save & Apply to keep them.' });
  };

  // ---------------- records for one (or a few) employees ----------------
  const handleRecordsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    readFile(file, (text) => {
      try {
        const data = parseJSON(text, file.name, policy.shiftDurationHours);
        setPendingRecords({ data, fileName: file.name });
        setNotice(null);
      } catch (err) {
        setNotice({
          kind: 'error',
          text: err instanceof SyntaxError ? 'That file is not valid JSON.' : err instanceof Error ? err.message : 'Failed to read records file.',
        });
      }
    });
  };

  const recordsSummary = useMemo(() => {
    if (!pendingRecords) return null;
    const known = new Set(employees.map((e) => e.erp));
    const inc = pendingRecords.data.employees;
    const fresh = inc.filter((e) => !known.has(e.erp));
    const days = pendingRecords.data.dates.length;
    const lines = [`${inc.length} employee${inc.length === 1 ? '' : 's'} · ${days} day${days === 1 ? '' : 's'} of records`];
    if (fresh.length) lines.push(`New: ${fresh.slice(0, 4).map((e) => e.name).join(', ')}${fresh.length > 4 ? ` +${fresh.length - 4} more` : ''}`);
    if (inc.length - fresh.length) lines.push(`Already loaded: ${inc.length - fresh.length} (days are added; matching dates are replaced)`);
    if (pendingRecords.data.warnings?.length) lines.push(`${pendingRecords.data.warnings.length} row(s) skipped`);
    return lines;
  }, [pendingRecords, employees]);

  const confirmRecords = () => {
    if (!pendingRecords) return;
    const s = onAddRecords(pendingRecords.data);
    setPendingRecords(null);
    setNotice({
      kind: 'success',
      text: `Added records: ${s.addedEmployees} new employee${s.addedEmployees === 1 ? '' : 's'}, ${s.updatedEmployees} updated.`,
    });
  };

  if (view === 'manual') {
    return (
      <ManualEntryView
        employees={employees}
        dates={dates}
        onBack={() => setView('main')}
        onSubmit={(data) => {
          const s = onAddRecords(data);
          setView('main');
          setNotice({
            kind: 'success',
            text: s.addedEmployees
              ? `Added a new employee with ${s.days} day${s.days === 1 ? '' : 's'} of records.`
              : `Added ${s.days} day${s.days === 1 ? '' : 's'} to the employee's records.`,
          });
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={
            notice.kind === 'error'
              ? 'p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-[11px] flex items-start gap-2'
              : 'p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] flex items-start gap-2'
          }
        >
          {notice.kind === 'error' ? <AlertCircle size={14} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={14} className="shrink-0 mt-0.5" />}
          <span>{notice.text}</span>
        </div>
      )}

      <section>
        <h3 className="text-[12px] font-bold text-foreground mb-1">Backup &amp; Restore</h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Save your policies, designation rules, basic pay, holidays and PDF options to a JSON file, or load them back.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button type="button" onClick={handleExport} className={cardCls}>
            <div className={iconCls}><Download size={18} /></div>
            <span className="text-[12px] font-bold text-foreground">Export Settings</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 text-center">Save to .json file</span>
          </button>
          <button type="button" onClick={() => settingsInputRef.current?.click()} className={cardCls}>
            <div className={iconCls}><Upload size={18} /></div>
            <span className="text-[12px] font-bold text-foreground">Import Settings</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 text-center">Load from .json file</span>
          </button>
          <input type="file" ref={settingsInputRef} onChange={handleImportSelect} accept=".json,application/json" className="hidden" />
        </div>
      </section>

      <div className="h-px bg-border" />

      <section>
        <h3 className="text-[12px] font-bold text-foreground mb-1">Add employee records</h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Missing someone from the attendance file? Add their days here. They are added to the data that is loaded now,
          straight away (no need to press Save &amp; Apply). Re-load the main file and they are gone, so keep a copy of the file.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button type="button" disabled={!hasData} onClick={() => setView('manual')} className={cardCls}>
            <div className={iconCls}><UserPlus size={18} /></div>
            <span className="text-[12px] font-bold text-foreground">Enter days manually</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 text-center">Pick or create an employee, then add In/Out times</span>
          </button>
          <button type="button" disabled={!hasData} onClick={() => recordsInputRef.current?.click()} className={cardCls}>
            <div className={iconCls}><FileJson size={18} /></div>
            <span className="text-[12px] font-bold text-foreground">Import records file</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 text-center">A .json file in the same format as the attendance file</span>
          </button>
          <input type="file" ref={recordsInputRef} onChange={handleRecordsSelect} accept=".json,application/json" className="hidden" />
        </div>
        {!hasData && <p className="text-[10px] text-muted-foreground mt-2">Load an attendance file first.</p>}
      </section>

      {importData && (
        <CustomConfirmDialog
          title="Import Settings"
          message={
            `Backup version: ${importData.version || 'unknown'} · exported ${importData.timestamp ? new Date(importData.timestamp).toLocaleString() : 'unknown'}\n\n` +
            (diffSummary ? diffSummary.join('\n') : '') +
            '\n\nThis replaces the settings you are editing. Press Save & Apply afterwards to keep them.'
          }
          onConfirm={confirmImport}
          onCancel={() => setImportData(null)}
          confirmText="Import"
        />
      )}

      {pendingRecords && (
        <CustomConfirmDialog
          title="Add records"
          message={`${pendingRecords.fileName}\n\n${recordsSummary?.join('\n') ?? ''}`}
          onConfirm={confirmRecords}
          onCancel={() => setPendingRecords(null)}
          confirmText="Add"
        />
      )}
    </div>
  );
}
