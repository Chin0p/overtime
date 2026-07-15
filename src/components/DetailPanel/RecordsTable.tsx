import { formatAmount, formatDuration } from '../../lib/utils';
import { ProcessedRecord, ColumnId } from '../../types';
import { cn } from '../../lib/utils';

interface RecordsTableProps {
  records: ProcessedRecord[];
  totalAmount: number;
  totalOTHours: number;
  visibleColumns: ColumnId[];
  density?: 'comfortable' | 'compact';
}

export function RecordsTable({ records, totalAmount, totalOTHours, visibleColumns, density = 'comfortable' }: RecordsTableProps) {
  const visibleColsSet = new Set(visibleColumns);
  
  const cellPadding = density === 'compact' ? 'px-2 py-1' : 'px-4 py-2';
  const headPadding = density === 'compact' ? 'px-2 py-2' : 'px-4 py-3';

  return (
    <div className="bg-background rounded-none md:rounded-lg border-y md:border-x border-white/5 md:border-white/5 overflow-hidden shadow-xl flex flex-col">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-accent/40 scrollbar-track-transparent">
        <table className="w-full text-left border-collapse table-auto">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface border-b border-white/5">
              <th className={cn(headPadding, "text-sm font-bold text-muted-dim whitespace-nowrap w-12 text-center tracking-widest")}>Sr.</th>
              <th className={cn(headPadding, "text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest")}>Date</th>
              <th className={cn(headPadding, "text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest")}>Day</th>
              <th className={cn(headPadding, "text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest")}>In</th>
              <th className={cn(headPadding, "text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest")}>Out</th>
              {visibleColsSet.has('Office Timing') && (
                <th className={cn(headPadding, "text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest")}>Office Timing</th>
              )}
              {visibleColsSet.has('Total Hours Worked') && (
                <th className={cn(headPadding, "text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest")}>Total Worked</th>
              )}
              {visibleColsSet.has('Worked (OT)') && (
                <th className={cn(headPadding, "text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest")}>Worked (OT)</th>
              )}
              {visibleColsSet.has('Adjustment') && (
                <th className={cn(headPadding, "text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest")}>Adjustment</th>
              )}
              <th className={cn(headPadding, "text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest")}>OT Hrs</th>
              <th className={cn(headPadding, "text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest")}>Amount</th>
              <th className={cn(headPadding, "text-sm font-bold text-muted-dim whitespace-nowrap tracking-widest")}>Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-surface/40">
            {records.map((record, idx) => (
              <tr 
                key={record.date} 
                className={cn(
                  "hover:bg-surface-hover/30 transition-colors",
                  record.isHoliday && "bg-amber-500/5"
                )}
              >
                <td className={cn(cellPadding, "text-sm text-muted-dim font-mono text-center")}>{idx + 1}</td>
                <td className={cellPadding}>
                  <span className="text-sm font-medium text-gray-300 whitespace-nowrap">{record.date}</span>
                </td>
                <td className={cn(cellPadding, "text-sm text-muted-dim whitespace-nowrap")}>{record.dayName}</td>
                <td className={cn(cellPadding, "text-sm font-mono text-muted whitespace-nowrap")}>{record.timeIn}</td>
                <td className={cn(cellPadding, "text-sm font-mono text-muted whitespace-nowrap")}>{record.timeOut}</td>
                {visibleColsSet.has('Office Timing') && (
                  <td className={cn(cellPadding, "whitespace-nowrap")}>
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
                  <td className={cn(cellPadding, "text-sm text-muted-dim font-mono whitespace-nowrap")}>
                    {formatDuration(record.totalWorkedHours)}
                  </td>
                )}
                {visibleColsSet.has('Worked (OT)') && (
                  <td className={cn(cellPadding, "text-sm text-muted-dim whitespace-nowrap")}>{formatDuration(record.workedHours)}</td>
                )}
                {visibleColsSet.has('Adjustment') && (
                  <td className={cn(cellPadding, "text-sm whitespace-nowrap")}>
                    {record.adjustment > 0 ? (
                      <span className="text-amber-500 font-medium">-{formatDuration(record.adjustment)}</span>
                    ) : (
                      <span className="text-muted-dim">-</span>
                    )}
                  </td>
                )}
                <td className={cn(cellPadding, "text-sm font-bold text-white whitespace-nowrap")}>{record.otHours || '-'}</td>
                <td className={cn(cellPadding, "text-sm text-gray-200 whitespace-nowrap")}>{formatAmount(record.amount)}</td>
                <td className={cn(cellPadding, "whitespace-nowrap")}>
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
