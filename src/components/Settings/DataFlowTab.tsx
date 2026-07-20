import React, { useRef, useState } from 'react';
import { Download, Upload, AlertCircle } from 'lucide-react';
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
      } catch (err) {
        // use toast in a real app, here we might just reset if it fails silently since native alert is banned
        console.error('Failed to import settings:', err);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

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
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-bold text-foreground mb-4">Backup & Restore</h3>
        <p className="text-sm text-muted-foreground mb-6">Backup your policies, basic pay records, and holidays to a JSON file.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleExport}
            className="flex flex-col items-center justify-center p-6 bg-muted/20 border border-border rounded-lg hover:bg-muted/50 transition-all group active:scale-95"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
              <Download size={24} />
            </div>
            <span className="text-base md:text-sm font-bold text-foreground">Export Settings</span>
            <span className="text-xs text-muted-foreground mt-1 text-center">Save to .json file</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 bg-muted/20 border border-border rounded-lg hover:bg-muted/50 transition-all group active:scale-95"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <span className="text-base md:text-sm font-bold text-foreground">Import Settings</span>
            <span className="text-xs text-muted-foreground mt-1 text-center">Load from .json file</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportSelect}
              accept=".json"
              className="hidden"
            />
          </button>
        </div>
      </section>

      {importData && (
        <CustomConfirmDialog
          title="Import Settings"
          message="This will overwrite all current settings. Are you sure?"
          onConfirm={confirmImport}
          onCancel={() => setImportData(null)}
          confirmText="Import"
        />
      )}
    </div>
  );
}
