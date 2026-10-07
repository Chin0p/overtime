import { useState } from 'react';
import { ProcessedEmployee } from '../types';

export type SidebarFilter = 'has_ot' | 'all' | 'missing_pay' | 'exempt';
export type SidebarSortKey = 'file' | 'name' | 'designation' | 'ot' | 'amount';
export type SidebarSortOrder = 'asc' | 'desc';

export const DEFAULT_SIDEBAR_FILTER: SidebarFilter = 'has_ot';

/**
 * How the employee list is narrowed and ordered. Lives in App (like the records view) so the
 * first employee that gets auto-selected is the first one the list actually shows.
 */
export function useSidebarView() {
  const [filterBy, setFilterBy] = useState<SidebarFilter>(DEFAULT_SIDEBAR_FILTER);
  const [sortKey, setSortKey] = useState<SidebarSortKey>('file');
  const [sortOrder, setSortOrder] = useState<SidebarSortOrder>('asc');
  const setSort = (key: SidebarSortKey, order: SidebarSortOrder) => {
    setSortKey(key);
    setSortOrder(order);
  };
  return { filterBy, setFilterBy, sortKey, sortOrder, setSort };
}

export type SidebarView = ReturnType<typeof useSidebarView>;

export function applySidebarView(
  employees: ProcessedEmployee[],
  { filterBy, sortKey, sortOrder }: Pick<SidebarView, 'filterBy' | 'sortKey' | 'sortOrder'>,
): ProcessedEmployee[] {
  const list = employees.filter((emp) => {
    if (filterBy === 'missing_pay') return emp.category !== 'exempt' && emp.rateType === 'dynamic' && emp.basicPay === 0;
    if (filterBy === 'has_ot') return emp.totalOTHours > 0;
    if (filterBy === 'exempt') return emp.category === 'exempt';
    return true;
  });
  if (sortKey === 'file') return list;
  const dir = sortOrder === 'asc' ? 1 : -1;
  return list.sort((a, b) => {
    switch (sortKey) {
      case 'name': return a.name.localeCompare(b.name) * dir;
      case 'designation': return (a.designation.localeCompare(b.designation) || a.name.localeCompare(b.name)) * dir;
      case 'ot': return (a.totalOTHours - b.totalOTHours) * dir;
      default: return (a.totalAmount - b.totalAmount) * dir;
    }
  });
}
