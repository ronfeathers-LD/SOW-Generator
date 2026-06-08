import React, { useId } from 'react';
import { cx } from './cx';

interface FieldProps {
  label: string;
  /** Marks the field visually as required (adds a red asterisk). */
  required?: boolean;
  /** Helper text shown below the label, above the control. */
  hint?: string;
  /** Inline validation error. When set, the control should render its error state. */
  error?: string | null;
  /** Optional override for the htmlFor/id wiring. Auto-generated when omitted. */
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Standard labelled form field wrapper: label (+ required marker), optional hint,
 * the control, and an inline error message. Generates a stable id and passes it
 * to the single child control via `id`/`aria-*` so labels and errors are wired up
 * for accessibility without callers repeating the boilerplate.
 */
export default function Field({
  label,
  required = false,
  hint,
  error,
  htmlFor,
  className,
  children,
}: FieldProps) {
  const generatedId = useId();
  const controlId = htmlFor || generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;

  // Wire the single child control to the label/hint/error for a11y, unless the
  // caller already set its own id.
  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: (children.props as { id?: string }).id ?? controlId,
        error: (children.props as { error?: unknown }).error ?? error,
        'aria-describedby':
          [hintId, errorId].filter(Boolean).join(' ') || undefined,
      })
    : children;

  return (
    <div className={cx('space-y-1.5', className)}>
      <label
        htmlFor={controlId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      {child}
      {error && (
        <p id={errorId} className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
