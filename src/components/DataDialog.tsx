import React, { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Undo2 } from 'lucide-react';
import { AttendanceData } from '../types';
import { buildRecordsTemplate, parseRecordsCSV } from '../parser/csvParser';
import { mergeRecords } from '../parser/mergeRecords';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

interface AddSummary {
  addedEmployees: number;
  updatedEmployees: number;
  days: number;
}

interface DataDialogProps {
  /** The attendance data that is loaded right now. */
  current: AttendanceData;
  monthLabel: string;
  shiftDurationHours: number;
  canUndo: boolean;
  onApply: (incoming: AttendanceData) => AddSummary;
  onUndo: () => void;
  onClose: () => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Add employee records from a CSV to the data that is loaded now.
 * Steps: pick a file → preview (counts + every skipped cell) → done (with Undo).
 * Mount it only while open so its state resets each time.
 */
export function DataDialog({ current, monthLabel, shiftDurationHours, canUndo, onApply, onUndo, onClose }: DataDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<{ data: AttendanceData; fileName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AddSummary | null>(null);

  const preview = useMemo(() => (parsed ? mergeRecords(current, parsed.data) : null), [parsed, current]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => setError('The file could not be read.');
    reader.onload = (ev) => {
      try {
        setParsed({ data: parseRecordsCSV(String(ev.target?.result ?? ''), shiftDurationHours), fileName: file.name });
        setError(null);
      } catch (err) {
        setParsed(null);
        setError(err instanceof Error ? err.message : 'Failed to read the CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildRecordsTemplate(current.dates)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'records-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const warnings = parsed?.data.warnings ?? [];
  const incoming = parsed?.data.employees ?? [];
  const known = new Set(current.employees.map((e) => e.erp));
  const fresh = incoming.filter((e) => !known.has(e.erp));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add employee records</DialogTitle>
          <DialogDescription className="text-left text-caption">
            {monthLabel ? `${monthLabel} · ` : ''}
            {plural(current.employees.length, 'employee')} · {plural(current.dates.length, 'day')} loaded
          </DialogDescription>
        </DialogHeader>

        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />

        {result ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-caption flex items-start gap-2">
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              <span>
                Added {plural(result.addedEmployees, 'new employee')}, updated {result.updatedEmployees}.
                Category and basic pay can be set in Settings.
              </span>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              {canUndo && (
                <Button variant="outline" onClick={() => { onUndo(); onClose(); }}>
                  <Undo2 size={14} /> Undo
                </Button>
              )}
              <Button onClick={onClose}>Close</Button>
            </DialogFooter>
          </div>
        ) : parsed && preview ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-border bg-muted/30 text-caption space-y-1">
              <div className="font-semibold text-foreground">{parsed.fileName}</div>
              <div>
                {plural(incoming.length, 'employee')} · {plural(preview.days, 'day')} of records
              </div>
              {fresh.length > 0 && (
                <div>
                  New: {fresh.slice(0, 4).map((e) => e.name).join(', ')}
                  {fresh.length > 4 ? ` +${fresh.length - 4} more` : ''}
                </div>
              )}
              {incoming.length - fresh.length > 0 && (
                <div className="text-muted-foreground">
                  Already loaded: {incoming.length - fresh.length} (matching dates are replaced, other days are kept)
                </div>
              )}
            </div>

            {warnings.length > 0 && (
              <div className="rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-light)] p-3 text-caption">
                <div className="flex items-center gap-1.5 font-semibold text-[var(--color-warning)] mb-1">
                  <AlertCircle size={14} /> {plural(warnings.length, 'cell')} skipped
                </div>
                <ul className="max-h-40 overflow-y-auto space-y-0.5 text-foreground/80 list-disc pl-4">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setParsed(null)}>Back</Button>
              <Button
                onClick={() => {
                  setResult(onApply(parsed.data));
                }}
              >
                Add records
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-caption flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <p className="text-caption text-muted-foreground">
              Missing someone from the attendance file? Add them from a CSV. They are added to the data loaded now
              and are gone when you load a different file.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button onClick={() => inputRef.current?.click()}>
                <FileSpreadsheet size={14} /> Choose CSV
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download size={14} /> Download template
              </Button>
            </div>
            <details className="text-caption text-muted-foreground">
              <summary className="cursor-pointer select-none text-foreground">Format</summary>
              <div className="mt-1.5 space-y-1">
                <p>
                  Header <code className="font-mono">erp,name,designation</code> then one column per date
                  (<code className="font-mono">dd-mm-yyyy</code>). Each day is{' '}
                  <code className="font-mono">HHMM:HHMM</code> (In:Out); leave it empty for no attendance.
                </p>
                <pre className="font-mono bg-muted/40 border border-border rounded-md p-2 overflow-x-auto">
{`erp,name,designation,01-08-2026,02-08-2026
4747,tariq butt,electrician,0800:1600,0800:1830`}
                </pre>
              </div>
            </details>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
