/**
 * Pre-submission checklist definitions and automated check functions.
 * Used by PreSubmitChecklistModal to gate SOW submission.
 */

export type ChecklistItemType = 'automated' | 'manual';

export interface CheckResult {
  passed: boolean;
  detail?: string;
}

export interface ChecklistItem {
  id: string;
  type: ChecklistItemType;
  label: string;
  /** Automated check function. Returns pass/warn result from SOW data. */
  check?: (sow: ChecklistSOWData) => CheckResult;
  /** For manual items: only show when this returns true. */
  showWhen?: (sow: ChecklistSOWData) => boolean;
}

/** Minimal SOW shape needed for checklist checks. */
export interface ChecklistSOWData {
  clientRoles?: Array<{
    name?: string;
    contact_title?: string;
    responsibilities?: string;
  }>;
  clientEmail?: string;
  salesforce_tenants?: string;
  scope_content_edited?: boolean;
  key_objectives_content_edited?: boolean;
  version?: number;
  template?: {
    customer_email?: string;
    billing_email?: string;
  };
}

const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'live.com',
  'msn.com',
  'googlemail.com',
  'protonmail.com',
  'mail.com',
];

function isPersonalEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const domain = email.trim().toLowerCase().split('@').pop();
  return PERSONAL_EMAIL_DOMAINS.includes(domain || '');
}

function getNAOrBlankRoles(
  roles: ChecklistSOWData['clientRoles'],
  field: 'contact_title' | 'responsibilities'
): string[] {
  if (!roles || !Array.isArray(roles)) return [];
  return roles
    .filter((r) => {
      const value = r[field];
      if (!value || value.trim() === '' || value.trim().toLowerCase() === 'n/a') return true;
      return false;
    })
    .map((r) => r.name || 'Unknown');
}

// --- Checklist item definitions ---

const automatedChecks: ChecklistItem[] = [
  {
    id: 'tenants-check',
    type: 'automated',
    label: 'Salesforce Tenants is greater than 1',
    check: (sow) => {
      const tenants = parseInt(sow.salesforce_tenants || '0');
      if (tenants === 1) {
        return {
          passed: false,
          detail:
            'Salesforce Tenants is set to 1. If the customer has any sandbox environment, this should be at least 2.',
        };
      }
      return { passed: true };
    },
  },
  {
    id: 'roles-titles',
    type: 'automated',
    label: 'All client roles have a valid title',
    check: (sow) => {
      const flagged = getNAOrBlankRoles(sow.clientRoles, 'contact_title');
      if (flagged.length > 0) {
        return {
          passed: false,
          detail: `These contacts have a missing or "N/A" title: ${flagged.join(', ')}. Update their title in Salesforce or manually in the SOW.`,
        };
      }
      return { passed: true };
    },
  },
  {
    id: 'roles-responsibilities',
    type: 'automated',
    label: 'All client roles have responsibilities defined',
    check: (sow) => {
      const flagged = getNAOrBlankRoles(sow.clientRoles, 'responsibilities');
      if (flagged.length > 0) {
        return {
          passed: false,
          detail: `These contacts have blank responsibilities: ${flagged.join(', ')}.`,
        };
      }
      return { passed: true };
    },
  },
  {
    id: 'scope-reviewed',
    type: 'automated',
    label: 'Scope content should be edited from the generated template',
    check: (sow) => {
      if (!sow.scope_content_edited) {
        return {
          passed: false,
          detail:
            'The scope has not been modified from the generated template. Open the Content Editing tab and make any needed adjustments before submitting.',
        };
      }
      return { passed: true };
    },
  },
  {
    id: 'objectives-reviewed',
    type: 'automated',
    label: 'Key objectives should be edited from the generated template',
    check: (sow) => {
      if (!sow.key_objectives_content_edited) {
        return {
          passed: false,
          detail:
            'The key objectives have not been modified from the generated template. Open the Content Editing tab and make any needed adjustments before submitting.',
        };
      }
      return { passed: true };
    },
  },
  {
    id: 'signer-email',
    type: 'automated',
    label: 'Customer signer email is a company email',
    check: (sow) => {
      const email = sow.template?.customer_email || sow.clientEmail;
      if (isPersonalEmail(email)) {
        return {
          passed: false,
          detail: `Signer email "${email}" appears to be a personal email address. Verify this is correct for a corporate SOW.`,
        };
      }
      return { passed: true };
    },
  },
  {
    id: 'billing-email',
    type: 'automated',
    label: 'Billing email is a company email',
    check: (sow) => {
      const email = sow.template?.billing_email;
      if (isPersonalEmail(email)) {
        return {
          passed: false,
          detail: `Billing email "${email}" appears to be a personal email address. Verify this is correct.`,
        };
      }
      return { passed: true };
    },
  },
];

const manualAcknowledgments: ChecklistItem[] = [
  {
    id: 'product-scope-match',
    type: 'manual',
    label: 'Product list matches what is referenced in scope',
  },
  {
    id: 'no-redundant-sections',
    type: 'manual',
    label:
      'No redundant or duplicate scope sections (e.g., Integrations, SLAs, Sandbox, Scalability)',
  },
  {
    id: 'scope-specific',
    type: 'manual',
    label: 'Scope items are specific and deliverable — no vague promises',
  },
  {
    id: 'no-dates-targets',
    type: 'manual',
    label: 'No specific go-live dates or performance targets committed in scope',
  },
  {
    id: 'comments-addressed',
    type: 'manual',
    label: 'All prior reviewer comments have been addressed',
    showWhen: (sow) => (sow.version || 1) > 1,
  },
];

export function getChecklistItems(): ChecklistItem[] {
  return [...automatedChecks, ...manualAcknowledgments];
}

export function runAutomatedChecks(
  sow: ChecklistSOWData
): Array<{ item: ChecklistItem; result: CheckResult }> {
  return automatedChecks.map((item) => ({
    item,
    result: item.check ? item.check(sow) : { passed: true },
  }));
}

export function getVisibleManualItems(
  sow: ChecklistSOWData
): ChecklistItem[] {
  return manualAcknowledgments.filter(
    (item) => !item.showWhen || item.showWhen(sow)
  );
}
