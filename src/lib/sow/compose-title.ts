/**
 * Default SOW title: "[Opportunity Name] - [Account Name]", except the
 * account suffix is skipped when the opportunity name already contains it
 * (Salesforce opportunity names usually embed the account name).
 */
export function composeSowTitle(opportunityName: string, accountName: string): string {
  const opp = opportunityName.trim();
  const account = accountName.trim();
  if (!opp) return account;
  if (!account) return opp;
  if (opp.toLowerCase().includes(account.toLowerCase())) return opp;
  return `${opp} - ${account}`;
}
