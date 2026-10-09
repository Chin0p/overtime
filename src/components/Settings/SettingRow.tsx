import React, { createContext, useContext, useId } from 'react';

interface SettingRowProps {
  title: string;
  description: string;
  children: React.ReactNode;
  /** A live example shown under the row (see Preview). */
  preview?: React.ReactNode;
}

interface SettingFieldA11y {
  labelledBy: string;
  describedBy: string;
}

const SettingFieldA11yContext = createContext<SettingFieldA11y | null>(null);

/** Shared by setting controls so the visible row title and help text label the actual control. */
export function useSettingFieldA11y() {
  return useContext(SettingFieldA11yContext);
}

export function SettingRow({ title, description, children, preview }: SettingRowProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div>
      <div className="flex flex-row items-center justify-between gap-3 sm:gap-6">
        <div className="flex-1 min-w-0 pr-2">
          <h4 id={titleId} className="text-body font-medium text-foreground break-words">{title}</h4>
          <p id={descriptionId} className="text-ui text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
        <SettingFieldA11yContext.Provider value={{ labelledBy: titleId, describedBy: descriptionId }}>
          <div className="shrink-0 flex items-center">
            {children}
          </div>
        </SettingFieldA11yContext.Provider>
      </div>
      {preview && <div className="mt-1.5">{preview}</div>}
    </div>
  );
}
