import React, { Fragment, useRef, useState } from 'react';
import { Settings, Calendar, Users, FileText, Database, ChevronRight } from 'lucide-react';
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
  /** Driven by the parent so the dialog can play its closing animation before unmounting. */
  open: boolean;
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

export function SettingsModal({ open, policy, appearance, pdf, basicPay, holidays, employees, dates, onSave, onClose }: SettingsModalProps) {
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

  const updateEmployeeEligibility = (employeeEligibility: Record<string, 'exempt' | 'included'>) => {
    updatePolicy({ ...tempPolicy, employeeEligibility });
  };

  const updateExcludedDays = (employeeExcludedDays: Record<string, string[]>) => {
    updatePolicy({ ...tempPolicy, employeeExcludedDays });
  };

  const popupRef = useRef<HTMLDivElement>(null);
  const current = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  const handleSaveAndClose = () => {
    onSave(tempPolicy, tempAppearance, tempPdf, tempBasicPay, tempHolidays);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      {/* Focus the dialog itself on open, so no tab button starts with a stray focus ring. */}
      <DialogContent
        ref={popupRef}
        initialFocus={popupRef}
        closeClassName="top-3.5 right-3 sm:right-4"
        className="focus-visible:outline-none! max-w-full sm:max-w-[750px] md:max-w-[900px] lg:max-w-[1000px] p-0 overflow-hidden flex flex-col h-[100svh] max-h-[100svh] rounded-none border-border bg-card gap-0 tall:h-[min(85svh,780px)] tall:max-h-[calc(100svh-2rem)] tall:rounded-xl">

        <DialogHeader className="h-14 pl-4 pr-14 sm:pl-5 border-b border-border shrink-0 m-0 flex flex-row items-center">
          {/* Breadcrumb: where you are inside Settings. */}
          <DialogTitle className="text-header flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-muted-foreground">Settings</span>
            <ChevronRight size={16} className="shrink-0 text-muted-foreground/60" aria-hidden />
            <span className="flex items-center gap-2 min-w-0 text-foreground" aria-current="page">
              <span className="shrink-0 text-primary">{current.icon}</span>
              <span className="truncate">{current.label}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <aside className="w-full md:w-[200px] border-b md:border-b-0 md:border-r border-border bg-muted/20 p-2 md:p-3 shrink-0 overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            <nav className="flex md:flex-col flex-row gap-1.5 md:gap-1 w-max md:w-auto">
              {TABS.map((t) => (
                <Fragment key={t.id}>
                  <TabButton active={activeTab === t.id} onClick={() => setActiveTab(t.id)} icon={t.icon} label={t.label} />
                </Fragment>
              ))}
            </nav>
          </aside>

          <main
            key={activeTab}
            className={cn(
              'flex-1 min-w-0 bg-card',
              activeTab === 'employees' || activeTab === 'pdf' ? 'relative overflow-hidden' : 'overflow-y-auto bg-muted/25 p-4 sm:p-6',
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
                employeeEligibility={tempPolicy.employeeEligibility || {}}
                onBasicPayChange={updateBasicPay}
                onDesignationChange={updateDesignationConfig}
                onEligibilityChange={updateEmployeeEligibility}
                employeeExcludedDays={tempPolicy.employeeExcludedDays || {}}
                dates={dates}
                onExcludedDaysChange={updateExcludedDays}
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
          <span className="text-ui text-muted-foreground hidden sm:inline">
            Changes apply when you press Save & Apply
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-ui h-7 px-3"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAndClose}
              className="text-ui h-7 px-3 font-semibold"
            >
              Save & Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TABS = [
  { id: 'calculation', label: 'Calculation', icon: <Settings size={16} /> },
  { id: 'employees', label: 'Employees & Pay', icon: <Users size={16} /> },
  { id: 'holidays', label: 'Holidays', icon: <Calendar size={16} /> },
  { id: 'pdf', label: 'PDF Export', icon: <FileText size={16} /> },
  { id: 'data', label: 'Backup / Reset', icon: <Database size={16} /> },
] as const;

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-auto md:w-full justify-start gap-2 rounded-[var(--radius-interactive)] transition-all shrink-0 px-3 py-2 text-body font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring",
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
