import React, { useState } from 'react';
import { Settings, CreditCard, Calendar, Users, FileText, Database } from 'lucide-react';
import { OTSettings, Holiday, EmployeeRow, EmployeeCategory } from '../../types';
import { CalculationTab } from './CalculationTab';
import { HolidaysTab } from './HolidaysTab';
import { PDFTab } from './PDFTab';
import { EmployeesTab } from './EmployeesTab';
import { DataFlowTab } from './DataFlowTab';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
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
  dates: string[];
  onSave: (policy: OTSettings['policy'], appearance: OTSettings['appearance'], pdf: OTSettings['pdf'], basicPay: Record<string, number>, holidays: Holiday[]) => void;
  onClose: () => void;
}

export function SettingsModal({ policy, appearance, pdf, basicPay, holidays, employees, dates, onSave, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<
    'calculation' | 'employees' | 'holidays' | 'pdf' | 'data'
  >('calculation');
  const [tempPolicy, setTempPolicy] = useState(policy);
  const [tempAppearance, setTempAppearance] = useState(appearance);
  const [tempPdf, setTempPdf] = useState(pdf);
  const [tempBasicPay, setTempBasicPay] = useState(() => {
    const initial = { ...basicPay };
    employees.forEach(emp => {
      if (initial[emp.erp] === undefined && emp.basicPay !== undefined && emp.basicPay > 0) {
        initial[emp.erp] = emp.basicPay;
      }
    });
    return initial;
  });
  const [tempHolidays, setTempHolidays] = useState(holidays);

  const updatePolicy = (newPolicy: OTSettings['policy']) => {
    setTempPolicy(newPolicy);
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

  const updateDesignationConfig = (
    categories: Record<string, EmployeeCategory>,
    rateTypes: Record<string, 'fixed' | 'dynamic'>,
    capExempt: Record<string, boolean>,
  ) => {
    const newPolicy = {
      ...tempPolicy,
      designationCategories: categories,
      designationRateTypes: rateTypes,
      designationCapExempt: capExempt,
    };
    updatePolicy(newPolicy);
  };

  const handleSaveAndClose = () => {
    onSave(tempPolicy, tempAppearance, tempPdf, tempBasicPay, tempHolidays);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-full sm:max-w-[750px] md:max-w-[900px] lg:max-w-[1000px] p-0 overflow-hidden flex flex-col h-[100dvh] max-h-[100dvh] rounded-none border-border bg-card gap-0 tall:h-[min(85dvh,780px)] tall:max-h-[calc(100dvh-2rem)] tall:rounded-xl">

        <DialogHeader className="px-4 py-2 border-b border-border shrink-0 m-0">
          <DialogTitle className="text-[12px] font-bold">Settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <aside className="w-full md:w-[200px] border-b md:border-b-0 md:border-r border-border bg-muted/20 p-2 md:p-3 shrink-0 overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            <nav className="flex md:flex-col flex-row gap-1.5 md:gap-1 w-max md:w-auto">
              <TabButton
                active={activeTab === 'calculation'}
                onClick={() => setActiveTab('calculation')}
                icon={<Settings size={15} />}
                label="Calculation"
              />
              <TabButton
                active={activeTab === 'employees'}
                onClick={() => setActiveTab('employees')}
                icon={<Users size={15} />}
                label="Employees & Pay"
              />
              <TabButton
                active={activeTab === 'holidays'}
                onClick={() => setActiveTab('holidays')}
                icon={<Calendar size={15} />}
                label="Holidays"
              />
              <TabButton
                active={activeTab === 'pdf'}
                onClick={() => setActiveTab('pdf')}
                icon={<FileText size={15} />}
                label="PDF Export"
              />
              <TabButton
                active={activeTab === 'data'}
                onClick={() => setActiveTab('data')}
                icon={<Database size={15} />}
                label="Backup / Reset"
              />
            </nav>
          </aside>

          <main
            key={activeTab}
            className={cn(
              'flex-1 min-w-0 bg-card',
              activeTab === 'employees' ? 'relative overflow-hidden' : 'overflow-y-auto p-3 sm:p-5',
            )}
          >
            {activeTab === 'calculation' && (
              <CalculationTab policy={tempPolicy} onChange={updatePolicy} />
            )}
            {activeTab === 'holidays' && (
              <HolidaysTab holidays={tempHolidays} dates={dates} onChange={updateHolidays} />
            )}
            {activeTab === 'employees' && (
              <EmployeesTab
                basicPay={tempBasicPay}
                employees={employees}
                designationCategories={tempPolicy.designationCategories}
                designationRateTypes={tempPolicy.designationRateTypes || {}}
                designationCapExempt={tempPolicy.designationCapExempt || {}}
                onBasicPayChange={updateBasicPay}
                onDesignationChange={updateDesignationConfig}
              />
            )}
            {activeTab === 'pdf' && (
              <PDFTab pdf={tempPdf} employees={employees} onChange={updatePdf} />
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

        {/* Footer Actions */}
        <div className="px-4 py-2.5 border-t border-border bg-muted/10 shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Changes automatically recalculate dashboard reports
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-[12px] h-7 px-3"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAndClose}
              className="text-[12px] h-7 px-3 font-semibold"
            >
              Save & Apply
            </Button>
          </div>
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
        "flex items-center w-auto md:w-full justify-start gap-2 rounded-[var(--radius-interactive)] transition-all shrink-0 px-2.5 py-1.5 text-[12px] font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring",
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
