import { formatAmount, formatDuration, formatTimeDisplay } from '../../lib/utils';
import { ProcessedRecord, ColumnId } from '../../types';
import { cn } from '../../lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ArrowDownAZ, ArrowUpZA } from 'lucide-react';

interface RecordsTableProps {
  records: ProcessedRecord[];
  visibleColumns: ColumnId[];
  sortOrder: 'asc' | 'desc';
  onToggleSort: () => void;
}

export function RecordsTable({ records, visibleColumns, sortOrder, onToggleSort }: RecordsTableProps) {
  const visibleColsSet = new Set(visibleColumns);
  
  return (
    <div className="flex-1 min-h-0 mx-3 md:mx-0 bg-card rounded-lg border border-border overflow-hidden shadow-sm flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        <Table className="w-full text-left border-collapse data-table table-auto">
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="bg-muted/50 border-b border-border">
              <TableHead className="sticky top-0 z-20 bg-muted/50 text-center w-12 font-semibold">Sr.</TableHead>
              <TableHead 
                className="sticky top-0 left-0 z-30 bg-muted/50 font-semibold cursor-pointer hover:bg-muted transition-colors select-none group"
                onClick={onToggleSort}
                title="Toggle Sort Order"
              >
                <div className="flex items-center gap-1.5">
                  Date
                  <div className="text-muted-foreground group-hover:text-foreground">
                    {sortOrder === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowUpZA size={14} />}
                  </div>
                </div>
              </TableHead>
              <TableHead className="sticky top-0 z-20 bg-muted/50 font-semibold">Day</TableHead>
              <TableHead className="sticky top-0 z-20 bg-muted/50 font-semibold">In</TableHead>
              <TableHead className="sticky top-0 z-20 bg-muted/50 font-semibold">Out</TableHead>
              {visibleColsSet.has('Office Timing') && <TableHead className="sticky top-0 z-20 bg-muted/50 font-semibold">Office Timing</TableHead>}
              {visibleColsSet.has('Total Hours Worked') && <TableHead className="sticky top-0 z-20 bg-muted/50 font-semibold">Total Worked</TableHead>}
              {visibleColsSet.has('Worked (OT)') && <TableHead className="sticky top-0 z-20 bg-muted/50 font-semibold">Worked (OT)</TableHead>}
              {visibleColsSet.has('Adjustment') && <TableHead className="sticky top-0 z-20 bg-muted/50 font-semibold">Adjustment</TableHead>}
              <TableHead className="sticky top-0 z-20 bg-muted/50 font-semibold">OT Hrs</TableHead>
              <TableHead className="sticky top-0 z-20 bg-muted/50 font-semibold">Amount</TableHead>
              <TableHead className="sticky top-0 z-20 bg-muted/50 font-semibold">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8 + visibleColumns.length} className="text-center py-8 text-muted-foreground text-xs">
                  No records to display for this employee under the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record, idx) => (
              <TableRow 
                key={record.date} 
              >
                <TableCell className="text-muted-foreground font-mono text-center">{idx + 1}</TableCell>
                <TableCell className="sticky left-0 z-10 bg-card">
                  <span className="font-medium text-foreground whitespace-nowrap">{record.date}</span>
                </TableCell>
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
                      <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border pointer-events-none">
                        {record.officeTiming}
                      </span>
                    ) : (
                      <span className="text-muted-foreground opacity-50">-</span>
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
                      <span className="text-muted-foreground opacity-50">-</span>
                    )}
                  </TableCell>
                )}
                
                <TableCell className="font-bold text-foreground whitespace-nowrap">{record.otHours || '-'}</TableCell>
                <TableCell className="text-foreground whitespace-nowrap">
                  {record.amount > 0 ? formatAmount(record.amount) : <span className="text-muted-foreground opacity-50">—</span>}
                </TableCell>
                
                <TableCell className="whitespace-nowrap">
                  {record.remarks && (
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-[var(--radius-interactive)] pointer-events-none",
                      record.remarks === 'Holiday' ? "bg-[var(--color-holiday)]/10 text-[var(--color-holiday)]" :
                      record.remarks === 'Office Order' ? "bg-[var(--color-office-order)]/10 text-[var(--color-office-order)]" :
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
