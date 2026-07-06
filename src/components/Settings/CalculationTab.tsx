import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { OTSettings } from '../../types';
import { cn } from '../../lib/utils';
import { NumberInput } from '../ui/NumberInput';

interface CalculationTabProps {
  policy: OTSettings['policy'];
  onChange: (policy: OTSettings['policy']) => void;
}

export function CalculationTab({ policy, onChange }: CalculationTabProps) {
  const [newDesignation, setNewDesignation] = useState('');
  const [designationToDelete, setDesignationToDelete] = useState<string | null>(null);

  const updateOfficial = (updates: Partial<OTSettings['policy']['official']>) => {
    onChange({
      ...policy,
      official: { ...policy.official, ...updates }
    });
  };

  const updateSupport = (updates: Partial<OTSettings['policy']['support']>) => {
    onChange({
      ...policy,
      support: { ...policy.support, ...updates }
    });
  };

  const addDesignation = () => {
    if (!newDesignation.trim()) return;
    if (policy.support.designations.includes(newDesignation.trim())) return;
    updateSupport({
      designations: [...policy.support.designations, newDesignation.trim()]
    });
    setNewDesignation('');
  };

  const removeDesignation = (designation: string) => {
    updateSupport({
      designations: policy.support.designations.filter(d => d !== designation)
    });
    setDesignationToDelete(null);
  };

  return (
    <div className="space-y-10">
      {designationToDelete && (
        <DeleteConfirmDialog
          title="Delete designation"
          item={designationToDelete}
          onConfirm={() => removeDesignation(designationToDelete)}
          onCancel={() => setDesignationToDelete(null)}
        />
      )}
      <section>
        <h3 className="text-md font-bold text-muted mb-6">Common rules</h3>
        <div className="space-y-6">
          <SettingRow
            title="Min overtime threshold"
            description="Minimum overtime hours required to be eligible for payment."
          >
            <NumberInput
              value={policy.minThreshold}
              onChange={(val) => onChange({ ...policy, minThreshold: val })}
              suffix="hrs"
            />
          </SettingRow>
          <SettingRow
            title="Late arrival adjustment"
            description="Deduct late arrival time from the total overtime hours."
          >
            <Switch
              checked={policy.lateArrivalToggle}
              onChange={(checked) => onChange({ ...policy, lateArrivalToggle: checked })}
            />
          </SettingRow>
        </div>
      </section>

      <div className="h-px bg-white/5" />

      <section>
        <h3 className="text-md font-bold text-muted mb-6">Official staff</h3>
        <div className="space-y-6">
          <SettingRow
            title="Daily overtime cap"
            description="Maximum overtime hours allowed per day for official staff."
          >
            <NumberInput
              value={policy.official.dailyOTCap}
              onChange={(val) => updateOfficial({ dailyOTCap: val })}
              suffix="hrs"
            />
          </SettingRow>
          <SettingRow
            title="Max daily amount"
            description="Maximum amount payable per day for official staff."
          >
            <NumberInput
              value={policy.official.maxDailyAmount}
              onChange={(val) => updateOfficial({ maxDailyAmount: val })}
              suffix="PKR"
            />
          </SettingRow>
          <SettingRow
            title="Monthly day cap"
            description="Maximum number of working days for which Overtime is payable in a month."
          >
            <NumberInput
              value={policy.official.monthlyDayCap}
              onChange={(val) => updateOfficial({ monthlyDayCap: val })}
              suffix="days"
            />
          </SettingRow>
        </div>
      </section>

      <div className="h-px bg-white/5" />

      <section>
        <h3 className="text-md font-bold text-muted mb-6">Support staff</h3>
        <div className="space-y-6">
          <SettingRow
            title="Daily overtime cap"
            description="Maximum overtime hours allowed per day for support staff."
          >
            <NumberInput
              value={policy.support.dailyOTCap}
              onChange={(val) => updateSupport({ dailyOTCap: val })}
              suffix="hrs"
            />
          </SettingRow>
          <SettingRow
            title="Hourly rate"
            description="Fixed hourly rate for support staff overtime."
          >
            <NumberInput
              value={policy.support.hourlyRate}
              onChange={(val) => updateSupport({ hourlyRate: val })}
              suffix="PKR"
            />
          </SettingRow>
          <SettingRow
            title="Holiday rate"
            description="Fixed daily rate for support staff working on holidays."
          >
            <NumberInput
              value={policy.support.holidayRate}
              onChange={(val) => updateSupport({ holidayRate: val })}
              suffix="PKR"
            />
          </SettingRow>
          <div>
            <h4 className="text-sm font-bold text-white mb-2">Support staff designations</h4>
            <p className="text-xs text-muted mb-4">Employees with these designations will be treated as support staff.</p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Add designation (e.g. Driver)"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDesignation()}
                className="flex-1 px-4 py-2 bg-background border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-white/20 outline-none transition-all"
              />
              <button
                onClick={addDesignation}
                className="p-2 bg-accent hover:bg-accent-hover text-black rounded-full transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {policy.support.designations.map(d => (
                <div
                  key={d}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface-hover border border-white/5 rounded-lg text-xs font-medium text-muted group"
                >
                  {d}
                  <button
                    onClick={() => setDesignationToDelete(d)}
                    className="text-muted-dim hover:text-red-400 transition-colors"
                    aria-label={`Remove designation ${d}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {policy.support.designations.length === 0 && (
                <p className="text-xs text-muted-dim italic">No designations added.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingRow({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <div className="flex-1">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <p className="text-xs text-muted mt-1 leading-relaxed">{description}</p>
      </div>
      <div className="shrink-0">
        {children}
      </div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        checked ? "bg-accent" : "bg-white/10"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5 bg-black" : "translate-x-0 bg-white"
        )}
      />
    </button>
  );
}

function DeleteConfirmDialog({
  onConfirm,
  onCancel,
  title,
  item
}: {
  onConfirm: () => void,
  onCancel: () => void,
  title: string,
  item: string
}) {
  const [input, setInput] = useState('');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-white/5 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-muted mb-5">
          Are you sure you want to delete? Type <span className="text-red-400 font-mono font-bold">{item.toUpperCase()}</span> to confirm.
        </p>
        <input
          type="text"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Type ${item.toUpperCase()}`}
          className="w-full px-4 py-2 bg-background border border-white/5 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/50 outline-none mb-6"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm font-bold text-muted hover:bg-surface-hover rounded-xl transition-all">
            Cancel
          </button>
          <button
            disabled={input !== item.toUpperCase()}
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
