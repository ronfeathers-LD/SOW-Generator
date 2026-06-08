import React, { forwardRef } from 'react';
import { cx } from './cx';
import { CONTROL_BASE, CONTROL_ERROR, FOCUS_RING } from './tokens';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string | null | boolean;
}

/** Standard dropdown. Pass <option> children. Use inside <Field>. */
const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error, className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={error ? true : undefined}
      className={cx(
        CONTROL_BASE,
        'px-3 py-2 pr-10 bg-white',
        FOCUS_RING,
        error && CONTROL_ERROR,
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;
