import React from 'react';
import { formatCurrency, cn } from '../../lib/utils';
import { ProcessedEmployee } from '../../types';
import { Briefcase, CreditCard, Clock, Calendar, Zap, AlertTriangle, ChevronLeft, Activity, Lock } from 'lucide-react';

interface EmployeeHeaderProps {
  employee: ProcessedEmployee;
  monthLabel: string;
  onBack?: () => void;
}

export function EmployeeHeader({ employee, monthLabel, onBack }: EmployeeHeaderProps) {
  const isDynamic = employee.rateType === 'dynamic';
  const hourlyRate = !isDynamic ? 80 : employee.basicPay / 176;
  const dayRate = !isDynamic ? 600 : employee.basicPay / 30;

  const filteredRecords = employee.records.filter(r => r.otHours >= 1 || r.isHoliday);
  const totalWorkingDays = filteredRecords.filter(r => !r.isHoliday).length;
  const totalHolidays = filteredRecords.filter(r => r.isHoliday).length;

  return (
    <header className="bg-card border-b border-border px-4 lg:px-8 pt-4 lg:pt-8 pb-3 lg:pb-4 shrink-0 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-6">
          
          <div className="flex flex-col gap-2 lg:gap-3 min-w-0">
            {/* Row 1: Name */}
            <div className="flex items-center gap-3">
              {onBack && (
                <button 
                  onClick={onBack}
                  className="md:hidden p-1.5 -ml-1.5 rounded-[var(--radius-interactive)] hover:bg-[var(--color-neutral-hover)] active:bg-[var(--color-neutral-pressed)] text-[var(--color-text-main)] transition-colors focus-visible:ring-1 focus-visible:ring-[var(--color-focus-ring)]"
                  aria-label="Back to employee list"
                  id="mobile-back-button"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <h2 className="text-xl lg:text-2xl font-semibold lg:font-bold text-[var(--color-text-main)] tracking-tight truncate">
                {employee.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] lg:text-xs font-bold uppercase tracking-wider">
                  {employee.isSupport ? 'Support' : 'Official'}
                </span>
                <div title={!isDynamic ? 'Fixed Rate' : 'Dynamic Rate'} className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                  {!isDynamic ? <Lock size={14} /> : <Activity size={14} />}
                </div>
              </div>
            </div>
            
            {/* Row 2: Location & Duration */}
            <div className="flex flex-wrap items-center gap-x-4 lg:gap-x-6 gap-y-1 lg:gap-y-2">
              <div className="flex items-center gap-1.5 lg:gap-2 text-muted-foreground whitespace-nowrap">
                <Calendar size={14} className="text-muted-foreground" />
                <span className="text-xs lg:text-sm font-medium">{monthLabel}</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-auto mt-2 lg:mt-0 flex flex-col lg:flex-row gap-2 lg:gap-3 shrink-0">
            {/* Mobile missing basic pay warning */}
            {isDynamic && employee.basicPay <= 0 && (
              <div className="lg:hidden w-full p-3 bg-[var(--color-warning-light)] border border-[var(--color-warning)]/20 rounded-[var(--radius-interactive)] flex items-center justify-center gap-2 text-[var(--color-warning)]"> 
                <AlertTriangle size={16} /> 
                <span className="text-xs font-semibold">Basic pay missing</span>
              </div>
            )}
            
            {/* Stat Cards - Hidden on mobile if basic pay missing, visible on desktop always */}
            <div className={cn(
              "flex overflow-x-auto no-scrollbar gap-2 lg:gap-3 shrink-0 select-none pb-1 lg:pb-0 w-full lg:w-auto",
              isDynamic && employee.basicPay <= 0 ? "hidden lg:flex" : "flex"
            )}>
              {isDynamic && (
                <StatCard
                  icon={<CreditCard size={14} />}
                  label="Basic pay"
                  value={employee.basicPay > 0 ? formatCurrency(employee.basicPay) : (
                    <div className="flex items-center gap-1.5 text-[var(--color-warning)]">
                      <AlertTriangle size={14} />
                      <span className="text-xs font-bold">Required</span>
                    </div>
                  )}
                  color="bg-muted/50 text-foreground border-border"
                />
              )}
              <StatCard
                icon={<Zap size={14} />}
                label="Rate / day"
                value={formatCurrency(dayRate)}
                color="bg-card text-foreground border-border"
              />
              <StatCard
                icon={<Clock size={14} />}
                label="Rate / hour"
                value={formatCurrency(hourlyRate)}
                color="bg-card text-foreground border-border"
              />
              <StatCard
                icon={<CreditCard size={14} />}
                label="Total amount"
                value={formatCurrency(employee.totalAmount)}
                color="bg-primary/10 text-primary border-primary/20"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: React.ReactNode, color: string }) {
  return (
    <div className={`px-3 lg:px-4 py-2 rounded-lg border ${color} flex flex-col justify-center gap-1 lg:gap-0.5 shadow-sm select-none`}>
      <div className="flex items-center gap-1.5 text-[10px] lg:text-xs font-bold tracking-wider opacity-70 leading-none">
        {icon}
        <span className="hidden lg:inline">{label}</span>
      </div>
      <div className="text-xs lg:text-sm font-bold leading-tight">{value}</div>
    </div>
  );
}
