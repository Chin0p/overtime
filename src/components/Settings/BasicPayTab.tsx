import React from 'react';
import { Info } from 'lucide-react';
import { EmployeeRow, EmployeeCategory } from '../../types';
import { NumberInput } from '../ui/NumberInput';

interface BasicPayTabProps {
  basicPay: Record<string, number>;
  employees: EmployeeRow[];
  designationCategories: Record<string, EmployeeCategory>;
  onChange: (basicPay: Record<string, number>) => void;
}

export function BasicPayTab({ basicPay, employees, designationCategories, onChange }: BasicPayTabProps) {
  const handleUpdate = (erp: string, value: number) => {
    onChange({
      ...basicPay,
      [erp]: value
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-foreground">Employee basic pay</h3>
        <span className="text-xs text-muted-foreground italic select-none">Values derived from uploaded CSV</span>
      </div>

      <div className="space-y-2">
        {employees.length > 0 ? (
          employees.map(emp => {
            const category = designationCategories[emp.designation] || 'official';
            const isSupport = category === 'support';
            
            return (
              <div key={emp.erp} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 bg-muted/20 border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-base md:text-sm font-bold text-foreground truncate mb-1">{emp.name}</div>
                  <div className="text-xs text-muted-foreground font-mono select-none">{emp.erp} • {emp.designation}</div>
                </div>
                <div className="shrink-0">
                  {isSupport ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-transparent border border-border text-muted-foreground rounded-lg select-none">
                      <Info size={14} />
                      <span className="text-xs font-medium capitalize">Basic pay not needed</span>
                    </div>
                  ) : (
                    <NumberInput
                      value={basicPay[emp.erp] || 0}
                      onChange={(val) => handleUpdate(emp.erp, val)}
                      suffix="PKR"
                      className="w-40"
                    />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg select-none">
            Upload a CSV to see employee list
          </div>
        )}
      </div>
    </div>
  );
}
