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
  /** Click on the OT Hrs or Amount header. */
  onSortColumn: (key: 'ot' | 'amount') => void;
}

/** Header cell: pinned under the title bar. */
const HEAD = 'sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--border)] font-semibold';
const SORTABLE = 'cursor-pointer hover:bg-accent transition-colors select-none group';

export function RecordsTable({ records, visibleColumns, sortOrder, sortKey = 'date', onToggleSort, onSortColumn }: RecordsTableProps) {
  const visibleColsSet = new Set(visibleColumns);
  const sortIcon = (key: 'date' | 'ot' | 'amount') =>
    sortKey !== key ? <ArrowUpDown size={14} /> : sortOrder === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowUpZA size={14} />;
  
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
              <TableHead className="sticky top-[var(--header-sticky)] z-20 bg-muted shadow-[inset_0_-1px_0_0_var(--border)] text-center w-12 font-semibold">Sr.</TableHead>
              <TableHead
                className={cn(HEAD, 'left-0 z-30', SORTABLE)}
                onClick={onToggleSort}
                title="Sort by date"
              >
                <div className="flex items-center gap-1.5">
                  Date
                  <div className="text-muted-foreground group-hover:text-foreground">{sortIcon('date')}</div>
                </div>
              </TableHead>
              <TableHead className={HEAD}>Day</TableHead>
              <TableHead className={HEAD}>In</TableHead>
              <TableHead className={HEAD}>Out</TableHead>
              {visibleColsSet.has('Office Timing') && <TableHead className={HEAD}>Office Timing</TableHead>}
              {visibleColsSet.has('Total Hours Worked') && <TableHead className={HEAD}>Total Worked</TableHead>}
              {visibleColsSet.has('Worked (OT)') && <TableHead className={HEAD}>Worked (OT)</TableHead>}
              {visibleColsSet.has('Adjustment') && <TableHead className={HEAD}>Adjustment</TableHead>}
              <TableHead className={cn(HEAD, SORTABLE)} onClick={() => onSortColumn('ot')} title="Sort by overtime hours">
                <div className="flex items-center gap-1.5">
                  OT Hrs
                  <div className="text-muted-foreground group-hover:text-foreground">{sortIcon('ot')}</div>
                </div>
              </TableHead>
              <TableHead className={cn(HEAD, SORTABLE)} onClick={() => onSortColumn('amount')} title="Sort by amount">
                <div className="flex items-center gap-1.5">
                  Amount
                  <div className="text-muted-foreground group-hover:text-foreground">{sortIcon('amount')}</div>
                </div>
              </TableHead>
              <TableHead className={HEAD}>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border [&_tr:last-child_td:first-child]:rounded-bl-lg [&_tr:last-child_td:last-child]:rounded-br-lg">
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8 + visibleColumns.length} className="text-center py-8 text-muted-foreground text-ui">
                  No records to display for this employee under the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record, idx) => (
              <TableRow
                key={record.date}
                // An excluded day is shown for reference only: greyed, never counted or exported.
                className={cn(record.excluded && 'text-muted-foreground')}
              >
                <TableCell className="text-muted-foreground font-mono text-center">{idx + 1}</TableCell>
                <TableCell className="sticky left-0 z-10 bg-card font-medium text-foreground whitespace-nowrap">{record.date}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {/* Short day names when the panel is narrow, so the table fits without side-scrolling. */}
                  <span className="@3xl:hidden">{record.dayName.slice(0, 3)}</span>
                  <span className="hidden @3xl:inline">{record.dayName}</span>
                </TableCell>
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
                      <span className="text-[var(--color-warning-fg)] font-medium">-{formatDuration(record.adjustment)}</span>
                    ) : (
                      <span className="text-muted-foreground opacity-50">—</span>
                    )}
                  </TableCell>
                )}
                
                <TableCell className={cn('font-bold whitespace-nowrap', record.excluded ? 'text-muted-foreground/70 line-through font-medium' : 'text-foreground')}>{record.otHours || '—'}</TableCell>
                <TableCell className={cn('whitespace-nowrap', record.excluded ? 'text-muted-foreground/70 line-through' : 'text-foreground')}>
                  {record.amount > 0 ? formatAmount(record.amount) : <span className="text-muted-foreground opacity-50">—</span>}
                </TableCell>
                
                {/* May wrap, so a long remark never forces the whole table wider than the panel. */}
                <TableCell className="whitespace-normal min-w-[6rem]">
                  {record.remarks && (
                    <span className={cn(
                      "inline-block px-2 py-0.5 text-caption font-medium rounded-[var(--radius-interactive)] pointer-events-none",
                      record.excluded && "border border-dashed border-border",
                      record.remarks === 'Holiday' ? "bg-[var(--color-holiday)]/10 text-[var(--color-success-fg)]" :
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
