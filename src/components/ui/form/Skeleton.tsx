import React from 'react';
import { cx } from './cx';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tailwind sizing/shape classes, e.g. "h-4 w-32 rounded". */
  className?: string;
}

/**
 * Pulsing placeholder block for loading states. Compose several to sketch the
 * shape of the content that's about to arrive instead of a bare spinner.
 */
export default function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cx('animate-pulse rounded bg-gray-200 dark:bg-dark-surface-alt', className)}
      {...props}
    />
  );
}
