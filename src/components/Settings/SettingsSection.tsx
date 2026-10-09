import React from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * A titled group of settings: one rounded, bordered card with each setting as a row, separated by
 * hairlines (the "grouped list" pattern used by most modern settings screens).
 */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <section>
      <div className="px-1 mb-2">
        <h3 className="text-title text-foreground">{title}</h3>
        {description && <p className="text-ui text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="rounded-xl border border-border bg-card shadow-xs divide-y divide-border overflow-hidden">
        {rows.map((row, i) => (
          <div key={i} className="px-3.5 sm:px-4 py-3">
            {row}
          </div>
        ))}
      </div>
    </section>
  );
}
