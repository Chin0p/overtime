import { ProcessedEmployee, OTSettings } from '../types';

export type SummarySort = NonNullable<OTSettings['pdf']['summarySort']>;

export const SUMMARY_SORT_OPTIONS: { value: SummarySort; label: string }[] = [
  { value: 'designation', label: 'Designation' },
  { value: 'name', label: 'Name' },
  { value: 'erp', label: 'ERP' },
  { value: 'category', label: 'Category' },
  { value: 'rateType', label: 'Rate type' },
  { value: 'basicPay', label: 'Basic pay' },
  { value: 'amount', label: 'Amount' },
];

/** The default direction when someone picks a sort: amounts and pay read best highest first. */
export const defaultSortDir = (sort: SummarySort): 'asc' | 'desc' =>
  sort === 'amount' || sort === 'basicPay' ? 'desc' : 'asc';

const text = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/** Orders the summary page. Ties fall back to name (designation keeps file order, as before). */
export function sortSummary(
  employees: ProcessedEmployee[],
  sort: SummarySort = 'designation',
  dir: 'asc' | 'desc' = 'asc',
): ProcessedEmployee[] {
  const sign = dir === 'desc' ? -1 : 1;
  const primary = (a: ProcessedEmployee, b: ProcessedEmployee): number => {
    switch (sort) {
      case 'name': return text(a.name, b.name);
      case 'erp': return text(a.erp, b.erp);
      case 'designation': return text(a.designation, b.designation);
      case 'category': return text(a.category, b.category);
      case 'rateType': return text(a.rateType, b.rateType);
      case 'basicPay': return a.basicPay - b.basicPay;
      default: return a.totalAmount - b.totalAmount;
    }
  };
  return [...employees].sort((a, b) => {
    const p = primary(a, b) * sign;
    if (p !== 0 || sort === 'designation') return p;
    return text(a.name, b.name);
  });
}
