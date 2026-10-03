import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { EmployeeRow, EmployeeCategory } from '../../types';
import { NumberInput } from '../ui/NumberInput';
import { Input } from '../ui/input';
import { resolveRateType } from '../../parser/parserUtils';
import { toTitleCase } from '../../lib/utils';

interface BasicPayTabProps {
  basicPay: Record<string, number>;
  employees: EmployeeRow[];
  designationCategories: Record<string, EmployeeCategory>;
  designationRateTypes?: Record<string, 'fixed' | 'dynamic'>;
  onChange: (basicPay: Record<string, number>) => void;
}

export function BasicPayTab({
  basicPay,
  employees,
  designationCategories,
  designationRateTypes = {},
  onChange,
}: BasicPayTabProps) {
  const [search, setSearch] = useState('');

  const handleUpdate = (erp: string, value: number) => {
    onChange({ ...basicPay, [erp]: value });
  };

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(q) ||
      emp.erp.includes(q) ||
      emp.designation.toLowerCase().includes(q)
    );
  }, [employees, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-[12px] font-bold text-foreground">Employee Basic Pay</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Set monthly basic pay. Rate is calculated as basic pay ÷ 176 per hour.
          </p>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
          <Input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-[12px] h-8"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        {filteredEmployees.length > 0 ? (
          filteredEmployees.map(emp => {
            const category = designationCategories[emp.designation] || emp.category || (emp.isSupport ? 'support' : 'official');
            const rateType = resolveRateType(emp.designation, { designationRateTypes });
            const isFixed = rateType === 'fixed';
            const isSupport = category === 'support';
            const currentVal = basicPay[emp.erp] !== undefined ? basicPay[emp.erp] : (emp.basicPay || 0);
            const hourlyRate = currentVal > 0 ? Math.round(currentVal / 176) : 0;

            return (
              <div
                key={emp.erp}
                className="flex items-center gap-3 p-2.5 bg-muted/20 border border-border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12px] font-semibold text-foreground truncate">
                      {toTitleCase(emp.name)}
                    </span>
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground">
                      {isSupport ? 'Support' : 'Official'}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate select-none">
                    {emp.erp} · {emp.designation}
                    {!isFixed && currentVal > 0 && (
                      <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                        {hourlyRate} PKR/hr
                      </span>
                    )}
                    {!isFixed && currentVal === 0 && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">set pay</span>
                    )}
                    {isFixed && (
                      <span className="ml-2 text-primary">fixed · managed in Designations</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <NumberInput
                    value={currentVal}
                    onChange={(val) => handleUpdate(emp.erp, val)}
                    suffix="PKR"
                    className="w-32"
                    disabled={isFixed}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-muted-foreground text-[11px] border-2 border-dashed border-border rounded-lg select-none">
            {employees.length === 0 ? 'Upload a file (JSON or CSV) to see employee list' : 'No employees matching search'}
          </div>
        )}
      </div>
    </div>
  );
}
