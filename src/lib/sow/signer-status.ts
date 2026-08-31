/**
 * Customer-signer presence.
 *
 * The customer signer is deliberately NOT a submit gate: a SOW can go for
 * approval before the signing contact has been confirmed. Nothing blocks on
 * it, but every surface that needs to say "this one went out blank" reads the
 * same helper — the pre-submission checklist, the Slack notification that
 * fires on submit, and the approver-facing banner on the SOW page — so the
 * three can never disagree about what counts as missing.
 */

export interface CustomerSignerFields {
  name?: string | null;
  title?: string | null;
}

const isBlank = (value?: string | null): boolean => !value || value.trim() === '';

/** Which customer-signer fields are blank. Empty array = signer is filled in. */
export function missingCustomerSignerFields(signer: CustomerSignerFields): string[] {
  const missing: string[] = [];
  if (isBlank(signer.name)) missing.push('name');
  if (isBlank(signer.title)) missing.push('title');
  return missing;
}

export function hasCustomerSigner(signer: CustomerSignerFields): boolean {
  return missingCustomerSignerFields(signer).length === 0;
}

/**
 * One-line warning for reviewers/approvers, or null when nothing is missing.
 * Phrased as a heads-up, not an error — approvers decide whether to let it through.
 */
export function customerSignerWarning(signer: CustomerSignerFields): string | null {
  const missing = missingCustomerSignerFields(signer);
  if (missing.length === 0) return null;
  if (missing.length === 2) {
    return 'No customer signer has been entered — both the signer name and title are blank.';
  }
  return `The customer signer ${missing[0]} is blank.`;
}
