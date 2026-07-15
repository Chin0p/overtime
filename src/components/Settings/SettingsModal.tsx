import React, { useState } from 'react';
import { X, Settings, CreditCard, Calendar, Palette, FileText, Database } from 'lucide-react';
import { OTSettings, Holiday, EmployeeRow } from '../../types';
import { CalculationTab } from './CalculationTab';
import { BasicPayTab } from './BasicPayTab';
import { HolidaysTab } from './HolidaysTab';
import { AppearanceTab } from './AppearanceTab';
import { PDFTab } from './PDFTab';
import { DataFlowTab } from './DataFlowTab';
import { cn } from '../../lib/utils';

interface SettingsModalProps {
  policy: OTSettings['policy'];
  appearance: OTSettings['appearance'];
  pdf: OTSettings['pdf'];
  basicPay: Record<string, number>;
  holidays: Holiday[];
  employees: EmployeeRow[];
  onSave: (policy: OTSettings['policy'], appearance: OTSettings['appearance'], pdf: OTSettings['pdf'], basicPay: Record<string, number>, holidays: Holiday[]) => void;
  onClose: () => void;
}

export function SettingsModal({ policy, appearance, pdf, basicPay, holidays, employees, onSave, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'calculation' | 'basic-pay' | 'holidays' | 'appearance' | 'pdf' | 'data'>('calculation');
  
  const [tempPolicy, setTempPolicy] = useState(policy);
  const [tempAppearance, setTempAppearance] = useState(appearance);
  const [tempPdf, setTempPdf] = useState(pdf);
  const [tempBasicPay, setTempBasicPay] = useState(basicPay);
  const [tempHolidays, setTempHolidays] = useState(holidays);

  const handleSave = () => {
    onSave(tempPolicy, tempAppearance, tempPdf, tempBasicPay, tempHolidays);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-[720px] h-full max-h-[85vh] md:h-[540px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/5 animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-full transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <aside className="md:w-48 border-b md:border-b-0 md:border-r border-white/5 bg-background/50 p-3 md:p-4 shrink-0 overflow-x-auto no-scrollbar">
            <nav className="flex md:block flex-row space-x-2 md:space-x-0 md:space-y-1 w-max md:w-auto">
              <TabButton 
                active={activeTab === 'calculation'} 
                onClick={() => setActiveTab('calculation')}
                icon={<Settings size={18} />}
                label="Calculation"
              />
              <TabButton 
                active={activeTab === 'basic-pay'} 
                onClick={() => setActiveTab('basic-pay')}
                icon={<CreditCard size={18} />}
                label="Basic pay"
              />
              <TabButton 
                active={activeTab === 'holidays'} 
                onClick={() => setActiveTab('holidays')}
                icon={<Calendar size={18} />}
                label="Holidays"
              />
              <TabButton 
                active={activeTab === 'appearance'} 
                onClick={() => setActiveTab('appearance')}
                icon={<Palette size={18} />}
                label="Appearance"
              />
              <TabButton 
                active={activeTab === 'pdf'} 
                onClick={() => setActiveTab('pdf')}
                icon={<FileText size={18} />}
                label="PDF Export"
              />
              <TabButton 
                active={activeTab === 'data'} 
                onClick={() => setActiveTab('data')}
                icon={<Database size={18} />}
                label="Backup / Reset"
              />
            </nav>
          </aside>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-surface">
            {activeTab === 'calculation' && (
              <CalculationTab policy={tempPolicy} onChange={setTempPolicy} />
            )}
            {activeTab === 'basic-pay' && (
              <BasicPayTab 
                basicPay={tempBasicPay} 
                employees={employees} 
                supportDesignations={tempPolicy.support.designations}
                onChange={setTempBasicPay} 
              />
            )}
            {activeTab === 'holidays' && (
              <HolidaysTab holidays={tempHolidays} onChange={setTempHolidays} />
            )}
            {activeTab === 'appearance' && (
              <AppearanceTab appearance={tempAppearance} onChange={setTempAppearance} />
            )}
            {activeTab === 'pdf' && (
              <PDFTab pdf={tempPdf} onChange={setTempPdf} />
            )}
            {activeTab === 'data' && (
              <DataFlowTab 
                policy={tempPolicy}
                appearance={tempAppearance}
                pdf={tempPdf}
                basicPay={tempBasicPay}
                holidays={tempHolidays}
                onImport={(data) => {
                  setTempPolicy(data.policy);
                  setTempAppearance(data.appearance);
                  setTempPdf(data.pdf);
                  setTempBasicPay(data.basicPay);
                  setTempHolidays(data.holidays);
                }}
              />
            )}
          </main>
        </div>

        <div className="px-6 py-4 bg-background/50 border-t border-white/5 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-muted hover:text-white hover:bg-black/10 border border-white/10 rounded-lg transition-colors btn-click"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-1.5 text-sm font-medium text-black bg-accent hover:bg-accent-hover active:bg-accent-active rounded-lg btn-click transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-auto md:w-full flex items-center justify-center md:justify-start whitespace-nowrap gap-2 md:gap-3 px-4 py-2 md:py-2.5 rounded-xl text-sm font-bold transition-all btn-click shrink-0",
        active 
          ? "bg-surface-hover text-white shadow-sm ring-1 ring-white/10" 
          : "text-muted-dim hover:text-muted hover:bg-surface-hover/50"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
