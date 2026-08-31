/**
 * What prints under a customer signature line.
 *
 * There are two independent renderers for the SOW title page — the React
 * component `SOWTitlePage` (screen, print view, and the Puppeteer capture) and
 * the HTML string built by `generateSOWHTML` in src/lib/pdf-generator.ts. They
 * drifted once already: when the customer signer stopped being required, the
 * React side was updated and the PDF kept printing the literal placeholders
 * "Client Representative / Title / Email".
 *
 * This module owns the decision — which lines print, in what order — so both
 * renderers only decide how to mark it up.
 */
import { formatAddressLines } from './format-address';

/**
 * Legacy sentinel strings. Older callers wrote these in place of a blank
 * value, so SOWs saved before they were removed still carry them. Treated as
 * "not provided" rather than printed onto the document.
 */
const PLACEHOLDER_VALUES = new Set([
  'Not Entered',
  'Title Not Entered',
  'Email Not Entered',
  'None Selected',
  'Client Representative',
  'Title',
  'Email',
]);

export function providedOrNull(value?: string | null): string | null {
  const trimmed = (value ?? '').trim();
  if (trimmed === '' || PLACEHOLDER_VALUES.has(trimmed)) return null;
  return trimmed;
}

export interface SignatureBlock {
  /** Bold first line: the signer's name, or the company name in its place. */
  heading: string | null;
  /** Remaining lines in print order — title/email, or address lines. */
  lines: string[];
  /** True when this fell back to the company because no signer was named. */
  usedCompanyFallback: boolean;
}

/**
 * A named signer always wins. Only when name, title and email are all blank
 * does the block fall back to the customer's company identity, which reads as
 * a normal unsigned contract: the entity is known, the individual signs on the
 * line above. With neither on file nothing prints, rather than a placeholder.
 */
export function customerSignatureBlock(params: {
  signer?: { name?: string | null; title?: string | null; email?: string | null };
  company?: { name?: string | null; address?: string | null };
}): SignatureBlock {
  const signerLines = [
    providedOrNull(params.signer?.name),
    providedOrNull(params.signer?.title),
    providedOrNull(params.signer?.email),
  ].filter((line): line is string => line !== null);

  if (signerLines.length > 0) {
    return {
      heading: signerLines[0],
      lines: signerLines.slice(1),
      usedCompanyFallback: false,
    };
  }

  const companyLines = [
    providedOrNull(params.company?.name),
    ...formatAddressLines(providedOrNull(params.company?.address)),
  ].filter((line): line is string => line !== null);

  return {
    heading: companyLines[0] ?? null,
    lines: companyLines.slice(1),
    usedCompanyFallback: true,
  };
}
