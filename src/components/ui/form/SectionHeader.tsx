import React from 'react';
import { cx } from './cx';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned slot for actions (e.g. a "Get from Salesforce" button). */
  action?: React.ReactNode;
  /** Heading level for correct document outline. Defaults to h2. */
  as?: 'h2' | 'h3';
  className?: string;
}

/** Standard section heading: title + optional description and action slot. */
export default function SectionHeader({
  title,
  description,
  action,
  as: Heading = 'h2',
  className,
}: SectionHeaderProps) {
  const titleSize = Heading === 'h2' ? 'text-xl' : 'text-lg';
  return (
    <div className={cx('flex items-start justify-between gap-4', className)}>
      <div>
        <Heading className={cx(titleSize, 'font-semibold text-gray-900 dark:text-dark-text')}>
          {title}
        </Heading>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-dark-text-muted">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
