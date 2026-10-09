import React from 'react';

interface SettingRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
  /** A live example shown under the row (see Preview). */
  preview?: React.ReactNode;
}

export function SettingRow({ title, description, children, preview }: SettingRowProps) {
  return (
    <div>
      <div className="flex flex-row items-center justify-between gap-3 sm:gap-6">
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="text-body font-medium text-foreground break-words">{title}</h4>
          <p className="text-ui text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
        <div className="shrink-0 flex items-center">
          {children}
        </div>
      </div>
      {preview && <div className="mt-1.5">{preview}</div>}
    </div>
  );
}
