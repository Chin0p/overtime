import { useMemo, useState } from 'react';
import { OTSettings, EmployeeRow } from '../../types';
import { NumberInput } from '../ui/NumberInput';
import { Switch } from '../ui/switch';
import { SettingRow } from './SettingRow';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PDFTabProps {
  pdf: OTSettings['pdf'];
  employees: EmployeeRow[];
  onChange: (pdf: OTSettings['pdf']) => void;
}

export function PDFTab({ pdf, employees, onChange }: PDFTabProps) {
  const [excludedExpanded, setExcludedExpanded] = useState(false);

  const pageSizes = [
    { id: 'a4', label: 'A4', description: 'Standard A4 size (210 x 297mm).' },
    { id: 'letter', label: 'Letter', description: 'US Letter size (8.5 x 11").' },
    { id: 'legal', label: 'Legal', description: 'US Legal size (8.5 x 14").' },
  ];

  const currentSize = pageSizes.find(s => s.id === pdf.pageSize) || pageSizes[0];
  const excluded = pdf.pdfExcludedDesignations || [];

  const uniqueDesignations = useMemo(
    () => Array.from(new Set(employees.map(e => e.designation))).filter(Boolean).sort(),
    [employees]
  );

  const toggleDesignation = (designation: string) => {
    const next = excluded.includes(designation)
      ? excluded.filter(d => d !== designation)
      : [...excluded, designation];
    onChange({ ...pdf, pdfExcludedDesignations: next });
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-[12px] font-bold text-foreground mb-4">Summary Options</h3>
        <div className="space-y-4">
          <SettingRow
            title="Summary Sort Order"
            description="Sort the summary page by employee designation instead of amount."
          >
            <Switch
              checked={pdf.sortByDesignation ?? true}
              onCheckedChange={(checked) => onChange({ ...pdf, sortByDesignation: checked })}
            />
          </SettingRow>
        </div>
      </section>

      <div className="h-px bg-border" />

      <section>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[12px] font-bold text-foreground">Excluded Designations</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {uniqueDesignations.length === 0
                ? 'Upload a file to see available designations.'
                : excluded.length === 0
                  ? 'All designations included in PDF.'
                  : `${excluded.length} of ${uniqueDesignations.length} excluded from PDF.`}
            </p>
          </div>
          {uniqueDesignations.length > 0 && (
            <button
              type="button"
              onClick={() => setExcludedExpanded(v => !v)}
              className="shrink-0 px-2.5 py-1 rounded text-[11px] font-medium border border-border bg-card hover:bg-muted flex items-center gap-1"
            >
              {excludedExpanded ? 'Hide' : 'Manage'}
              <ChevronDown
                size={12}
                className={cn("transition-transform", excludedExpanded && "rotate-180")}
              />
            </button>
          )}
        </div>

        {uniqueDesignations.length > 0 && excluded.length === uniqueDesignations.length && (
          <div className="mt-2 p-2.5 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-light)] text-[11px] flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 text-[var(--color-warning)] mt-0.5" />
            <span className="text-[var(--color-warning)]">
              <strong>All designations are excluded.</strong> The PDF will have no pages.
            </span>
          </div>
        )}

        {excludedExpanded && uniqueDesignations.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {uniqueDesignations.map(designation => {
              const included = !excluded.includes(designation);
              return (
                <label
                  key={designation}
                  className="flex items-center gap-3 p-2.5 bg-muted/20 border border-border rounded-lg cursor-pointer hover:bg-muted/40 transition-colors select-none"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border focus:ring-ring"
                    checked={included}
                    onChange={() => toggleDesignation(designation)}
                  />
                  <span className="text-[12px] font-medium text-foreground flex-1 truncate">
                    {designation}
                  </span>
                  <span className={cn(
                    "shrink-0 text-[10px] font-semibold uppercase tracking-wide",
                    included ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                  )}>
                    {included ? 'Included' : 'Excluded'}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </section>

      <div className="h-px bg-border" />

      <section>
        <h3 className="text-[12px] font-bold text-foreground mb-4">Page Layout</h3>

        <div className="space-y-4">
          <SettingRow
            title="Page Size"
            description={currentSize.description}
          >
            <div className="w-28">
              <Select
                value={pdf.pageSize}
                onValueChange={(val) => onChange({ ...pdf, pageSize: val })}
              >
                <SelectTrigger className="w-full text-[12px]">
                  <span className="truncate">
                    {pageSizes.find(s => s.id === pdf.pageSize)?.label || 'A4'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {pageSizes.map(size => (
                    <SelectItem key={size.id} value={size.id} className="text-[12px]">
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
        </div>
      </section>

      <div className="h-px bg-border" />

      <section>
        <h3 className="text-[12px] font-bold text-foreground mb-4">Typography & Spacing</h3>
        <div className="space-y-4">
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
        </div>
      </section>
    </div>
  );
}
