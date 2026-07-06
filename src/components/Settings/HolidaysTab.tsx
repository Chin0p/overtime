import React, { useState } from 'react';
import { Holiday } from '../../types';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HolidaysTabProps {
  holidays: Holiday[];
  onChange: (holidays: Holiday[]) => void;
}

export function HolidaysTab({ holidays, onChange }: HolidaysTabProps) {
  const [holidayToDelete, setHolidayToDelete] = useState<number | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateDate = (dateStr: string) => {
    // Format: dd-mmm-yyyy (e.g., 10-Dec-2025)
    const regex = /^(\d{2})-([A-Z][a-z]{2})-(\d{4})$/;
    const match = dateStr.match(regex);
    if (!match) return false;
    const [_, day, month] = match;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (!months.includes(month)) return false;
    const d = parseInt(day);
    if (d < 1 || d > 31) return false;
    return true;
  };

  const addHoliday = () => {
    setError(null);
    if (!newDate.trim()) return;
    
    if (!validateDate(newDate.trim())) {
      setError('Invalid format. Use dd-mmm-yyyy (e.g., 10-Dec-2025)');
      return;
    }

    if (holidays.some(h => h.date === newDate.trim())) {
      setError('This date is already added as a holiday.');
      return;
    }

    onChange([...holidays, { 
      date: newDate.trim(), 
      name: newName.trim() || 'Holiday' 
    }]);
    setNewDate('');
    setNewName('');
  };

  const removeHoliday = (index: number) => {
    onChange(holidays.filter((_, i) => i !== index));
    setHolidayToDelete(null);
  };

  return (
    <div className="space-y-6">
      {holidayToDelete !== null && (
        <DeleteConfirmDialog
          title="Delete holiday"
          item={holidays[holidayToDelete]?.date || 'this holiday'}
          confirmString={holidays[holidayToDelete]?.date}
          onConfirm={() => removeHoliday(holidayToDelete)}
          onCancel={() => setHolidayToDelete(null)}
        />
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-md text-muted font-semibold tracking-wide">Gazetted holidays</h3>
      </div>

      <div className="space-y-4">
        {/* Add New Holiday Row */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
            <input
              type="text"
              placeholder="dd-mmm-yyyy"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                if (error) setError(null);
              }}
              className={cn(
                "w-32 px-3 py-2 bg-background border rounded-lg text-sm text-white focus:ring-2 outline-none transition-all",
                error ? "border-red-500/50 focus:ring-red-500/20" : "border-white/10 focus:ring-white/20"
              )}
            />
            <input
              type="text"
              placeholder="Holiday name (optional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-white/20 outline-none"
            />
            <button
              onClick={addHoliday}
              disabled={!newDate.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-black text-sm font-bold rounded-full disabled:opacity-50 transition-all shrink-0"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>
          {error && (
            <p className="text-2xs text-red-400 font-medium ml-1">{error}</p>
          )}
        </div>

        <div className="space-y-2">
          {holidays.length > 0 ? (
            holidays.map((holiday, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-surface-hover/30 border border-white/5 rounded-xl group">
                <div className="w-32 px-3 py-2 text-sm text-white font-medium select-none">
                  {holiday.date}
                </div>
                <div className="flex-1 px-3 py-2 text-sm text-muted select-none">
                  {holiday.name}
                </div>
                <button
                  onClick={() => setHolidayToDelete(idx)}
                  className="p-2 text-muted-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 btn-click"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-dim text-sm border-2 border-dashed border-white/5 rounded-2xl">
              No gazetted holidays added
            </div>
          )}
        </div>
      </div>
      
      <p className="text-2xs text-muted-dim italic select-none">
        * Weekends (Saturday & Sunday) are automatically detected and don't need to be added here.
      </p>
    </div>
  );
}

function DeleteConfirmDialog({ 
  onConfirm, 
  onCancel, 
  title, 
  item,
  confirmString = 'DELETE'
}: { 
  onConfirm: () => void, 
  onCancel: () => void, 
  title: string, 
  item: string,
  confirmString?: string
}) {
  const [input, setInput] = useState('');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-white/5 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-muted mb-6">
          Are you sure you want to delete <span className="text-white font-semibold">"{item}"</span>? 
          Type <span className="text-red-400 font-mono font-bold">{confirmString}</span> to confirm.
        </p>
        <input
          type="text"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Type ${confirmString}`}
          className="w-full px-4 py-2 bg-background border border-white/5 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/50 outline-none mb-6"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm font-bold text-muted hover:bg-surface-hover rounded-xl transition-all">
            Cancel
          </button>
          <button
            disabled={input !== confirmString}
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
