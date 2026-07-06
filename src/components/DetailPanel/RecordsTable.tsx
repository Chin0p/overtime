import { formatAmount, formatDuration } from '../../lib/utils';
import { ProcessedRecord, ColumnId } from '../../types';
import { cn } from '../../lib/utils';

interface RecordsTableProps {
  records: ProcessedRecord[];
  totalAmount: number;
  totalOTHours: number;
  visibleColumns: ColumnId[];
}

export function RecordsTable({ records, totalAmount, totalOTHours, visibleColumns }: RecordsTableProps) {
  const visibleColsSet = new Set(visibleColumns);
  const filteredRecords = records.filter(r => r.otHours >= 1 || r.isHoliday);

  return (
    <div className="bg-background rounded-lg border border-white/5 overflow-hidden shadow-xl flex flex-col">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-accent/40 scrollbar-track-transparent">
        <table className="w-full text-left border-collapse table-auto">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface border-b border-white/5">
              <th className="px-4 py-3 text-sm font-bold text-muted-dim whitespace-nowrap w-12 text-center tracking-widest">Sr.</th>
              <th className="px-4 py-3 text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest">Date</th>
              <th className="px-4 py-3 text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest">Day</th>
              <th className="px-4 py-3 text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest">In</th>
              <th className="px-4 py-3 text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest">Out</th>
              {visibleColsSet.has('Office Timing') && (
                <th className="px-4 py-3 text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest">Office Timing</th>
              )}
              {visibleColsSet.has('Total Hours Worked') && (
                <th className="px-4 py-3 text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest">Total Worked</th>
              )}
              {visibleColsSet.has('Worked (OT)') && (
                <th className="px-4 py-3 text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest">Worked (OT)</th>
              )}
              {visibleColsSet.has('Adjustment') && (
                <th className="px-4 py-3 text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest">Adjustment</th>
              )}
              <th className="px-4 py-3 text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest">OT Hrs</th>
              <th className="px-4 py-3 text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest">Amount</th>
              <th className="px-4 py-3 text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-surface/40">
            {filteredRecords.map((record, idx) => (
              <tr 
                key={record.date} 
                className={cn(
                  "hover:bg-surface-hover/30 transition-colors",
                  record.isHoliday && "bg-amber-500/5"
                )}
              >
                <td className="px-4 py-2 text-sm text-muted-dim font-mono text-center">{idx + 1}</td>
                <td className="px-4 py-2">
                  <span className="text-sm font-medium text-gray-300 whitespace-nowrap">{record.date}</span>
                </td>
                <td className="px-4 py-2 text-sm text-muted-dim whitespace-nowrap">{record.dayName}</td>
                <td className="px-4 py-2 text-sm font-mono text-muted whitespace-nowrap">{record.timeIn}</td>
                <td className="px-4 py-2 text-sm font-mono text-muted whitespace-nowrap">{record.timeOut}</td>
                {visibleColsSet.has('Office Timing') && (
                  <td className="px-4 py-2 whitespace-nowrap">
                    {record.officeTiming ? (
                      <span className="text-xs font-bold text-muted bg-surface px-2 py-0.5 rounded border border-white/10">
                        {record.officeTiming}
                      </span>
                    ) : (
                      <span className="text-muted-dim">-</span>
                    )}
                  </td>
                )}
                {visibleColsSet.has('Total Hours Worked') && (
                  <td className="px-4 py-2 text-sm text-muted-dim font-mono whitespace-nowrap">
                    {formatDuration(record.totalWorkedHours)}
                  </td>
                )}
                {visibleColsSet.has('Worked (OT)') && (
                  <td className="px-4 py-2 text-sm text-muted-dim whitespace-nowrap">{formatDuration(record.workedHours)}</td>
                )}
                {visibleColsSet.has('Adjustment') && (
                  <td className="px-4 py-2 text-sm whitespace-nowrap">
                    {record.adjustment > 0 ? (
                      <span className="text-amber-500 font-medium">-{formatDuration(record.adjustment)}</span>
                    ) : (
                      <span className="text-muted-dim">-</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-2 text-sm font-bold text-white whitespace-nowrap">{record.otHours || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-200 whitespace-nowrap">{formatAmount(record.amount)}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {record.remarks && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-xs font-bold rounded border border-amber-500/20">
                      {record.remarks}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
