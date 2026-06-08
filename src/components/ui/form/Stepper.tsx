'use client';

import React from 'react';
import { cx } from './cx';

/** Per-section completion status surfaced in the stepper. */
export type StepStatus = 'complete' | 'attention' | 'empty';

export interface Step {
  /** Stable key used for navigation + URL hash. */
  key: string;
  label: string;
  /** Completion state, drives the icon/colour. Defaults to `empty`. */
  status?: StepStatus;
  /** Optional short caption under the label (e.g. "2 issues"). */
  caption?: string;
}

export interface StepperProps {
  steps: Step[];
  /** Key of the step currently being edited. */
  activeKey: string;
  onStepClick?: (key: string) => void;
  /** Layout: vertical sidebar (default) or compact horizontal bar. */
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

const STATUS_STYLES: Record<StepStatus, { ring: string; bg: string; text: string }> = {
  complete: { ring: 'border-[#26D07C]', bg: 'bg-[#26D07C]', text: 'text-[#2a2a2a]' },
  attention: { ring: 'border-yellow-400', bg: 'bg-yellow-400', text: 'text-white' },
  empty: { ring: 'border-gray-300', bg: 'bg-white', text: 'text-gray-400' },
};

function StepIcon({
  status,
  index,
  active,
}: {
  status: StepStatus;
  index: number;
  active: boolean;
}) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cx(
        'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
        active ? 'border-[#2a2a2a] ring-2 ring-[#26D07C]/30' : s.ring,
        status === 'empty' ? s.bg : s.bg,
        s.text,
      )}
      aria-hidden="true"
    >
      {status === 'complete' ? (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : status === 'attention' ? (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        index + 1
      )}
    </span>
  );
}

/**
 * Progress stepper scaffold for the guided-wizard flow (Workstream A of #280).
 *
 * Renders each section with a completion status (complete ✓ / needs-attention ⚠ /
 * empty) and lets the user jump between sections. Status is computed by the
 * caller (e.g. from per-section validation) and passed in — the stepper is
 * purely presentational so it can drive both the sidebar and a future
 * Review & Submit summary.
 */
export default function Stepper({
  steps,
  activeKey,
  onStepClick,
  orientation = 'vertical',
  className,
}: StepperProps) {
  const horizontal = orientation === 'horizontal';

  return (
    <nav
      aria-label="SOW sections"
      className={cx(
        horizontal ? 'flex items-center gap-2 overflow-x-auto' : 'flex flex-col gap-1',
        className,
      )}
    >
      {steps.map((step, index) => {
        const status = step.status ?? 'empty';
        const active = step.key === activeKey;
        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepClick?.(step.key)}
            aria-current={active ? 'step' : undefined}
            className={cx(
              'group flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
              horizontal ? 'flex-shrink-0' : 'w-full',
              active ? 'bg-[#26D07C]/10' : 'hover:bg-gray-50',
            )}
          >
            <StepIcon status={status} index={index} active={active} />
            <span className="min-w-0">
              <span
                className={cx(
                  'block truncate text-sm font-medium',
                  active ? 'text-[#2a2a2a]' : 'text-gray-700 group-hover:text-gray-900',
                )}
              >
                {step.label}
              </span>
              {step.caption && (
                <span
                  className={cx(
                    'block truncate text-xs',
                    status === 'attention' ? 'text-yellow-600' : 'text-gray-400',
                  )}
                >
                  {step.caption}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
