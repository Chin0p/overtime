import { useMemo, useState } from 'react';
import { EmployeeRow, EmployeeCategory } from '../../types';
import { resolveRateType, resolveCapExempt } from '../../parser/parserUtils';
import { EmployeeListPanel } from './EmployeeListPanel';
import { EmployeeDetailPanel } from './EmployeeDetailPanel';
import {
  CATEGORY_LABEL,
  EMPTY_FILTERS,
  EmployeeInfo,
  Filters,
  GroupBy,
  InfoGroup,
  Rate,
  RuleChange,
  SortBy,
} from './employeeShared';
import { cn, formatAmount } from '../../lib/utils';

interface EmployeesTabProps {
  basicPay: Record<string, number>;
  employees: EmployeeRow[];
  designationCategories: Record<string, EmployeeCategory>;
  designationRateTypes: Record<string, 'fixed' | 'dynamic'>;
  designationCapExempt: Record<string, boolean>;
  onBasicPayChange: (basicPay: Record<string, number>) => void;
  onDesignationChange: (
    categories: Record<string, EmployeeCategory>,
    rateTypes: Record<string, 'fixed' | 'dynamic'>,
    capExempt: Record<string, boolean>,
  ) => void;
}

const CATEGORY_ORDER: EmployeeCategory[] = ['support', 'official', 'exempt'];

const defaultCategory = (designation: string): EmployeeCategory =>
  designation.toLowerCase().includes('officer') ? 'exempt' : 'official';

