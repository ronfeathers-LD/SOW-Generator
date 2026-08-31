/**
 * Turn a stored billing address into conventional mailing-address lines.
 *
 * Addresses reach us as one comma-joined string: `getAccountBillingInfo` in
 * src/lib/salesforce.ts joins BillingStreet, BillingCity, BillingState,
 * BillingPostalCode and BillingCountry with ", ", dropping empty fields. The
 * field is also a free-text textarea on the Billing Information tab, so it can
 * be anything a person types.
 *
 * Splitting naively on commas gives one line per field, which prints as
 *
 *     1 Billing Lane
 *     San Jose
 *     CA
 *     94070
 *     United States
 *
 * where conventional formatting puts the locality on one line:
 *
 *     1 Billing Lane
 *     San Jose, CA 94070
 *     United States
 *
 * The postal code is the anchor: it is the one part with a recognisable shape,
 * and in the producer's field order the region sits immediately before it and
 * the city before that. When no postal code can be found the input is not a
 * structured address, so each part keeps its own line rather than being
 * guessed at.
 */

/** US ZIP, with or without the +4 suffix. */
const US_ZIP = /^\d{5}(-\d{4})?$/;
/** Canadian postal code, e.g. K1A 0B1. */
const CA_POSTAL = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
/** UK postcode, e.g. SW1A 1AA. */
const UK_POSTAL = /^[A-Za-z]{1,2}\d[A-Za-z\d]?[ ]?\d[A-Za-z]{2}$/;
/** Bare numeric postal codes (most of Europe, India, Australia, …). */
const NUMERIC_POSTAL = /^\d{4,6}$/;

function isPostalCode(part: string): boolean {
  return (
    US_ZIP.test(part) ||
    CA_POSTAL.test(part) ||
    UK_POSTAL.test(part) ||
    NUMERIC_POSTAL.test(part)
  );
}

/**
 * A part that already carries region and postal code together, e.g. "CA 94105"
 * or "NSW 2000" — Salesforce emits these separately, but hand-typed addresses
 * routinely combine them.
 */
function splitRegionAndPostal(part: string): { region: string; postal: string } | null {
  const match = part.match(/^(.*\S)\s+(\S+)$/);
  if (!match) return null;
  const [, region, postal] = match;
  if (!isPostalCode(postal)) return null;
  if (/\d/.test(region)) return null; // a street number, not a region
  return { region, postal };
}

/** Administrative codes: CA, NY, ON, NSW. The reliable region signal. */
const REGION_CODE = /^[A-Za-z]{2,3}$/;

/** Street lines almost always open with a number: "1 Billing Lane". */
const STARTS_WITH_NUMBER = /^\d/;

export function formatAddressLines(address?: string | null): string[] {
  const raw = (address ?? '').trim();
  if (raw === '') return [];

  // Someone typed their own line breaks — that is an explicit choice, keep it.
  if (/[\r\n]/.test(raw)) {
    return raw
      .split(/[\r\n]+/)
      .map((line) => line.trim())
      .filter((line) => line !== '');
  }

  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
  if (parts.length <= 1) return parts;

  // Find the postal code, searching from the end: the tail of the string is
  // the structured part, and a street number should never win over a ZIP.
  let postalIndex = -1;
  let region: string | null = null;
  let postal: string | null = null;

  for (let i = parts.length - 1; i >= 0; i--) {
    if (isPostalCode(parts[i])) {
      postalIndex = i;
      postal = parts[i];
      break;
    }
    const combined = splitRegionAndPostal(parts[i]);
    if (combined) {
      postalIndex = i;
      region = combined.region;
      postal = combined.postal;
      break;
    }
  }

  // Not a structured address — don't guess, keep one part per line.
  if (postalIndex === -1 || postal === null) return parts;

  let cityIndex = postalIndex - 1;
  const candidateIndex = postalIndex - 1;
  // Claim the part before the postal code as the region only when something
  // is left to be the city (index >= 1), and only on real evidence: either it
  // is an administrative code, or the part before it cannot be a street line.
  // Without the second test, "1 Billing Lane, San Jose, 94070" reads "San Jose"
  // as the region and promotes the street to city.
  if (region === null && candidateIndex >= 1) {
    const candidate = parts[candidateIndex];
    const precedingIsStreet = STARTS_WITH_NUMBER.test(parts[candidateIndex - 1]);
    if (REGION_CODE.test(candidate) || !precedingIsStreet) {
      region = candidate;
      cityIndex = candidateIndex - 1;
    }
  }

  const city = cityIndex >= 0 ? parts[cityIndex] : null;
  const locality = [city, region].filter(Boolean).join(', ');
  const localityLine = locality === '' ? postal : `${locality} ${postal}`;

  return [
    ...parts.slice(0, Math.max(cityIndex, 0)),
    localityLine,
    ...parts.slice(postalIndex + 1),
  ];
}
