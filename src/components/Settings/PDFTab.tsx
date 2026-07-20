import React from 'react';
import { OTSettings } from '../../types';
import { NumberInput } from '../ui/NumberInput';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../../lib/utils';

interface PDFTabProps {
  pdf: OTSettings['pdf'];
  onChange: (pdf: OTSettings['pdf']) => void;
}

export function PDFTab({ pdf, onChange }: PDFTabProps) {
  const pageSizes = [
    { id: 'a4', label: 'A4', description: 'Standard A4 size (210 x 297mm).' },
    { id: 'letter', label: 'Letter', description: 'US Letter size (8.5 x 11").' },
    { id: 'legal', label: 'Legal', description: 'US Legal size (8.5 x 14").' },
  ];

  const currentSize = pageSizes.find(s => s.id === pdf.pageSize) || pageSizes[0];

  return (
    <div className="space-y-10">
      <section>
        <h3 className="text-lg font-bold text-foreground mb-6">Document Information</h3>
        <div className="space-y-6">
          <SettingRow title="Organization Name" description="The main title at the top of the PDF.">
            <Input type="text" value={pdf.headerTitle || ""} onChange={(e) => onChange({ ...pdf, headerTitle: e.target.value })} className="w-full sm:w-[200px]" placeholder="e.g. Organization Name" />
          </SettingRow>
          <SettingRow title="Branch / Region Name" description="The subtitle displayed below the header.">
            <Input type="text" value={pdf.branchName || ""} onChange={(e) => onChange({ ...pdf, branchName: e.target.value })} className="w-full sm:w-[200px]" placeholder="e.g. RHO Islamabad" />
          </SettingRow>
          <SettingRow title="Summary Subject" description="The subject line for the summary page.">
            <Input type="text" value={pdf.summarySubject || ""} onChange={(e) => onChange({ ...pdf, summarySubject: e.target.value })} className="w-full sm:w-[200px]" placeholder="e.g. Overtime summary..." />
          </SettingRow>
          <SettingRow title="Left Signature" description="Text for the left signature line.">
            <Input type="text" value={pdf.signatureLeft || ""} onChange={(e) => onChange({ ...pdf, signatureLeft: e.target.value })} className="w-full sm:w-[200px]" placeholder="e.g. Prepared By" />
          </SettingRow>
          <SettingRow title="Right Signature" description="Text for the right signature line.">
            <Input type="text" value={pdf.signatureRight || ""} onChange={(e) => onChange({ ...pdf, signatureRight: e.target.value })} className="w-full sm:w-[200px]" placeholder="e.g. Approved By" />
          </SettingRow>
          <SettingRow
            title="Summary Sort Order"
            description="Sort the summary page by employee designation instead of linearly."
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
        <h3 className="text-lg font-bold text-foreground mb-6">Page Layout</h3>

        <div className="space-y-6">
          <SettingRow
            title="Page Size"
            description={currentSize.description}
          >
            <div className="relative w-fit max-w-[200px]">
              <Select
                value={pdf.pageSize}
                onValueChange={(val) => onChange({ ...pdf, pageSize: val })}
              >
                <SelectTrigger>
                  <span className="truncate">
                    {pageSizes.find(s => s.id === pdf.pageSize)?.label || 'A4'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {pageSizes.map(size => (
                    <SelectItem key={size.id} value={size.id}>
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
        <h3 className="text-lg font-bold text-foreground mb-6">Typography & Spacing</h3>
        <div className="space-y-6">
          <SettingRow
            title="Table Font Size"
            description="Size of text inside PDF tables"
          >
            <NumberInput
              value={pdf.tableFontSize}
              onChange={(val) => onChange({ ...pdf, tableFontSize: val })}
              min={6}
              max={14}
              suffix="pt"
            />
          </SettingRow>

          <SettingRow
            title="Label Font Size"
            description="Size of employee details labels"
          >
            <NumberInput
              value={pdf.labelFontSize}
              onChange={(val) => onChange({ ...pdf, labelFontSize: val })}
              min={6}
              max={16}
              suffix="pt"
            />
          </SettingRow>

          <SettingRow
            title="Header Font Size"
            description="Size of section headers"
          >
            <NumberInput
              value={pdf.headerFontSize}
              onChange={(val) => onChange({ ...pdf, headerFontSize: val })}
              min={8}
              max={20}
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
              max={10}
              suffix="mm"
            />
          </SettingRow>
        </div>
      </section>
    </div>
  );
}

function SettingRow({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-row items-center justify-between gap-3 sm:gap-8">
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-base md:text-sm font-bold text-foreground truncate">{title}</h4>
        <p className="text-sm md:text-xs text-muted-foreground mt-1 leading-snug line-clamp-2 md:line-clamp-none">{description}</p>
      </div>
      <div className="shrink-0 flex items-center">
        {children}
      </div>
    </div>
  );
}
