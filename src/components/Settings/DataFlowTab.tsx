import React, { useRef } from 'react';
import { Download, Upload, Trash2, AlertCircle } from 'lucide-react';
import { OTSettings, Holiday } from '../../types';

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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.policy || !json.appearance || !json.pdf) {
          throw new Error('Invalid settings file format.');
        }
        if (confirm('This will overwrite all current settings. Are you sure?')) {
          onImport({
            policy: json.policy,
            appearance: json.appearance,
            pdf: json.pdf,
            basicPay: json.basicPay || {},
            holidays: json.holidays || []
          });
        }
      } catch (err) {
        alert('Failed to import settings: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to clear ALL data and settings? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-md font-bold text-muted mb-4">Backup & Restore</h3>
        <p className="text-sm text-muted mb-6">Backup your policies, appearance preferences, basic pay records, and holidays to a JSON file.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleExport}
            className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all group btn-click"
          >
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-3 group-hover:scale-110 transition-transform">
              <Download size={24} />
            </div>
            <span className="text-sm font-bold text-white">Export Settings</span>
            <span className="text-xs text-muted mt-1 text-center">Save to .json file</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all group btn-click"
          >
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-3 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <span className="text-sm font-bold text-white">Import Settings</span>
            <span className="text-xs text-muted mt-1 text-center">Load from .json file</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".json"
              className="hidden"
            />
          </button>
        </div>
      </section>

      <div className="h-px bg-white/5" />

      <section>
        <h3 className="text-md font-bold text-red-400 mb-4 flex items-center gap-2">
          <AlertCircle size={18} />
          Danger Zone
        </h3>
        <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">Reset Application</h4>
              <p className="text-xs text-muted mt-1">Clears all settings and data from local storage.</p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
            >
              <Trash2 size={14} />
              Reset All
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
