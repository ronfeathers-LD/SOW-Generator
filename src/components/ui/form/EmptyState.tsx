import React from 'react';
import { cx } from './cx';

export interface EmptyStateProps {
  /** Short headline, e.g. "No client roles yet". */
  title: string;
  /** Optional supporting line explaining what to do next. */
  description?: string;
  /** Optional leading icon (defaults to a neutral document glyph). */
  icon?: React.ReactNode;
  /** Optional call-to-action (usually a Button). */
  action?: React.ReactNode;
  className?: string;
}

const DEFAULT_ICON = (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

/**
 * Neutral placeholder for a section that has no content yet. Replaces the
 * "nothing renders" gaps (e.g. an empty client-roles list) with a clear prompt.
 */
export default function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50/60 px-6 py-10 text-center dark:border-dark-border dark:bg-dark-surface-alt/50',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-dark-elevated dark:text-dark-text-subtle">
        {icon ?? DEFAULT_ICON}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-900 dark:text-dark-text">{title}</p>
        {description && (
          <p className="text-sm text-gray-500 dark:text-dark-text-muted">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
