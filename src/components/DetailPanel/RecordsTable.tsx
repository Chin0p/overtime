import { formatAmount, formatDuration, formatTimeDisplay } from '../../lib/utils';
import { ProcessedRecord, ColumnId } from '../../types';
import { cn } from '../../lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ArrowDownAZ, ArrowUpZA, ArrowUpDown } from 'lucide-react';

interface RecordsTableProps {
  records: ProcessedRecord[];
  visibleColumns: ColumnId[];
  sortOrder: 'asc' | 'desc';
  /** Which column the rows are currently ordered by. */
  sortKey?: 'date' | 'ot' | 'amount';
  onToggleSort: () => void;
}

export function RecordsTable({ records, visibleColumns, sortOrder, sortKey = 'date', onToggleSort }: RecordsTableProps) {
  const visibleColsSet = new Set(visibleColumns);
  
  return (
    // No overflow clipping here: sticky <th> must stick to the DetailPanel scroller.
    <div className="w-full bg-card rounded-lg border border-border shadow-sm [&_thead_th:first-child]:rounded-tl-lg [&_thead_th:last-child]:rounded-tr-lg">
      <div>
        <Table
          containerClassName="overflow-visible"
          className="w-full text-left border-collapse data-table table-auto"
        >
          <TableHeader>
            <TableRow className="border-b-0">
              <TableHead className="sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--color-border)] text-center w-12 font-semibold">Sr.</TableHead>
              <TableHead 
                className="sticky top-[var(--header-sticky)] left-0 z-30 bg-muted shadow-[inset_0_-1px_0_0_var(--color-border)] font-semibold cursor-pointer hover:bg-accent transition-colors select-none group"
                onClick={onToggleSort}
                title="Toggle Sort Order"
              >
                <div className="flex items-center gap-1.5">
                  Date
                  <div className="text-muted-foreground group-hover:text-foreground">
                    {sortKey !== 'date' ? <ArrowUpDown size={14} /> : sortOrder === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowUpZA size={14} />}
                  </div>
                </div>
              </TableHead>
              <TableHead className="sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--color-border)] font-semibold">Day</TableHead>
              <TableHead className="sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--color-border)] font-semibold">In</TableHead>
              <TableHead className="sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--color-border)] font-semibold">Out</TableHead>
              {visibleColsSet.has('Office Timing') && <TableHead className="sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--color-border)] font-semibold">Office Timing</TableHead>}
              {visibleColsSet.has('Total Hours Worked') && <TableHead className="sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--color-border)] font-semibold">Total Worked</TableHead>}
              {visibleColsSet.has('Worked (OT)') && <TableHead className="sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--color-border)] font-semibold">Worked (OT)</TableHead>}
              {visibleColsSet.has('Adjustment') && <TableHead className="sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--color-border)] font-semibold">Adjustment</TableHead>}
              <TableHead className="sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--color-border)] font-semibold">OT Hrs</TableHead>
              <TableHead className="sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--color-border)] font-semibold">Amount</TableHead>
              <TableHead className="sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--color-border)] font-semibold">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border [&_tr:last-child_td:first-child]:rounded-bl-lg [&_tr:last-child_td:last-child]:rounded-br-lg">
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9 + visibleColumns.length} className="text-center py-8 text-muted-foreground text-ui">
                  No records to display for this employee under the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record, idx) => (
              <TableRow 
                key={record.date} 
              >
                <TableCell className="text-muted-foreground font-mono text-center">{idx + 1}</TableCell>
                <TableCell className="sticky left-0 z-10 bg-card font-medium text-foreground whitespace-nowrap">{record.date}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">{record.dayName}</TableCell>
                <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                  {formatTimeDisplay(record.timeIn)}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                  {formatTimeDisplay(record.timeOut)}
                </TableCell>
                
                {visibleColsSet.has('Office Timing') && (
                  <TableCell className="whitespace-nowrap">
                    {record.officeTiming ? (
                      <span className="text-caption font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border pointer-events-none">
                        {record.officeTiming}
                      </span>
                    ) : (
                      <span className="text-muted-foreground opacity-50">—</span>
                    )}
                  </TableCell>
                )}
                
                {visibleColsSet.has('Total Hours Worked') && (
                  <TableCell className="text-muted-foreground font-mono whitespace-nowrap">
                    {formatDuration(record.totalWorkedHours)}
                  </TableCell>
                )}
                
                {visibleColsSet.has('Worked (OT)') && (
                  <TableCell className="text-muted-foreground whitespace-nowrap">{formatDuration(record.workedHours)}</TableCell>
                )}
                
                {visibleColsSet.has('Adjustment') && (
                  <TableCell className="whitespace-nowrap">
                    {record.adjustment > 0 ? (
                      <span className="text-[var(--color-warning)] font-medium">-{formatDuration(record.adjustment)}</span>
                    ) : (
                      <span className="text-muted-foreground opacity-50">—</span>
                    )}
                  </TableCell>
                )}
                
                <TableCell className="font-bold text-foreground whitespace-nowrap">{record.otHours || '—'}</TableCell>
                <TableCell className="text-foreground whitespace-nowrap">
                  {record.amount > 0 ? formatAmount(record.amount) : <span className="text-muted-foreground opacity-50">—</span>}
                </TableCell>
                
                <TableCell className="whitespace-nowrap">
                  {record.remarks && (
                    <span className={cn(
                      "px-2 py-0.5 text-caption font-medium rounded-[var(--radius-interactive)] pointer-events-none",
                      record.remarks === 'Holiday' ? "bg-[var(--color-holiday)]/10 text-[var(--color-holiday)]" :
                      record.remarks === 'Late Arrival' ? "bg-[var(--color-late-arrival)]/10 text-[var(--color-late-arrival)]" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {record.remarks}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
