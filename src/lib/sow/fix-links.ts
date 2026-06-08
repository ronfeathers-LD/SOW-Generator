/**
 * Maps a SOW validation message to a deep link into the edit-form section that
 * owns it, so the user can jump straight to the fix. Used by the validation /
 * submit UI in SOWDisplay. (First extraction toward the #68 SOWDisplay split.)
 */
export function getFixLinkForMessage(
  message: string,
  sowId: string,
): { href: string; text: string } | null {
  const lower = message.toLowerCase();

  const mappings: Array<{ match: (s: string) => boolean; hash: string; text: string }> = [
    { match: s => s.includes('client role') || s.includes('signer') || s.includes('signature'), hash: 'signers-&-roles', text: 'Fix in Signers & Roles' },
    { match: s => s.includes('billing'), hash: 'billing-information', text: 'Fix in Billing Information' },
    { match: s => s.includes('objective'), hash: 'objectives', text: 'Fix in Objectives' },
    { match: s => s.includes('project overview') || s.includes('product') || s.includes('timeline'), hash: 'project-overview', text: 'Fix in Project Overview' },
    { match: s => s.includes('pricing') || s.includes('hours') || s.includes('rate'), hash: 'pricing', text: 'Fix in Pricing' },
    { match: s => s.includes('customer') || s.includes('client ') || s.includes('contact'), hash: 'customer-information', text: 'Fix in Customer Information' },
    { match: s => s.includes('content') || s.includes('intro') || s.includes('scope') || s.includes('deliverable'), hash: 'content-editing', text: 'Fix in Content Editing' },
  ];

  for (const m of mappings) {
    if (m.match(lower)) {
      return { href: `/sow/${sowId}/edit#${m.hash}`, text: m.text };
    }
  }
  return null;
}
