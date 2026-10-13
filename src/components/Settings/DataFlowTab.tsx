import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
import { Button } from '../ui/button';
import React, { useRef, useState, useMemo } from 'react';
import { Download, Upload } from 'lucide-react';
import { Notice } from '../ui/notice';
import { OTSettings, Holiday } from '../../types';
import { DEFAULT_SETTINGS } from '../../constants';
import { CustomConfirmDialog } from '../ui/CustomConfirmDialog';
import { format } from 'date-fns';

/** Backup time for display: dd-MMM-yyyy HH:mm, or "unknown" when missing or unreadable. */
function formatBackupTime(timestamp?: string): string {
  if (!timestamp) return 'unknown';
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? 'unknown' : format(d, 'dd-MMM-yyyy HH:mm');
}

interface DataFlowTabProps {
  policy: OTSettings['policy'];
  appearance: OTSettings['appearance'];
  pdf: OTSettings['pdf'];
  basicPay: Record<string, number>;
  holidays: Holiday[];
  onImport: (data: {
    policy: OTSettings['policy'];
    appearance: OTSettings['appearance'];
    pdf: OTSettings['pdf'];
    basicPay: Record<string, number>;
    holidays: Holiday[];
  }) => void;
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
    // Office timing now comes from the file; a stored one in an old backup is ignored.
    minThresholdMinutes: Number.isFinite(json.policy.minThresholdMinutes)
      ? json.policy.minThresholdMinutes
      : Number.isFinite(json.policy.minThreshold)
        ? Math.round(json.policy.minThreshold * 60)
        : d.policy.minThresholdMinutes,
    lateGraceMinutes: Number.isFinite(json.policy.lateGraceMinutes) ? json.policy.lateGraceMinutes : d.policy.lateGraceMinutes,
    support: { ...d.policy.support, ...(isObj(json.policy.support) ? json.policy.support : {}) },
    official: { ...d.policy.official, ...(isObj(json.policy.official) ? json.policy.official : {}) },
    designationCategories: isObj(json.policy.designationCategories) ? json.policy.designationCategories : {},
    designationRateTypes: isObj(json.policy.designationRateTypes) ? json.policy.designationRateTypes : {},
    designationCapExempt: isObj(json.policy.designationCapExempt) ? json.policy.designationCapExempt : {},
    employeeEligibility: isObj(json.policy.employeeEligibility)
      ? (Object.fromEntries(
          Object.entries(json.policy.employeeEligibility).filter(([, v]) => v === 'exempt' || v === 'included'),
        ) as Record<string, 'exempt' | 'included'>)
      : {},
    employeeExcludedDays: isObj(json.policy.employeeExcludedDays)
      ? Object.fromEntries(
          Object.entries(json.policy.employeeExcludedDays)
            .filter(([, v]) => Array.isArray(v))
            .map(([k, v]) => [k, (v as unknown[]).filter((d) => typeof d === 'string')]),
        ) as Record<string, string[]>
      : {},
    employeeExcludeHolidays: isObj(json.policy.employeeExcludeHolidays)
      ? (Object.fromEntries(
          Object.entries(json.policy.employeeExcludeHolidays).filter(([, v]) => v === true),
        ) as Record<string, boolean>)
      : {},
    fileHolidaysSeen: Array.isArray(json.policy.fileHolidaysSeen)
      ? json.policy.fileHolidaysSeen.filter((d: unknown) => typeof d === 'string')
      : [],
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


export function DataFlowTab({
  policy,
  appearance,
  pdf,
  basicPay,
  holidays,
  onImport,
}: DataFlowTabProps) {
  const settingsInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<ReturnType<typeof normalizeBackup> & { version?: string; timestamp?: string } | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

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
    a.download = `ot-manager-settings-${format(new Date(), 'dd-MMM-yyyy')}.json`;
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
    if (inPolicy.minThresholdMinutes !== policy.minThresholdMinutes) policyDiffs.push('Min threshold');
    if (inPolicy.lateGraceMinutes !== policy.lateGraceMinutes) policyDiffs.push('Late grace');
    if (inPolicy.shiftDurationHours !== policy.shiftDurationHours) policyDiffs.push('Shift duration');
    if (inPolicy.roundingMode !== policy.roundingMode) policyDiffs.push('Rounding mode');
    if (inPolicy.official.dailyOTCap !== policy.official.dailyOTCap) policyDiffs.push('Dynamic daily cap');
    if (inPolicy.support.hourlyRate !== policy.support.hourlyRate) policyDiffs.push('Fixed hourly rate');
    if (JSON.stringify(inPolicy.designationCategories) !== JSON.stringify(policy.designationCategories)) policyDiffs.push('Designation categories');
    if (JSON.stringify(inPolicy.employeeEligibility || {}) !== JSON.stringify(policy.employeeEligibility || {})) policyDiffs.push('Per-employee exemptions');
    if (JSON.stringify(inPolicy.employeeExcludedDays || {}) !== JSON.stringify(policy.employeeExcludedDays || {})) policyDiffs.push('Excluded days');
    if (JSON.stringify(inPolicy.employeeExcludeHolidays || {}) !== JSON.stringify(policy.employeeExcludeHolidays || {})) policyDiffs.push('Holidays excluded');
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {notice && <Notice tone={notice.kind}>{notice.text}</Notice>}

      <SettingsSection
        title="Settings file"
        description="Settings, designation rules, basic pay, holidays and PDF options in one JSON file."
      >
        <SettingRow title="Export settings" description="Save everything to a .json file.">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={14} /> Export
          </Button>
        </SettingRow>
        <SettingRow title="Import settings" description="Load a saved .json file. Nothing changes until you press Save & Apply.">
          <Button variant="outline" size="sm" onClick={() => settingsInputRef.current?.click()}>
            <Upload size={14} /> Import
          </Button>
        </SettingRow>
      </SettingsSection>
      <input type="file" ref={settingsInputRef} onChange={handleImportSelect} accept=".json,application/json" className="hidden" />

      {importData && (
        <CustomConfirmDialog
          title="Import settings"
          message={
            `Backup version: ${importData.version || 'unknown'} · exported ${importData.timestamp ? formatBackupTime(importData.timestamp) : 'unknown'}\n\n` +
            (diffSummary ? diffSummary.join('\n') : '') +
            '\n\nThis replaces the settings you are editing. Press Save & Apply afterwards to keep them.'
          }
          onConfirm={confirmImport}
          onCancel={() => setImportData(null)}
          confirmText="Import"
        />
      )}

    </div>
  );
}
