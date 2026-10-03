import React from 'react';
import { formatCurrency, cn, toTitleCase } from '../../lib/utils';
import { ProcessedEmployee } from '../../types';
import { CreditCard, Clock, Calendar, Zap, AlertTriangle, ChevronLeft, Activity, Lock } from 'lucide-react';

interface EmployeeHeaderProps {
  employee: ProcessedEmployee;
  monthLabel: string;
  onBack?: () => void;
}

export function EmployeeHeader({ employee, monthLabel, onBack }: EmployeeHeaderProps) {
  const isDynamic = employee.rateType === 'dynamic';
  const hourlyRate = employee.hourlyRate ?? 0;
  const dayRate = employee.dayRate ?? 0;

  return (
    <header className="bg-card border-b border-border px-4 lg:px-8 py-4 lg:py-5 shrink-0 shadow-xs">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
          
          <div className="flex flex-col min-w-0 flex-1">
            {/* Row 1: Back + Name + Tag */}
            <div className="flex items-center gap-2 min-w-0">
              {onBack && (
                <button 
                  onClick={onBack}
                  className="md:hidden p-1.5 -ml-1.5 shrink-0 rounded-[var(--radius-interactive)] hover:bg-muted text-foreground transition-colors"
                  aria-label="Back to employee list"
                  id="mobile-back-button"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight truncate min-w-0">
                {toTitleCase(employee.name)}
              </h1>
              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                {employee.isSupport ? 'Support' : 'Official'}
              </span>
            </div>

            {/* Row 2: ERP · Designation */}
            <div className="flex items-center gap-2 text-xs sm:text-sm mt-1.5 text-muted-foreground min-w-0">
              <span className="font-mono font-semibold text-foreground shrink-0">{employee.erp}</span>
              <span className="text-muted-foreground/40 select-none shrink-0">•</span>
              <span className="font-medium text-foreground/90 truncate">{employee.designation}</span>
            </div>

            {/* Row 3: Rate badge · Month */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <div
                className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
                title={!isDynamic ? 'Fixed Rate Policy' : 'Dynamic Rate calculated from Basic Pay'}
              >
                {!isDynamic ? (
                  <>
                    <Lock size={12} className="shrink-0" />
                    <span>Fixed Rate</span>
                  </>
                ) : (
                  <>
                    <Activity size={12} className="shrink-0 text-emerald-500" />
                    <span className="text-foreground">Dynamic Rate</span>
                  </>
                )}
              </div>

              {monthLabel && (
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                  <Calendar size={12} className="text-primary/70 shrink-0" />
                  <span className="font-medium truncate">{monthLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-col lg:flex-row gap-2.5">
            {/* Mobile missing basic pay warning */}
            {isDynamic && employee.basicPay <= 0 && (
              <div className="lg:hidden w-full p-2.5 bg-[var(--color-warning-light)] border border-[var(--color-warning)]/20 rounded-md flex items-center justify-center gap-1.5 text-[var(--color-warning)]"> 
                <AlertTriangle size={14} /> 
                <span className="text-xs font-semibold">Basic Pay is required for dynamic rate calculations</span>
              </div>
            )}
            
            {/* Stat Cards */}
            <div className={cn(
              "grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-2 select-none",
              isDynamic && employee.basicPay <= 0 && "hidden lg:flex"
            )}>
              {isDynamic && (
                <StatCard
                  icon={<CreditCard size={13} />}
                  label="Basic Pay"
                  value={employee.basicPay > 0 ? formatCurrency(employee.basicPay) : (
                    <div className="flex items-center gap-1 text-[var(--color-warning)]">
                      <AlertTriangle size={12} />
                      <span className="text-xs font-bold">Required</span>
                    </div>
                  )}
                  color="bg-muted/50 text-foreground border-border"
                />
              )}
              <StatCard
                icon={<Zap size={13} />}
                label="Rate / Day"
                value={formatCurrency(dayRate)}
                color="bg-card text-foreground border-border"
              />
              <StatCard
                icon={<Clock size={13} />}
                label="Rate / Hour"
                value={formatCurrency(hourlyRate)}
                color="bg-card text-foreground border-border"
              />
              <StatCard
                icon={<CreditCard size={13} />}
                label="Total Overtime"
                value={formatCurrency(employee.totalAmount)}
                color="bg-primary/10 text-primary border-primary/20"
                highlight
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color,
  highlight 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: React.ReactNode; 
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={`px-3 py-2 rounded-lg border ${color} flex flex-col justify-center gap-1 shadow-xs min-w-0`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide opacity-75 leading-none">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`font-mono tabular-nums leading-tight truncate ${highlight ? 'text-[13px] sm:text-sm font-extrabold text-primary' : 'text-[12px] sm:text-[13px] font-bold text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}
