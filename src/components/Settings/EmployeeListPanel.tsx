import { Search, Layers, ArrowUpDown, SlidersHorizontal, Check, ChevronLeft, X, AlertCircle } from 'lucide-react';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Button, buttonVariants } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn, toTitleCase, formatAmount } from '../../lib/utils';
import { EmployeeCategory } from '../../types';
import {
  CATEGORY_LABEL,
  EMPTY_FILTERS,
  EmployeeInfo,
  Filters,
  GroupBy,
  InfoBadges,
  InfoGroup,
  Rate,
  SortBy,
  filterCount,
} from './employeeShared';

interface EmployeeListPanelProps {
  className?: string;
  totalCount: number;
  groups: InfoGroup[];
  visibleCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  groupBy: GroupBy;
  onGroupByChange: (v: GroupBy) => void;
  sortBy: SortBy;
  sortDesc: boolean;
  onSortChange: (by: SortBy, desc: boolean) => void;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  selected: Set<string>;
  activeErp: string | null;
  allVisibleSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (erp: string) => void;
  onToggleGroup: (items: EmployeeInfo[]) => void;
  onOpen: (erp: string) => void;
  onClearSelection: () => void;
  onEditSelected: () => void;
}

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'none', label: 'No grouping' },
  { value: 'designation', label: 'Designation' },
  { value: 'pay', label: 'Basic pay' },
  { value: 'category', label: 'Category' },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'erp', label: 'ERP' },
  { value: 'designation', label: 'Designation' },
  { value: 'pay', label: 'Basic pay' },
];

