/**
 * Shared design tokens for the SOW form UI revamp (epic #280).
 *
 * Brand: LeanData green `#26D07C` on dark `#2a2a2a`. Form controls historically
 * used inconsistent `indigo-500` focus rings; these tokens standardize on the
 * brand green so every primitive looks the same.
 *
 * Tailwind has no custom theme colors configured, so we rely on arbitrary-value
 * utilities (`focus:ring-[#26D07C]`). Keep the raw hexes here as the single
 * source of truth for anything that needs an inline style (SVGs, charts, etc.).
 */
export const BRAND = {
  green: '#26D07C',
  greenHover: '#1fb86d',
  greenSoft: '#e9faf2',
  dark: '#2a2a2a',
} as const;

/**
 * Standard focus treatment for interactive controls. Applied via className on
 * inputs, selects, textareas, and buttons so focus rings match across the form.
 */
export const FOCUS_RING =
  'focus:outline-none focus:ring-2 focus:ring-[#26D07C] focus:border-[#26D07C]';

/** Base styling shared by text inputs, selects, and textareas. */
export const CONTROL_BASE =
  'block w-full rounded-md border border-gray-300 shadow-sm text-sm text-gray-900 placeholder-gray-400 transition-colors disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

/** Red error treatment layered on top of CONTROL_BASE when a field is invalid. */
export const CONTROL_ERROR =
  'border-red-400 focus:ring-red-500 focus:border-red-500';
