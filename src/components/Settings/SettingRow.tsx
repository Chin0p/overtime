import React from 'react';

interface SettingRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-row items-center justify-between gap-3 sm:gap-6">
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-[12px] font-semibold text-foreground truncate">{title}</h4>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{description}</p>
      </div>
      <div className="shrink-0 flex items-center">
        {children}
      </div>
    </div>
  );
}
