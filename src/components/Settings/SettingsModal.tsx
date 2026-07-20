import React, { useState, startTransition } from 'react';
import { X, Settings, CreditCard, Calendar, Users, FileText, Database } from 'lucide-react';
import { OTSettings, Holiday, EmployeeRow, EmployeeCategory } from '../../types';
import { CalculationTab } from './CalculationTab';
import { BasicPayTab } from './BasicPayTab';
import { HolidaysTab } from './HolidaysTab';
import { DesignationsTab } from './DesignationsTab';
import { PDFTab } from './PDFTab';
import { DataFlowTab } from './DataFlowTab';
import { cn } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

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
  const [activeTab, setActiveTab] = useState<'calculation' | 'basic-pay' | 'holidays' | 'designations' | 'pdf' | 'data'>('calculation');
  
  const [tempPolicy, setTempPolicy] = useState(policy);
  const [tempAppearance, setTempAppearance] = useState(appearance);
  const [tempPdf, setTempPdf] = useState(pdf);
  const [tempBasicPay, setTempBasicPay] = useState(basicPay);
  const [tempHolidays, setTempHolidays] = useState(holidays);

  const updatePolicy = (newPolicy: OTSettings['policy']) => {
    setTempPolicy(newPolicy);
  };

  const updateAppearance = (newAppearance: OTSettings['appearance']) => {
    setTempAppearance(newAppearance);
  };

  const updatePdf = (newPdf: OTSettings['pdf']) => {
    setTempPdf(newPdf);
  };

  const updateBasicPay = (newBasicPay: Record<string, number>) => {
    setTempBasicPay(newBasicPay);
  };

  const updateHolidays = (newHolidays: Holiday[]) => {
    setTempHolidays(newHolidays);
  };

  const updateDesignationCategories = (categories: Record<string, EmployeeCategory>, rateTypes: Record<string, 'fixed' | 'dynamic'>) => {
    const newPolicy = { ...tempPolicy, designationCategories: categories, designationRateTypes: rateTypes };
    updatePolicy(newPolicy);
  };

  const handleClose = () => {
    onSave(tempPolicy, tempAppearance, tempPdf, tempBasicPay, tempHolidays);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[850px] lg:max-w-[950px] max-w-[95vw] p-0 overflow-hidden flex flex-col h-[85vh] md:h-[500px] border-border bg-card gap-0">
        
        <DialogHeader className="px-4 py-2 border-b border-border shrink-0 m-0">
          <DialogTitle className="text-base font-bold">Settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <aside className="w-full md:w-[220px] border-b md:border-b-0 md:border-r border-border bg-muted/20 p-3 md:p-4 shrink-0 overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            <nav className="flex md:flex-col flex-row gap-2 md:gap-1 w-max md:w-auto">
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
                active={activeTab === 'designations'} 
                onClick={() => setActiveTab('designations')}
                icon={<Users size={18} />}
                label="Designations"
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

          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-card">
            {activeTab === 'calculation' && (
              <CalculationTab policy={tempPolicy} onChange={updatePolicy} />
            )}
            {activeTab === 'basic-pay' && (
              <BasicPayTab 
                basicPay={tempBasicPay} 
                employees={employees} 
                designationCategories={tempPolicy.designationCategories}
                onChange={updateBasicPay} 
              />
            )}
            {activeTab === 'holidays' && (
              <HolidaysTab holidays={tempHolidays} dates={employees.length > 0 ? Object.keys(employees[0].attendance) : []} onChange={updateHolidays} />
            )}
            {activeTab === 'designations' && (
              <DesignationsTab 
                categories={tempPolicy.designationCategories}
                rateTypes={tempPolicy.designationRateTypes || {}}
                employees={employees}
                onChange={updateDesignationCategories} 
              />
            )}
            {activeTab === 'pdf' && (
              <PDFTab pdf={tempPdf} onChange={updatePdf} />
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
                  onSave(data.policy, data.appearance, data.pdf, data.basicPay, data.holidays);
                }}
              />
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-auto md:w-full justify-start gap-2 rounded-[var(--radius-interactive)] transition-all shrink-0 px-3 py-2 text-sm font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring",
        active 
          ? "bg-[var(--color-neutral-active)] text-[var(--color-accent)] hover:bg-[var(--color-neutral-active)] hover:text-[var(--color-accent)]" 
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-neutral-hover)]"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
