import React, { forwardRef } from 'react';
import { cx } from './cx';
import { CONTROL_BASE, CONTROL_ERROR, FOCUS_RING } from './tokens';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | null | boolean;
}

/** Standard multi-line text control. Use inside <Field>. */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
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

export default Textarea;
