import { Check } from 'lucide-react';
import { OTSettings, ColumnId } from '../../types';
import { cn } from '../../lib/utils';
import { NumberInput } from '../ui/NumberInput';

interface AppearanceTabProps {
  appearance: OTSettings['appearance'];
  onChange: (appearance: OTSettings['appearance']) => void;
}

export function AppearanceTab({ appearance, onChange }: AppearanceTabProps) {
  const columns: ColumnId[] = ['Worked (OT)', 'Adjustment', 'Office Timing', 'Total Hours Worked'];
  
  const toggleColumn = (id: ColumnId) => {
    const current = new Set(appearance.visibleColumns);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    onChange({
      ...appearance,
      visibleColumns: Array.from(current)
    });
  };

  return (
    <div className="space-y-8">
      {/* Accent Color Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-md font-bold text-muted">Accent Color</h3>
            <p className="text-sm text-muted mt-1">Choose a primary color for buttons and highlights.</p>
          </div>
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg border border-white/10 shadow-inner"
              style={{ backgroundColor: appearance.accentColor }}
            />
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim text-xs font-mono">#</span>
              <input
                type="text"
                value={appearance.accentColor.replace('#', '')}
                onChange={(e) => {
                  const val = e.target.value.replace('#', '');
                  if (val.length <= 6) {
                    onChange({ ...appearance, accentColor: `#${val}` });
                  }
                }}
                className="w-full pl-6 pr-3 py-1.5 bg-background border border-white/10 rounded-lg text-xs text-white font-mono focus:ring-2 focus:ring-white/20 focus:border-white/30 outline-none transition-all"
                placeholder="FFFFFF"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-white/5" />

      {/* Table Columns Section */}
      <section>
        <h3 className="text-md font-bold text-muted mb-4">Table Columns</h3>
        <p className="text-xs text-muted mb-4">Select which optional columns should be visible in the records table.</p>
        <div className="grid grid-cols-2 gap-2">
          {columns.map(id => {
            const isVisible = appearance.visibleColumns.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleColumn(id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border text-left",
                  isVisible 
                    ? "bg-white/5 border-white/20 text-white" 
                    : "bg-surface-hover/50 border-white/5 text-muted hover:bg-surface-hover"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                  isVisible ? "bg-accent border-accent" : "border-white/20"
                )}>
                  {isVisible && <Check size={10} className="text-black" />}
                </div>
                <span className="text-sm font-medium">{id}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
