import { ProcessedEmployee, OTSettings } from '../../types';
import { EmployeeHeader } from './EmployeeHeader';
import { RecordsTable } from './RecordsTable';

interface DetailPanelProps {
  employee: ProcessedEmployee;
  monthLabel: string;
  appearance: OTSettings['appearance'];
}

export function DetailPanel({ employee, monthLabel, appearance }: DetailPanelProps) {
  return (
    <div className="min-h-full bg-background">
      <EmployeeHeader employee={employee} monthLabel={monthLabel} />
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <RecordsTable 
            records={employee.records} 
            totalAmount={employee.totalAmount} 
            totalOTHours={employee.totalOTHours}
            visibleColumns={appearance.visibleColumns}
          />
        </div>
      </div>
    </div>
  );
}
