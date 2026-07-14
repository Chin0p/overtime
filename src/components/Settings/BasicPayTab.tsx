import { Info } from 'lucide-react';
import { EmployeeRow } from '../../types';
import { NumberInput } from '../ui/NumberInput';

interface BasicPayTabProps {
  basicPay: Record<string, number>;
  employees: EmployeeRow[];
  supportDesignations: string[];
  onChange: (basicPay: Record<string, number>) => void;
}

export function BasicPayTab({ basicPay, employees, supportDesignations, onChange }: BasicPayTabProps) {
  const handleUpdate = (erp: string, value: number) => {
    onChange({
      ...basicPay,
      [erp]: value
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-md font-bold text-muted capitalize">Employee basic pay</h3>
        <span className="text-xs text-muted italic select-none">Values derived from uploaded CSV</span>
      </div>

      <div className="space-y-2">
        {employees.length > 0 ? (
          employees.map(emp => {
            const isSupport = supportDesignations.some(d => emp.designation.toLowerCase().includes(d.toLowerCase()));
            
            return (
              <div key={emp.erp} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 bg-surface-hover/50 border border-white/5 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate mb-1">{emp.name}</div>
                  <div className="text-xs text-muted font-mono select-none">{emp.erp} • {emp.designation}</div>
                </div>
                <div className="shrink-0">
                  {isSupport ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-transparent border border-white/10 text-muted rounded-lg select-none">
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
          <div className="text-center py-12 text-muted-dim text-sm border-2 border-dashed border-white/5 rounded-2xl select-none">
            Upload a CSV to see employee list
          </div>
        )}
      </div>
    </div>
  );
}