export function EmployeesTab({
  basicPay,
  employees,
  designationCategories,
  designationRateTypes,
  designationCapExempt,
  onBasicPayChange,
  onDesignationChange,
}: EmployeesTabProps) {
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortDesc, setSortDesc] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeErp, setActiveErp] = useState<string | null>(null);
  // Below `lg` the list and detail are separate screens.
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  // Everything derived about each employee, computed once per change.
  const infos = useMemo<EmployeeInfo[]>(
    () =>
      employees.map((emp) => {
        const designation = emp.designation || '';
        const category = designationCategories[designation] ?? defaultCategory(designation);
        const rate = resolveRateType(designation, { designationRateTypes });
        return {
          emp,
          category,
          rate,
          capExempt: resolveCapExempt(designation, rate, { designationCapExempt }),
          pay: basicPay[emp.erp] !== undefined ? basicPay[emp.erp] : emp.basicPay || 0,
        };
      }),
    [employees, basicPay, designationCategories, designationRateTypes, designationCapExempt],
  );

  const designationCounts = useMemo(() => {
    const m: Record<string, number> = {};
    employees.forEach((e) => {
      const d = e.designation || '';
      m[d] = (m[d] || 0) + 1;
    });
    return m;
  }, [employees]);

  const groups = useMemo<InfoGroup[]>(() => {
    const q = search.trim().toLowerCase();
    let list = infos.filter((i) => {
      if (q && !(i.emp.name.toLowerCase().includes(q) || i.emp.erp.includes(q) || (i.emp.designation || '').toLowerCase().includes(q))) return false;
      if (filters.categories.length && !filters.categories.includes(i.category)) return false;
      if (filters.rates.length && (i.category === 'exempt' || !filters.rates.includes(i.rate))) return false;
      if (filters.missingPay && !(i.category !== 'exempt' && i.rate === 'dynamic' && i.pay === 0)) return false;
      return true;
    });

    const byName = (a: EmployeeInfo, b: EmployeeInfo) => (a.emp.name || '').localeCompare(b.emp.name || '');
    const dir = sortDesc ? -1 : 1;
    list = [...list].sort((a, b) => {
      let c = 0;
      if (sortBy === 'erp') c = a.emp.erp.localeCompare(b.emp.erp, undefined, { numeric: true });
      else if (sortBy === 'designation') c = (a.emp.designation || '').localeCompare(b.emp.designation || '');
      else if (sortBy === 'pay') c = a.pay - b.pay;
      else c = byName(a, b);
      return c !== 0 ? c * dir : byName(a, b);
    });

    if (groupBy === 'none') return list.length ? [{ key: 'all', label: '', items: list }] : [];

    const map = new Map<string, InfoGroup>();
    list.forEach((i) => {
      const key =
        groupBy === 'designation' ? i.emp.designation || '—' : groupBy === 'pay' ? String(i.pay) : i.category;
      const label =
        groupBy === 'designation'
          ? i.emp.designation || 'No designation'
          : groupBy === 'pay'
            ? i.pay > 0 ? `PKR ${formatAmount(i.pay)}` : 'No basic pay'
            : CATEGORY_LABEL[i.category];
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key)!.items.push(i);
    });
    const out = Array.from(map.values());
    if (groupBy === 'designation') out.sort((a, b) => a.label.localeCompare(b.label));
    else if (groupBy === 'pay') out.sort((a, b) => (Number(a.key) === 0 ? 1 : Number(b.key) === 0 ? -1 : Number(b.key) - Number(a.key)));
    else out.sort((a, b) => CATEGORY_ORDER.indexOf(a.key as EmployeeCategory) - CATEGORY_ORDER.indexOf(b.key as EmployeeCategory));
    return out;
  }, [infos, search, filters, sortBy, sortDesc, groupBy]);

  const visible = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i.emp.erp));

  const setMany = (items: EmployeeInfo[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      items.forEach((i) => (on ? next.add(i.emp.erp) : next.delete(i.emp.erp)));
      return next;
    });

  const toggleOne = (erp: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(erp)) next.delete(erp);
      else next.add(erp);
      return next;
    });

  const clearSelection = () => {
    setSelected(new Set());
    setMobileView('list');
  };

  const selectedInfos = useMemo(() => infos.filter((i) => selected.has(i.emp.erp)), [infos, selected]);
  const active = useMemo(() => infos.find((i) => i.emp.erp === activeErp) ?? null, [infos, activeErp]);

  const handlePay = (erps: string[], value: number) => {
    const next = { ...basicPay };
    erps.forEach((erp) => (next[erp] = value));
    onBasicPayChange(next);
  };

  // Same semantics as the old bulk bar, keyed by designation.
  const handleRules = (designations: string[], change: RuleChange) => {
    const nextCat = { ...designationCategories };
    const nextRate = { ...designationRateTypes };
    const nextCap = { ...designationCapExempt };
    designations.forEach((d) => {
      if (change.category) {
        nextCat[d] = change.category;
        if (change.category === 'exempt') {
          delete nextRate[d];
          delete nextCap[d];
        }
      }
      const exempt = (nextCat[d] ?? defaultCategory(d)) === 'exempt';
      if (change.rate && !exempt) {
        nextRate[d] = change.rate;
        if (change.rate !== 'fixed') delete nextCap[d];
      }
      if (change.capExempt !== undefined && !exempt) {
        const rate: Rate = resolveRateType(d, { designationRateTypes: nextRate });
        if (rate === 'fixed') nextCap[d] = change.capExempt;
      }
    });
    onDesignationChange(nextCat, nextRate, nextCap);
  };

  if (employees.length === 0) {
    return (
      <div className="absolute inset-0 p-5">
        <h3 className="text-[12px] font-bold text-foreground">Employees &amp; Pay</h3>
        <div className="mt-3 text-center py-10 text-muted-foreground text-[11px] border-2 border-dashed border-border rounded-lg select-none">
          Upload a file to see the employee list
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex">
      <EmployeeListPanel
        className={cn('w-full lg:w-[380px] lg:shrink-0 lg:border-r lg:border-border', mobileView === 'detail' ? 'hidden lg:flex' : 'flex')}
        totalCount={employees.length}
        visibleCount={visible.length}
        groups={groups}
        search={search}
        onSearchChange={setSearch}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        sortBy={sortBy}
        sortDesc={sortDesc}
        onSortChange={(by, desc) => { setSortBy(by); setSortDesc(desc); }}
        filters={filters}
        onFiltersChange={setFilters}
        selected={selected}
        activeErp={activeErp}
        allVisibleSelected={allVisibleSelected}
        onToggleAll={() => setMany(visible, !allVisibleSelected)}
        onToggleOne={toggleOne}
        onToggleGroup={(items) => setMany(items, !items.every((i) => selected.has(i.emp.erp)))}
        onOpen={(erp) => { setActiveErp(erp); setMobileView('detail'); }}
        onClearSelection={clearSelection}
        onEditSelected={() => setMobileView('detail')}
      />
      <EmployeeDetailPanel
        className={cn('flex-1', mobileView === 'list' ? 'hidden lg:flex' : 'flex')}
        selectedInfos={selectedInfos}
        active={active}
        designationCounts={designationCounts}
        onBack={() => setMobileView('list')}
        onPayChange={handlePay}
        onRulesChange={handleRules}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
