import { OTSettings } from '../../types';
import { NumberInput } from '../ui/NumberInput';

interface PDFTabProps {
  pdf: OTSettings['pdf'];
  onChange: (pdf: OTSettings['pdf']) => void;
}

export function PDFTab({ pdf, onChange }: PDFTabProps) {
  const pageSizes = [
    { id: 'a4', label: 'A4', description: 'Standard A4 size (210 x 297mm). Typical margins: 15-20mm.' },
    { id: 'letter', label: 'letter', description: 'US Letter size (8.5 x 11"). Standard margins: 25.4mm (1").' },
    { id: 'legal', label: 'legal', description: 'US Legal size (8.5 x 14"). Standard margins: 25.4mm (1").' },
  ];

  const currentSize = pageSizes.find(s => s.id === pdf.pageSize) || pageSizes[0];

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-md font-bold text-muted mb-4">Page Layout</h3>
        <div className="bg-accent/5 border border-accent/10 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center shrink-0 text-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Smart Fit Enabled</h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                The settings below are your <strong>preferred maximums</strong>. If a month has many entries, the app will automatically scale them down to ensure everything fits on a single page.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-8">
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Page Size</div>
              <div className="text-xs text-muted mt-0.5">{currentSize.description}</div>
            </div>
            <div className="relative flex items-center w-full sm:w-24 shrink-0">
              <select
                value={pdf.pageSize}
                onChange={(e) => onChange({ ...pdf, pageSize: e.target.value })}
                className="w-full pl-3 pr-8 py-1.5 bg-background border border-white/10 rounded-lg text-sm text-white appearance-none focus:ring-2 focus:ring-white/20 focus:border-white/30 outline-none transition-all"
              >
                {pageSizes.map(size => (
                  <option key={size.id} value={size.id} className="bg-surface text-white">
                    {size.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 pointer-events-none text-muted-dim">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-8">
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Margin Size</div>
              <div className="text-xs text-muted mt-0.5">Page margins in millimeters</div>
            </div>
            <div className="shrink-0">
              <NumberInput
                value={pdf.margin}
                onChange={(val) => onChange({ ...pdf, margin: val })}
                min={5}
                max={50}
                suffix="mm"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-white/5" />

      <section>
        <h3 className="text-md font-bold text-muted mb-4">Typography & Spacing</h3>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-8">
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Table Font Size</div>
              <div className="text-xs text-muted mt-0.5">Size of text inside PDF tables</div>
            </div>
            <div className="shrink-0">
              <NumberInput
                value={pdf.tableFontSize}
                onChange={(val) => onChange({ ...pdf, tableFontSize: val })}
                min={6}
                max={14}
                suffix="pt"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-8">
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Label Font Size</div>
              <div className="text-xs text-muted mt-0.5">Size of employee details labels</div>
            </div>
            <div className="shrink-0">
              <NumberInput
                value={pdf.labelFontSize}
                onChange={(val) => onChange({ ...pdf, labelFontSize: val })}
                min={6}
                max={16}
                suffix="pt"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-8">
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Header Font Size</div>
              <div className="text-xs text-muted mt-0.5">Size of section headers</div>
            </div>
            <div className="shrink-0">
              <NumberInput
                value={pdf.headerFontSize}
                onChange={(val) => onChange({ ...pdf, headerFontSize: val })}
                min={8}
                max={20}
                suffix="pt"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-8">
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Cell Padding</div>
              <div className="text-xs text-muted mt-0.5">Internal spacing for table cells</div>
            </div>
            <div className="shrink-0">
              <NumberInput
                value={pdf.cellPadding}
                onChange={(val) => onChange({ ...pdf, cellPadding: val })}
                min={1}
                max={10}
                suffix="mm"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
