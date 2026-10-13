import { useMemo, useState } from 'react';
import { OTSettings, EmployeeRow } from '../../types';
import { NumberInput } from '../ui/NumberInput';
import { Switch } from '../ui/switch';
import { SUMMARY_SORT_OPTIONS, SummarySort, defaultSortDir } from '../../pdf/summarySort';
import { SettingRow } from './SettingRow';
import { SettingsSection } from './SettingsSection';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Notice } from '../ui/notice';
import { Button } from '../ui/button';
import { SegmentedControl } from './employeeShared';
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
      <SettingsSection title="Summary page">
          <SettingRow
            title="Sort by"
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
            <SegmentedControl
              label="Order"
              value={pdf.summarySortDir ?? 'asc'}
              options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]}
              onChange={(val) => onChange({ ...pdf, summarySortDir: val })}
            />
          </SettingRow>
      </SettingsSection>

      <SettingsSection title="Designations" description="Choose which designations appear in the exported report.">
        <SettingRow
          title={
            uniqueDesignations.length === 0
              ? 'No designations yet'
              : excludedCount === 0
                ? 'All designations included'
                : `${uniqueDesignations.length - excludedCount} of ${uniqueDesignations.length} designations included`
          }
          description={
            uniqueDesignations.length === 0
              ? 'Load an attendance file to see its designations.'
              : excludedCount === 0
                ? `${employees.length} employees will be in the report.`
                : `Hiding ${excludedCount} (${excludedPeople} employee${excludedPeople === 1 ? '' : 's'}): ${excluded
                    .filter(d => designationCounts.has(d))
                    .join(', ')}`
          }
          preview={
            allExcluded && (
              <Notice tone="warning">
                <strong>All designations are excluded.</strong> The PDF will have no pages.
              </Notice>
            )
          }
        >
          <Button
            variant="outline"
            size="sm"
            disabled={uniqueDesignations.length === 0}
            onClick={() => setView('designations')}
          >
            Manage <ChevronRight size={14} />
          </Button>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Page layout">
          <SettingRow
            title="Page size"
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
            title="Margins"
            description="Page margins in millimeters."
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

      <SettingsSection title="Typography & spacing">
          <SettingRow
            title="Table font size"
            description="Size of text inside PDF tables."
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
            title="Cell padding"
            description="Space inside table cells."
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
            <h3 className="text-body font-bold text-foreground leading-tight">Designations</h3>
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
              placeholder="Search designations…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-8 text-ui h-8 w-full"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={includeShown} className="shrink-0">
            Include all
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={excludeShown} className="shrink-0">
            Exclude all
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      {allExcluded && (
        <Notice tone="warning" className="mx-3 sm:mx-5 mt-3">
          <strong>All designations are excluded.</strong> The PDF will have no pages.
        </Notice>
      )}

      <ul className="px-3 sm:px-5 py-1 divide-y divide-border">
        {shown.length === 0 && (
          <li className="text-center py-10 text-muted-foreground text-caption select-none">
            No designations match “{query}”
          </li>
        )}
        {shown.map(d => {
          const included = !excluded.includes(d);
          const n = counts.get(d) || 0;
          return (
            <li key={d}>
              <label
                className="flex items-center gap-3 py-2.5 cursor-pointer select-none"
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
