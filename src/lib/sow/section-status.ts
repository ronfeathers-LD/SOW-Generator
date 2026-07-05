/**
 * Per-section completion status for the SOW wizard stepper (Workstream A / #24).
 *
 * This is a lightweight "has the key content been filled in" heuristic for the
 * at-a-glance stepper indicators — NOT the strict submit-gating validation
 * (that lives in `@/lib/validation-utils` and runs at the Review & Submit step).
 * Returning `attention` here means "started but incomplete", not "invalid".
 */
import { SOWData } from '@/types/sow';
import type { StepStatus } from '@/components/ui/form';
import type { SowTabKey } from './tab-payloads';

const hasText = (v?: string | null): boolean => !!(v && String(v).trim());

/** Legacy '999' sentinel (persisted by old saves) and '' both mean "unset". */
const isUnset = (v?: string | null): boolean => !v || v === '999';

/** Roll a set of required-field flags up into a tri-state status. */
function tri(flags: boolean[]): StepStatus {
  const filled = flags.filter(Boolean).length;
  if (filled === 0) return 'empty';
  if (filled === flags.length) return 'complete';
  return 'attention';
}

export function getSectionStatus(
  tab: SowTabKey,
  formData: Partial<SOWData>,
): StepStatus {
  const t = formData.template;

  switch (tab) {
    case 'Customer Information':
      return tri([hasText(t?.client_name), hasText(t?.opportunity_name)]);

    case 'Project Overview':
      return tri([
        (t?.products?.length ?? 0) > 0,
        !isUnset(t?.timeline_weeks),
        !isUnset(t?.salesforce_tenants),
      ]);

    case 'Objectives':
      return tri([
        hasText(formData.custom_objective_overview_content) || hasText(formData.objectives?.description),
        hasText(formData.custom_key_objectives_content) ||
          (formData.objectives?.key_objectives?.some((o) => hasText(o)) ?? false),
        hasText(formData.custom_deliverables_content) || hasText(formData.scope?.deliverables),
      ]);

    case 'Signers & Roles':
      return tri([
        hasText(t?.customer_signature_name),
        hasText(t?.customer_signature),
        hasText(t?.lean_data_name) && t?.lean_data_name !== 'None Selected',
        formData.roles?.client_roles?.some((r) => hasText(r.name) || hasText(r.role)) ?? false,
      ]);

    case 'Billing Information':
      return tri([
        hasText(t?.billing_company_name),
        hasText(t?.billing_contact_name),
        hasText(t?.billing_address),
        hasText(t?.billing_email),
      ]);

    case 'Pricing': {
      const roles = formData.pricing?.roles ?? [];
      return roles.some((r) => (Number(r.totalHours) || 0) > 0) ? 'complete' : 'empty';
    }

    case 'Content Editing': {
      // Optional section — surface whether anything was customized; never blocks.
      const edited = [
        formData.intro_content_edited,
        formData.scope_content_edited,
        formData.assumptions_content_edited,
        formData.project_phases_content_edited,
        formData.deliverables_content_edited,
        formData.objective_overview_content_edited,
        formData.key_objectives_content_edited,
      ].some(Boolean);
      return edited ? 'complete' : 'empty';
    }

    default:
      return 'empty';
  }
}
