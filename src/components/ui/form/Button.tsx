import React, { forwardRef } from 'react';
import { cx } from './cx';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  /** Icon rendered before the label. */
  leftIcon?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  // LeanData green with dark brand text for AA contrast on the bright green.
  primary:
    'bg-[#26D07C] text-[#2a2a2a] font-semibold hover:bg-[#1fb86d] focus:ring-[#26D07C] border border-transparent shadow-sm',
  secondary:
    'bg-white text-gray-700 hover:bg-gray-50 focus:ring-[#26D07C] border border-gray-300 shadow-sm',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent shadow-sm',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-[#26D07C] border border-transparent',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-sm',
};

const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/** Shared button. Variants: primary (brand green), secondary, danger, ghost. */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, leftIcon, disabled, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cx(
        // Disabled buttons render as a neutral grey rather than a faded version
        // of their variant — a 50%-opacity primary washes out to near-invisible
        // on tinted backgrounds (e.g. the green Pricing panel).
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-200 disabled:shadow-none disabled:hover:bg-gray-200',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
    </button>
  );
});

export default Button;