const toolbarBtn = (active: boolean) =>
  cn(
    buttonVariants({ variant: 'outline', size: 'sm' }),
    'h-8 gap-1.5 px-2.5 text-caption cursor-pointer',
    active && 'text-primary border-primary',
  );

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function EmployeeListPanel(props: EmployeeListPanelProps) {
  const {
    className, totalCount, groups, visibleCount, search, onSearchChange, groupBy, onGroupByChange,
    sortBy, sortDesc, onSortChange, filters, onFiltersChange, selected, activeErp,
    allVisibleSelected, onToggleAll, onToggleOne, onToggleGroup, onOpen, onClearSelection, onEditSelected,
  } = props;

  const nFilters = filterCount(filters);
  const hasActiveView = nFilters > 0 || search.trim() !== '' || groupBy !== 'none';

  return (
    <div className={cn('flex flex-col min-h-0 bg-card', className)}>
      {/* Controls */}
      <div className="shrink-0 p-2.5 space-y-2 border-b border-border">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            size={13}
          />
          <Input
            type="text"
            placeholder="Search name, ERP, or designation..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 text-ui h-8 w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Group */}
          <DropdownMenu>
            <DropdownMenuTrigger className={toolbarBtn(groupBy !== 'none')}>
              <Layers size={13} />
              <span>Group</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel>Group by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {GROUP_OPTIONS.map((o) => (
                <DropdownMenuItem key={o.value} onClick={() => onGroupByChange(o.value)}>
                  {o.label}
                  {groupBy === o.value && <Check size={14} className="ml-auto text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger className={toolbarBtn(sortBy !== 'name' || sortDesc)}>
              <ArrowUpDown size={13} />
              <span>Sort</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SORT_OPTIONS.map((o) => (
                <DropdownMenuItem key={o.value} onClick={() => onSortChange(o.value, sortDesc)}>
                  {o.label}
                  {sortBy === o.value && <Check size={14} className="ml-auto text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSortChange(sortBy, false)}>
                Ascending
                {!sortDesc && <Check size={14} className="ml-auto text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange(sortBy, true)}>
                Descending
                {sortDesc && <Check size={14} className="ml-auto text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger className={toolbarBtn(nFilters > 0)}>
              <SlidersHorizontal size={13} />
              <span>Filter</span>
              {nFilters > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-micro leading-4 text-center">
                  {nFilters}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Category</DropdownMenuLabel>
              {(['support', 'official', 'exempt'] as EmployeeCategory[]).map((c) => (
                <DropdownMenuCheckboxItem
                  key={c}
                  checked={filters.categories.includes(c)}
                  onCheckedChange={() => onFiltersChange({ ...filters, categories: toggle(filters.categories, c) })}
                >
                  {CATEGORY_LABEL[c]}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Rate type</DropdownMenuLabel>
              {(['fixed', 'dynamic'] as Rate[]).map((r) => (
                <DropdownMenuCheckboxItem
                  key={r}
                  checked={filters.rates.includes(r)}
                  onCheckedChange={() => onFiltersChange({ ...filters, rates: toggle(filters.rates, r) })}
                >
                  {r === 'fixed' ? 'Fixed' : 'Dynamic'}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filters.missingPay}
                onCheckedChange={(v) => onFiltersChange({ ...filters, missingPay: !!v })}
              >
                Missing basic pay
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveView && (
            <button
              type="button"
              onClick={() => {
                onFiltersChange(EMPTY_FILTERS);
                onSearchChange('');
                onGroupByChange('none');
              }}
              className="ml-auto text-caption text-muted-foreground hover:text-foreground px-1 py-1.5"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Select-all strip */}
      <div className="shrink-0 flex items-center gap-2.5 px-3 py-1.5 border-b border-border bg-muted/30 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
        <Checkbox size="sm" checked={allVisibleSelected} onChange={onToggleAll} title="Select all shown" />
        <span>
          {visibleCount === totalCount ? `${totalCount} employees` : `${visibleCount} of ${totalCount} employees`}
        </span>
      </div>

      {/* List — scrolls on its own */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {visibleCount === 0 ? (
          <div className="m-3 text-center py-10 text-muted-foreground text-caption border-2 border-dashed border-border rounded-lg select-none">
            No employees match your search or filters
          </div>
        ) : (
          groups.map((g) => {
            const groupSelected = g.items.every((i) => selected.has(i.emp.erp));
            return (
              <section key={g.key}>
                {groupBy !== 'none' && (
                  <div className="sticky top-0 z-10 flex items-center gap-2.5 px-3 py-1.5 bg-muted border-b border-border">
                    <Checkbox
                      size="sm"
                      checked={groupSelected}
                      onChange={() => onToggleGroup(g.items)}
                      title={`Select everyone in ${g.label}`}
                    />
                    <span className="flex-1 min-w-0 truncate text-micro font-semibold uppercase tracking-wide text-foreground">
                      {g.label}
                    </span>
                    <span className="shrink-0 text-micro text-muted-foreground">{g.items.length}</span>
                  </div>
                )}
                {g.items.map((info) => {
                  const { emp } = info;
                  const isSelected = selected.has(emp.erp);
                  const isActive = activeErp === emp.erp && selected.size === 0;
                  const usesPay = info.category !== 'exempt' && info.rate === 'dynamic';
                  return (
                    <div
                      key={emp.erp}
                      className={cn(
                        'flex items-center gap-2.5 pl-3 pr-2 border-b border-border/60 transition-colors',
                        isSelected ? 'bg-primary/5' : isActive ? 'bg-[var(--color-neutral-active)]' : 'hover:bg-muted/30',
                        info.category === 'exempt' && 'opacity-70',
                      )}
                    >
                      <Checkbox size="sm" checked={isSelected} onChange={() => onToggleOne(emp.erp)} />
                      <button
                        type="button"
                        onClick={() => onOpen(emp.erp)}
                        className="flex-1 min-w-0 text-left py-2.5 outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                      >
                        {/* Row 1: name + tags on ONE line (name truncates instead of the tags wrapping) */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="min-w-0 truncate text-ui font-semibold text-foreground">{toTitleCase(emp.name)}</span>
                          <span className="flex items-center gap-1 shrink-0">
                            <InfoBadges info={info} />
                          </span>
                        </div>
                        <div className="text-micro font-mono text-muted-foreground truncate mt-0.5">
                          {emp.erp}
                          <span className="mx-1 opacity-50">·</span>
                          <span className="font-sans">{emp.designation}</span>
                        </div>
                      </button>
                      <PayCell info={info} usesPay={usesPay} />
                    </div>
                  );
                })}
              </section>
            );
          })
        )}
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-t border-primary/20 bg-[var(--color-neutral-active)]">
          <span className="text-caption font-semibold text-[var(--color-accent)]">{selected.size} selected</span>
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1 rounded text-muted-foreground hover:text-foreground"
            title="Clear selection"
          >
            <X size={13} />
          </button>
          <Button size="sm" className="ml-auto h-7 px-3 text-caption lg:hidden" onClick={onEditSelected}>
            Edit
            <ChevronLeft size={12} className="rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
}

/** Right-aligned pay column: amount over a unit caption; clear state for missing / not-applicable pay. */
function PayCell({ info, usesPay }: { info: EmployeeInfo; usesPay: boolean }) {
  if (!usesPay) {
    return (
      <div className="shrink-0 w-[72px] text-right text-ui text-muted-foreground/60" title="Basic pay isn't used for this designation">
        —
      </div>
    );
  }
  if (info.pay <= 0) {
    return (
      <div className="shrink-0 w-[72px] flex justify-end">
        <span className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning-light)] text-[var(--color-warning)] text-micro font-semibold leading-none whitespace-nowrap">
          <AlertCircle size={11} className="shrink-0" />
          Set pay
        </span>
      </div>
    );
  }
  return (
    <div className="shrink-0 w-[72px] text-right">
      <div className="text-ui font-semibold font-mono tabular-nums text-foreground leading-none">
        {formatAmount(info.pay)}
      </div>
      <div className="mt-1 text-micro uppercase tracking-wider text-muted-foreground leading-none">PKR / month</div>
    </div>
  );
}
