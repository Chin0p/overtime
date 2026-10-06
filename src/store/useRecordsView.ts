import { useState } from 'react';
import { ColumnId } from '../types';

export type RecordsFilter = 'all' | 'ot_only' | 'holidays';
export type RecordsSortKey = 'date' | 'ot' | 'amount';

export const ALL_COLUMNS: ColumnId[] = ['Office Timing', 'Total Hours Worked', 'Worked (OT)', 'Adjustment'];
export const DEFAULT_COLUMNS: ColumnId[] = ['Adjustment'];
export const DEFAULT_FILTER: RecordsFilter = 'ot_only';

/**
 * How the records table is viewed (filter, sort, optional columns).
 * Lives in App so the choices survive switching between employees.
 */
export function useRecordsView() {
  const [filter, setFilter] = useState<RecordsFilter>(DEFAULT_FILTER);
  const [sortKey, setSortKey] = useState<RecordsSortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(DEFAULT_COLUMNS);

  const toggleColumn = (id: ColumnId) =>
    setVisibleColumns(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]));

  const setSort = (key: RecordsSortKey, order: 'asc' | 'desc') => {
    setSortKey(key);
    setSortOrder(order);
  };

  return { filter, setFilter, sortKey, sortOrder, setSort, visibleColumns, toggleColumn };
}

export type RecordsView = ReturnType<typeof useRecordsView>;
