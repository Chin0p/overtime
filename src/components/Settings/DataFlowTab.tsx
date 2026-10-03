import React, { useRef, useState, useMemo } from 'react';
import { Download, Upload, AlertCircle, FileArchive } from 'lucide-react';
import { OTSettings, Holiday } from '../../types';
import { CustomConfirmDialog } from '../ui/CustomConfirmDialog';

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

export function DataFlowTab({ policy, appearance, pdf, basicPay, holidays, onImport }: DataFlowTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExport = () => {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      policy,
      appearance,
      pdf,
      basicPay,
      holidays
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ot-manager-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.policy || !json.pdf) {
          throw new Error('Invalid settings file format.');
        }
        setImportData(json);
        setImportError(null);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to read settings file.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const diffSummary = useMemo(() => {
    if (!importData) return null;
    const lines: string[] = [];
    const inPolicy = importData.policy || {};
    const policyDiffs: string[] = [];
    if (inPolicy.minThreshold !== policy.minThreshold) policyDiffs.push('Min threshold');
    if (inPolicy.shiftDurationHours !== policy.shiftDurationHours) policyDiffs.push('Shift duration');
    if (inPolicy.roundingMode !== policy.roundingMode) policyDiffs.push('Rounding mode');
    if (inPolicy.official?.dailyOTCap !== policy.official.dailyOTCap) policyDiffs.push('Dynamic daily cap');
    if (inPolicy.support?.hourlyRate !== policy.support.hourlyRate) policyDiffs.push('Fixed hourly rate');
    if (policyDiffs.length) lines.push(`Policy: ${policyDiffs.join(', ')}`);

    const inBP = importData.basicPay || {};
    const bpChanged = Object.keys(inBP).filter(k => basicPay[k] !== inBP[k]).length;
    if (bpChanged) lines.push(`Basic pay: ${bpChanged} entr${bpChanged === 1 ? 'y' : 'ies'} changed`);

    const inHol = importData.holidays || [];
    if (inHol.length !== holidays.length) lines.push(`Holidays: ${holidays.length} → ${inHol.length}`);

    if (!lines.length) lines.push('No differences detected.');
    return lines;
  }, [importData, policy, basicPay, holidays]);

  const confirmImport = () => {
    if (importData) {
      onImport({
        policy: importData.policy,
        appearance: importData.appearance || appearance,
        pdf: importData.pdf,
        basicPay: importData.basicPay || {},
        holidays: importData.holidays || []
      });
      setImportData(null);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-[12px] font-bold text-foreground mb-2">Backup & Restore</h3>
        <p className="text-[11px] text-muted-foreground mb-4">Backup your policies, basic pay records, and holidays to a JSON file.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleExport}
            className="flex flex-col items-center justify-center p-4 bg-muted/20 border border-border rounded-lg hover:bg-muted/50 transition-all group active:scale-95"
          >
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2 group-hover:scale-105 transition-transform">
              <Download size={18} />
            </div>
            <span className="text-[12px] font-bold text-foreground">Export Settings</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 text-center">Save to .json file</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 bg-muted/20 border border-border rounded-lg hover:bg-muted/50 transition-all group active:scale-95"
          >
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2 group-hover:scale-105 transition-transform">
              <Upload size={18} />
            </div>
            <span className="text-[12px] font-bold text-foreground">Import Settings</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 text-center">Load from .json file</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportSelect}
              accept=".json"
              className="hidden"
            />
          </button>

          <a
            href="/project-source.zip"
            download="overtime-manager-project.zip"
            className="flex flex-col items-center justify-center p-4 bg-muted/20 border border-border rounded-lg hover:bg-muted/50 transition-all group active:scale-95"
          >
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2 group-hover:scale-105 transition-transform">
              <FileArchive size={18} />
            </div>
            <span className="text-[12px] font-bold text-foreground">Project Source</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 text-center">Download project .zip</span>
          </a>
        </div>
      </section>

      {importError && (
        <div className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-[11px] flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{importError}</span>
        </div>
      )}

      {importData && (
        <CustomConfirmDialog
          title="Import Settings"
          message={
            `Backup version: ${importData.version || 'unknown'} · exported ${importData.timestamp ? new Date(importData.timestamp).toLocaleString() : 'unknown'}\n\n` +
            (diffSummary ? diffSummary.join('\n') : '') +
            '\n\nThis will overwrite all current settings.'
          }
          onConfirm={confirmImport}
          onCancel={() => setImportData(null)}
          confirmText="Import"
        />
      )}
    </div>
  );
}
