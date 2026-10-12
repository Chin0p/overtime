import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type NoticeTone = 'error' | 'warning' | 'success';

const TONES: Record<NoticeTone, { box: string; Icon: typeof AlertCircle }> = {
  error: { box: 'border-destructive/30 bg-destructive/10 text-destructive', Icon: AlertCircle },
  warning: {
    box: 'border-[var(--color-warning)]/30 bg-[var(--color-warning-light)] text-[var(--color-warning)]',
    Icon: AlertTriangle,
  },
  success: {
    box: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    Icon: CheckCircle2,
  },
};

interface NoticeProps {
  tone: NoticeTone;
  /** Optional bold first line. */
  title?: string;
  /** Optional control on the right, such as a Dismiss button. */
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/** The one box for errors, warnings and confirmations. */
export function Notice({ tone, title, action, className, children }: NoticeProps) {
  const { box, Icon } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('p-2.5 rounded-lg border text-caption flex items-start gap-2', box, className)}
    >
      <Icon size={14} className="shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <div className="font-semibold">{title}</div>}
        {children}
      </div>
      {action}
    </div>
  );
}
