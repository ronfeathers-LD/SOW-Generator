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
