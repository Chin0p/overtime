import { useMemo, useState } from 'react';
import { OTSettings, EmployeeRow } from '../../types';
import { NumberInput } from '../ui/NumberInput';
import { Switch } from '../ui/switch';
import { SUMMARY_SORT_OPTIONS, SummarySort, defaultSortDir } from '../../pdf/summarySort';
import { SettingRow } from './SettingRow';
import { SettingsSection } from './SettingsSection';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';
import { AlertTriangle, ChevronLeft, ChevronRight, Search, FileText } from 'lucide-react';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';

interface PDFTabProps {
  pdf: OTSettings['pdf'];
  employees: EmployeeRow[];
  onChange: (pdf: OTSettings['pdf']) => void;
}

export function PDFTab({ pdf, employees, onChange }: PDFTabProps) {
  const [view, setView] = useState<'main' | 'designations'>('main');

  const pageSizes = [
    { id: 'a4', label: 'A4', description: 'Standard A4 size (210 x 297mm).' },
    { id: 'letter', label: 'Letter', description: 'US Letter size (8.5 x 11").' },
    { id: 'legal', label: 'Legal', description: 'US Legal size (8.5 x 14").' },
  ];

  const currentSize = pageSizes.find(s => s.id === pdf.pageSize) || pageSizes[0];
  const excluded = pdf.pdfExcludedDesignations || [];

  // designation -> number of employees
  const designationCounts = useMemo(() => {
    const m = new Map<string, number>();
    employees.forEach(e => {
      if (e.designation) m.set(e.designation, (m.get(e.designation) || 0) + 1);
    });
    return m;
  }, [employees]);

  const uniqueDesignations = useMemo(
    () => Array.from(designationCounts.keys()).sort(),
    [designationCounts]
  );

  const setExcluded = (next: string[]) => onChange({ ...pdf, pdfExcludedDesignations: next });

  if (view === 'designations') {
    return (
      <DesignationManager
        designations={uniqueDesignations}
        counts={designationCounts}
        excluded={excluded}
        onChange={setExcluded}
        onBack={() => setView('main')}
      />
    );
  }

  const excludedCount = uniqueDesignations.filter(d => excluded.includes(d)).length;
  const excludedPeople = uniqueDesignations
    .filter(d => excluded.includes(d))
    .reduce((n, d) => n + (designationCounts.get(d) || 0), 0);
  const allExcluded = uniqueDesignations.length > 0 && excludedCount === uniqueDesignations.length;

  return (
    <div className="absolute inset-0 overflow-y-auto bg-muted/25 p-4 sm:p-6">
    <div className="space-y-6 max-w-3xl mx-auto">
      <SettingsSection title="Summary Options">
          <SettingRow
            title="Summary Sort Order"
            description="What the summary page is ordered by."
          >
            <div className="w-36">
              <Select
                value={pdf.summarySort ?? 'designation'}
                onValueChange={(val) => {
                  const sort = val as SummarySort;
                  // Switching the field picks that field's natural direction; it can still be flipped below.
                  onChange({ ...pdf, summarySort: sort, summarySortDir: defaultSortDir(sort) });
                }}
              >
                <SelectTrigger className="w-full text-ui">
                  <span className="truncate">
                    {SUMMARY_SORT_OPTIONS.find((o) => o.value === (pdf.summarySort ?? 'designation'))?.label}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {SUMMARY_SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-ui">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SettingRow>
          <SettingRow title="Order" description="Smallest to largest, or largest to smallest.">
            <div className="w-36">
              <Select
                value={pdf.summarySortDir ?? 'asc'}
                onValueChange={(val) => onChange({ ...pdf, summarySortDir: val as 'asc' | 'desc' })}
              >
                <SelectTrigger className="w-full text-ui">
                  <span className="truncate">{(pdf.summarySortDir ?? 'asc') === 'asc' ? 'Ascending' : 'Descending'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc" className="text-ui">Ascending</SelectItem>
                  <SelectItem value="desc" className="text-ui">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SettingRow>
      </SettingsSection>

      <SettingsSection title="Designations in PDF" description="Choose which designations appear in the exported report.">
        <div>
        <button
          type="button"
          disabled={uniqueDesignations.length === 0}
          onClick={() => setView('designations')}
          className={cn(
            'w-full text-left flex items-center gap-3 p-3 rounded-lg border bg-muted/10 transition-colors',
            'hover:bg-muted/30 hover:border-primary/40 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-muted/10 disabled:hover:border-border',
            allExcluded ? 'border-[var(--color-warning)]/40' : 'border-border',
          )}
        >
          <div className="size-9 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <FileText size={16} />
          </div>
          <div className="flex-1 min-w-0">
            {uniqueDesignations.length === 0 ? (
              <p className="text-ui text-muted-foreground">Upload a file to see its designations.</p>
            ) : (
              <>
                <p className="text-ui font-semibold text-foreground">
                  {excludedCount === 0
                    ? 'All designations included'
                    : `${uniqueDesignations.length - excludedCount} of ${uniqueDesignations.length} designations included`}
                </p>
                <p className="text-caption text-muted-foreground mt-0.5 truncate">
                  {excludedCount === 0
                    ? `${employees.length} employees will be in the report`
                    : `Hiding ${excludedCount} (${excludedPeople} employee${excludedPeople === 1 ? '' : 's'}): ${excluded
                        .filter(d => designationCounts.has(d))
                        .join(', ')}`}
                </p>
              </>
            )}
          </div>
          {uniqueDesignations.length > 0 && (
            <span className="shrink-0 flex items-center gap-0.5 text-caption font-medium text-primary">
              Manage
              <ChevronRight size={14} />
            </span>
          )}
        </button>

        {allExcluded && (
          <div className="mt-2 p-2.5 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-light)] text-caption flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 text-[var(--color-warning)] mt-0.5" />
            <span className="text-[var(--color-warning)]">
              <strong>All designations are excluded.</strong> The PDF will have no pages.
            </span>
          </div>
        )}
        </div>
      </SettingsSection>

      <SettingsSection title="Page Layout">
          <SettingRow
            title="Page Size"
            description={currentSize.description}
          >
            <div className="w-28">
              <Select
                value={pdf.pageSize}
                onValueChange={(val) => onChange({ ...pdf, pageSize: val })}
              >
                <SelectTrigger className="w-full text-ui">
                  <span className="truncate">
                    {pageSizes.find(s => s.id === pdf.pageSize)?.label || 'A4'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {pageSizes.map(size => (
                    <SelectItem key={size.id} value={size.id} className="text-ui">
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SettingRow>

          <SettingRow
            title="Margin Size"
            description="Page margins in millimeters"
          >
            <NumberInput
              value={pdf.margin}
              onChange={(val) => onChange({ ...pdf, margin: val })}
              min={5}
              max={50}
              suffix="mm"
            />
          </SettingRow>
      </SettingsSection>

      <SettingsSection title="Typography & Spacing">
          <SettingRow
            title="Table Font Size"
            description="Size of text inside PDF tables"
          >
            <NumberInput
              value={pdf.tableFontSize}
              onChange={(val) => onChange({ ...pdf, tableFontSize: val })}
              min={6}
              max={12}
              suffix="pt"
            />
          </SettingRow>

          <SettingRow
            title="Cell Padding"
            description="Internal spacing for table cells"
          >
            <NumberInput
              value={pdf.cellPadding}
              onChange={(val) => onChange({ ...pdf, cellPadding: val })}
              min={1}
              max={6}
              suffix="mm"
            />
          </SettingRow>
      </SettingsSection>
    </div>
    </div>
  );
}

/** Full-tab "drill-in" view for choosing which designations go into the PDF. */
function DesignationManager({
  designations,
  counts,
  excluded,
  onChange,
  onBack,
}: {
  designations: string[];
  counts: Map<string, number>;
  excluded: string[];
  onChange: (next: string[]) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const shown = designations.filter(d => d.toLowerCase().includes(query.trim().toLowerCase()));
  const includedCount = designations.filter(d => !excluded.includes(d)).length;
  const allExcluded = includedCount === 0;

  const toggle = (d: string) =>
    onChange(excluded.includes(d) ? excluded.filter(x => x !== d) : [...excluded, d]);
  // "Include all"/"Exclude all" act on what is currently shown (so they respect search).
  const includeShown = () => onChange(excluded.filter(d => !shown.includes(d)));
  const excludeShown = () => onChange(Array.from(new Set([...excluded, ...shown])));

  return (
    <div className="absolute inset-0 flex flex-col bg-card">
      {/* The pane gives this view all of its space (no padding). The header is a fixed block and only
          the list below it scrolls, so nothing can ever show through above or around the header. */}
      <div className="shrink-0 z-20 bg-card border-b border-border px-3 sm:px-5 pt-3 pb-3 space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="size-8 -ml-1.5 shrink-0 flex items-center justify-center rounded-[var(--radius-interactive)] hover:bg-muted"
            aria-label="Back to PDF settings"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="text-body font-bold text-foreground leading-tight">Designations in PDF</h3>
            <p className="text-caption text-muted-foreground leading-tight mt-0.5">
              Switch off a designation to leave it out of the report.
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 px-2 py-1 rounded-full text-micro font-semibold border',
              allExcluded
                ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[var(--color-warning)]/30'
                : 'bg-primary/10 text-primary border-primary/20',
            )}
          >
            {includedCount} / {designations.length} included
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={13} />
            <Input
              type="text"
              placeholder="Search designations..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-8 text-ui h-8 w-full"
            />
          </div>
          <button type="button" onClick={includeShown} className="shrink-0 h-8 px-2.5 rounded-lg border border-border text-caption font-medium hover:bg-muted">
            Include all
          </button>
          <button type="button" onClick={excludeShown} className="shrink-0 h-8 px-2.5 rounded-lg border border-border text-caption font-medium hover:bg-muted">
            Exclude all
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      {allExcluded && (
        <div className="mx-3 sm:mx-5 mt-3 p-2.5 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-light)] text-caption flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 text-[var(--color-warning)] mt-0.5" />
          <span className="text-[var(--color-warning)]">
            <strong>Everything is excluded.</strong> The PDF will have no pages.
          </span>
        </div>
      )}

      <ul className="px-3 sm:px-5 py-3 space-y-1.5">
        {shown.length === 0 && (
          <li className="text-center py-10 text-muted-foreground text-caption border-2 border-dashed border-border rounded-lg select-none">
            No designations match “{query}”
          </li>
        )}
        {shown.map(d => {
          const included = !excluded.includes(d);
          const n = counts.get(d) || 0;
          return (
            <li key={d}>
              <label
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer select-none transition-colors',
                  included ? 'bg-card border-border hover:bg-muted/30' : 'bg-muted/20 border-border/60 hover:bg-muted/40',
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn('text-ui font-medium truncate', included ? 'text-foreground' : 'text-muted-foreground line-through decoration-muted-foreground/40')}>
                    {d}
                  </p>
                  <p className="text-micro text-muted-foreground mt-0.5">
                    {n} employee{n === 1 ? '' : 's'}
                    {!included && ' · hidden from PDF'}
                  </p>
                </div>
                <Switch checked={included} onCheckedChange={() => toggle(d)} />
              </label>
            </li>
          );
        })}
      </ul>
      </div>
    </div>
  );
}
