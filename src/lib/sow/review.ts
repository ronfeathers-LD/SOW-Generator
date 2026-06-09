/**
 * Review & Submit support for the SOW wizard (Workstream A, #280).
 *
 * Runs the strict submit-gating validation (`validateSOWForApproval`) against the
 * form's nested `SOWData` and buckets every issue under the section that owns it,
 * so the Review step can show "what's missing, and where to fix it" with a jump
 * to the right wizard step.
 */
import { SOWData } from '@/types/sow';
import { validateSOWForApproval, SOWValidationResult } from '@/lib/validation-utils';
import { ChecklistSOWData } from '@/lib/pre-submit-checks';
import { SowTabKey } from './tab-payloads';

/**
 * Flatten the nested form state into the shape `validateSOWForApproval` expects
 * (it reads several fields at the top level — sow_title, client_name, products,
 * client_roles, pricing_roles … — alongside the nested template/objectives/scope).
 */
export function buildValidationInput(formData: Partial<SOWData>): Record<string, unknown> {
  return {
    ...formData,
    sow_title: formData.template?.sow_title,
    client_name: formData.template?.client_name,
    products: formData.template?.products,
    regions: formData.template?.regions,
    salesforce_tenants: formData.template?.salesforce_tenants,
    timeline_weeks: formData.template?.timeline_weeks,
    client_signer_name: formData.template?.customer_signature_name || formData.client_signer_name,
    client_roles: formData.roles?.client_roles,
    pricing_roles: formData.pricing?.roles,
  };
}

/**
 * Map the nested form state into the minimal shape the pre-submission checklist
 * reads (`PreSubmitChecklistModal` → `runAutomatedChecks`). This is the wizard-side
 * equivalent of the `DisplaySOW` the view-page submit button feeds the checklist.
 */
export function buildChecklistInput(formData: Partial<SOWData>): ChecklistSOWData {
  return {
    clientRoles: formData.roles?.client_roles?.map((r) => ({
      name: r.name,
      contact_title: r.contact_title,
      responsibilities: r.responsibilities,
    })),
    clientEmail: formData.template?.customer_email,
    salesforce_tenants: formData.template?.salesforce_tenants,
    objective_overview_content_edited: formData.objective_overview_content_edited,
    key_objectives_content_edited: formData.key_objectives_content_edited,
    deliverables_content_edited: formData.deliverables_content_edited,
    template: {
      customer_email: formData.template?.customer_email,
      billing_email: formData.template?.billing_email,
    },
  };
}

/** Keyword → owning section rules, most specific first. */
const SECTION_RULES: Array<{ test: (m: string) => boolean; tab: SowTabKey }> = [
  { test: (m) => m.includes('billing'), tab: 'Billing Information' },
  { test: (m) => m.includes('pricing') || m.includes('hours') || m.includes('rate'), tab: 'Pricing' },
  { test: (m) => m.includes('signer') || m.includes('signatory') || m.includes('client role'), tab: 'Signers & Roles' },
  { test: (m) => m.includes('objective') || m.includes('deliverable') || m.includes('key objective'), tab: 'Objectives' },
  { test: (m) => m.includes('region') || m.includes('tenant') || m.includes('timeline') || m.includes('product') || m.includes('sow title'), tab: 'Project Overview' },
  { test: (m) => m.includes('client name') || m.includes('account owner') || m.includes('customer'), tab: 'Customer Information' },
];

function sectionForMessage(message: string): SowTabKey {
  const lower = message.toLowerCase();
  for (const rule of SECTION_RULES) {
    if (rule.test(lower)) return rule.tab;
  }
  // Default bucket: orientation-level fields live on Customer Information.
  return 'Customer Information';
}

export interface SectionIssues {
  tab: SowTabKey;
  issues: string[];
}

export interface SOWReview {
  result: SOWValidationResult;
  /** Issues grouped by owning section, in wizard order. */
  bySection: SectionIssues[];
}

/** Validate the SOW and group all issues (missing fields + errors) by section. */
export function reviewSOW(formData: Partial<SOWData>): SOWReview {
  const result = validateSOWForApproval(buildValidationInput(formData));

  const grouped = new Map<SowTabKey, string[]>();
  for (const message of [...result.missingFields, ...result.errors]) {
    const tab = sectionForMessage(message);
    const list = grouped.get(tab) ?? [];
    list.push(message);
    grouped.set(tab, list);
  }

  // Preserve wizard order.
  const ORDER: SowTabKey[] = [
    'Customer Information',
    'Project Overview',
    'Objectives',
    'Signers & Roles',
    'Billing Information',
    'Pricing',
    'Content Editing',
  ];
  const bySection: SectionIssues[] = ORDER.filter((tab) => grouped.has(tab)).map((tab) => ({
    tab,
    issues: grouped.get(tab)!,
  }));

  return { result, bySection };
}
