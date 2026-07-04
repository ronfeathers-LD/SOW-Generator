/**
 * CSV helpers that neutralize spreadsheet formula injection and correctly
 * quote fields. A cell beginning with =, +, -, @, tab or CR is treated as a
 * formula by Excel/Google Sheets; prefixing it with a single quote renders it
 * as literal text. Fields containing commas, quotes, or newlines are quoted
 * (with embedded quotes doubled) so a value can never shift columns/rows.
 */
export function escapeCsvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);

  // Neutralize formula injection.
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }

  // Quote when the value contains a delimiter/quote/newline, or when we added
  // the leading formula-guard quote.
  if (/[",\n\r]/.test(s) || s.startsWith("'")) {
    s = `"${s.replace(/"/g, '""')}"`;
  }

  return s;
}

/** Join a set of cells into a single, safely-escaped CSV row. */
export function toCsvRow(cells: unknown[]): string {
  return cells.map(escapeCsvCell).join(',');
}
