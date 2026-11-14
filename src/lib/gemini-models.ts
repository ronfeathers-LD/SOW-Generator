/**
 * Gemini models the app offers and falls back across. Single source for the
 * admin model picker, the log filter and the server-side fallback order.
 *
 * IDs were checked against the live Generative Language API (models.list) on
 * 2026-11-14. Model retirements are announced at
 * https://ai.google.dev/gemini-api/docs/deprecations — update this list when
 * a model here gets a shutdown date.
 */
export interface GeminiModelOption {
  value: string;
  label: string;
  description: string;
}

export const GEMINI_MODELS: GeminiModelOption[] = [
  { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', description: 'Newest Flash model' },
  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', description: 'Previous Flash model' },
  { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', description: 'Fastest and cheapest' },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash (retiring)',
    description: 'Deprecated: Google shuts this model down on or after December 1, 2026',
  },
];

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
