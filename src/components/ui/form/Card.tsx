import React from 'react';
import { cx } from './cx';

type Tone = 'default' | 'muted' | 'info' | 'success' | 'warning';

const TONES: Record<Tone, string> = {
  default: 'bg-white border-gray-200 shadow-sm',
  muted: 'bg-gray-50 border-gray-200',
  info: 'bg-blue-50 border-blue-200',
  success: 'bg-[#e9faf2] border-[#26D07C]/40',
  warning: 'bg-yellow-50 border-yellow-200',
};

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
} as const;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Background/border treatment. `default` is the standard white panel. */
  tone?: Tone;
  padding?: keyof typeof PADDING;
}

/**
 * Container panel. `default` tone is the standard white card; the colored tones
 * replace the ad-hoc `bg-blue-50` / `bg-green-50` inner panels scattered across
 * the tabs so they share one set of styles.
 */
export default function Card({
  tone = 'default',
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cx('rounded-lg border', TONES[tone], PADDING[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}
