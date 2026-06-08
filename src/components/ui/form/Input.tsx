import React, { forwardRef } from 'react';
import { cx } from './cx';
import { CONTROL_BASE, CONTROL_ERROR, FOCUS_RING } from './tokens';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders the error state styling. The message itself is shown by <Field>. */
  error?: string | null | boolean;
}

/** Standard text input. Use inside <Field> for label/hint/error wiring. */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={error ? true : undefined}
      className={cx(
        CONTROL_BASE,
        'px-3 py-2',
        FOCUS_RING,
        error && CONTROL_ERROR,
        className,
      )}
      {...props}
    />
  );
});

export default Input;
