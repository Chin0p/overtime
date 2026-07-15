import React from 'react';
import { formatCurrency, cn } from '../../lib/utils';
import { ProcessedEmployee } from '../../types';
import { Briefcase, CreditCard, Clock, Calendar, Zap, AlertTriangle } from 'lucide-react';

interface EmployeeHeaderProps {
  employee: ProcessedEmployee;
  monthLabel: string;
}

export function EmployeeHeader({ employee, monthLabel }: EmployeeHeaderProps) {
  const hourlyRate = employee.isSupport ? 80 : employee.basicPay / 176;
  const dayRate = employee.isSupport ? 600 : employee.basicPay / 30;

  const filteredRecords = employee.records.filter(r => r.otHours >= 1 || r.isHoliday);
  const totalWorkingDays = filteredRecords.filter(r => !r.isHoliday).length;
  const totalHolidays = filteredRecords.filter(r => r.isHoliday).length;

  return (
    <header className="bg-surface border-b border-white/5 px-4 lg:px-8 pt-4 lg:pt-8 pb-3 lg:pb-4 shrink-0 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 lg:gap-6">
          <div className="flex flex-col gap-2 lg:gap-3 min-w-0">
            {/* Row 1: Name */}
            <h2 className="text-xl lg:text-3xl font-semibold lg:font-bold text-white tracking-tight truncate">{employee.name}</h2>

            {/* Row 2: Location & Duration */}
            <div className="flex flex-wrap items-center gap-x-4 lg:gap-x-6 gap-y-1 lg:gap-y-2">
              <div className="flex items-center gap-1.5 lg:gap-2 text-muted-dim whitespace-nowrap">
                <Briefcase size={14} className="text-muted-dim" />
                <span className="text-xs lg:text-sm font-medium">RHO Islamabad</span>
              </div>
              <div className="flex items-center gap-1.5 lg:gap-2 text-muted-dim whitespace-nowrap">
                <Calendar size={14} className="text-muted-dim" />
                <span className="text-xs lg:text-sm font-medium">{monthLabel}</span>
              </div>
            </div>

            {/* Row 3: Stats */}
            <div className="flex items-center gap-2 lg:gap-3 select-none">
              <div className="flex items-center gap-1 lg:gap-1.5 px-2 py-0.5 bg-accent/10 border border-accent/20 rounded text-[10px] lg:text-xs font-semibold tracking-tight text-white leading-none">
                Working days: {totalWorkingDays}
              </div>
              <div className="flex items-center gap-1 lg:gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] lg:text-xs font-semibold tracking-tight text-amber-400 leading-none">
                Holidays: {totalHolidays}
              </div>
            </div>
          </div>

          <div className="w-full lg:w-auto mt-2 lg:mt-0 flex flex-col lg:flex-row gap-2 lg:gap-3 shrink-0">
            {/* Mobile missing basic pay warning */}
            {!employee.isSupport && employee.basicPay <= 0 && (
              <div className="lg:hidden w-full p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center gap-2 text-amber-400">
                 <AlertTriangle size={16} />
                 <span className="text-xs font-semibold">Basic pay missing. OT will be 0.</span>
              </div>
            )}
            
            {/* Stat Cards - Hidden on mobile if basic pay missing, visible on desktop always */}
            <div className={cn(
              "flex overflow-x-auto no-scrollbar gap-2 lg:gap-3 shrink-0 select-none pb-1 lg:pb-0 w-full lg:w-auto",
              !employee.isSupport && employee.basicPay <= 0 ? "hidden lg:flex" : "flex"
            )}>
              {!employee.isSupport && (
                <StatCard
                  icon={<CreditCard size={14} />}
                  label="Basic pay"
                  value={employee.basicPay > 0 ? formatCurrency(employee.basicPay) : (
                    <div className="flex items-center gap-1.5 text-amber-500">
                      <AlertTriangle size={14} />
                      <span className="text-xs font-bold">Required</span>
                    </div>
                  )}
                  color="bg-surface-hover text-gray-300 border-white/10"
                />
              )}
              <StatCard
                icon={<Zap size={14} />}
                label="Rate / day"
                value={formatCurrency(dayRate)}
                color="bg-amber-500/10 text-amber-400 border-amber-500/20"
              />
              <StatCard
                icon={<Clock size={14} />}
                label="Rate / hour"
                value={formatCurrency(hourlyRate)}
                color="bg-accent/10 text-white border-accent/20"
              />
              <StatCard
                icon={<CreditCard size={14} />}
                label="Total amount"
                value={formatCurrency(employee.totalAmount)}
                color="bg-green-500/10 text-green-400 border-green-500/20"
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
    <div className={`px-3 lg:px-4 py-2 rounded-xl border ${color} flex flex-col justify-center gap-1 lg:gap-0.5 shadow-sm select-none`}>
      <div className="flex items-center gap-1.5 text-[10px] lg:text-xs font-bold tracking-wider opacity-70 leading-none">
        {icon}
        <span className="hidden lg:inline">{label}</span>
      </div>
      <div className="text-xs lg:text-sm font-bold leading-tight">{value}</div>
    </div>
  );
}

