import { OTSettings } from '../../types';

interface AppearanceTabProps {
  appearance: OTSettings['appearance'];
  onChange: (appearance: OTSettings['appearance']) => void;
}

export function AppearanceTab({ appearance, onChange }: AppearanceTabProps) {
  return (
    <div className="space-y-8">
      {/* Accent Color Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
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
    </div>
  );
}
