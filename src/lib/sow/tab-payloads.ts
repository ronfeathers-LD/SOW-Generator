/**
 * Per-tab save payload builders for the SOW form.
 *
 * Extracted from the giant switch that used to live inside
 * `SOWForm.handleTabSave`. Each builder returns the `data` object that the
 * `PUT /api/sow/[id]/tab-update` route expects for a given tab. Keeping these
 * pure (formData + context in, plain object out) lets the form do a **save-all**
 * — loop every visible tab and persist it — instead of only persisting the
 * active tab, which was the source of the silent data loss in issue #109.
 *
 * The field→DB-column mapping still lives server-side in the tab-update route
 * (the source of truth, incl. the audited pricing recompute / billing merge);
 * these builders only mirror the client-side `data` shapes that route consumes.
 */
import { SOWData } from '@/types/sow';

/** Tab keys, in form order. Must match the server-side switch in tab-update. */
export const SOW_TAB_KEYS = [
  'Customer Information',
  'Project Overview',
  'Objectives',
  'Signers & Roles',
  'Billing Information',
  'Pricing',
  'Content Editing',
] as const;

export type SowTabKey = (typeof SOW_TAB_KEYS)[number];

/** Calculated pricing snapshot pulled from the Pricing tab's live component state. */
export interface PricingSnapshot {
  roles: Array<{ role: string; ratePerHour: number; defaultRate?: number; totalHours: number }>;
  discount_type: string;
  discount_amount: number;
  discount_percentage: number;
  subtotal: number;
  discount_total: number;
  total_amount: number;
  auto_calculated: boolean;
  last_calculated: string;
}

export interface TabPayloadContext {
  /** Live pricing data from the Pricing component (via ref), if it's mounted. */
  pricingData?: PricingSnapshot | null;
  /** Currently selected Salesforce billing/signer contact id. */
  selectedContactId?: string | null;
  /** Currently selected LeanData signatory id. */
  selectedLeanDataSignatoryId?: string | null;
  /** ISO timestamp to stamp onto pricing when none exists yet. */
  nowIso: string;
}

/**
 * Build the `data` payload for a single tab. Returns `null` for tabs that have
 * nothing to persist (so save-all can skip them).
 */
export function buildTabPayload(
  tab: SowTabKey,
  formData: Partial<SOWData>,
  ctx: TabPayloadContext,
): Record<string, unknown> | null {
  const template = formData.template;

  switch (tab) {
    case 'Customer Information':
      return {
        template: {
          company_logo: template?.company_logo,
          client_name: template?.client_name,
          customer_signature_name: template?.customer_signature_name,
          customer_email: template?.customer_email,
          lean_data_name: template?.lean_data_name,
          lean_data_title: template?.lean_data_title,
          lean_data_email: template?.lean_data_email,
          opportunity_id: template?.opportunity_id,
          opportunity_name: template?.opportunity_name,
          opportunity_amount: template?.opportunity_amount,
          opportunity_stage: template?.opportunity_stage,
          opportunity_close_date: template?.opportunity_close_date,
        },
      };

    case 'Project Overview':
      return {
        template: {
          sow_title: template?.sow_title,
          products: template?.products || [],
          regions: template?.regions,
          salesforce_tenants: template?.salesforce_tenants,
          salesforce_tenant_names: template?.salesforce_tenant_names,
          timeline_weeks: template?.timeline_weeks,
          units_consumption: template?.units_consumption,
          // BookIt Family Units
          orchestration_units: template?.orchestration_units,
          bookit_forms_units: template?.bookit_forms_units,
          bookit_links_units: template?.bookit_links_units,
          bookit_handoff_units: template?.bookit_handoff_units,
          other_products_units: template?.other_products_units,
        },
      };

    case 'Objectives':
      return {
        objectives_description: formData.objectives?.description,
        objectives_key_objectives: formData.objectives?.key_objectives,
        objectives_avoma_transcription: formData.objectives?.avoma_transcription,
        objectives_avoma_url: formData.objectives?.avoma_url,
        deliverables: formData.scope?.deliverables,
        custom_deliverables_content: formData.custom_deliverables_content,
        deliverables_content_edited: formData.deliverables_content_edited,
        custom_objective_overview_content: formData.custom_objective_overview_content,
        objective_overview_content_edited: formData.objective_overview_content_edited,
        custom_key_objectives_content: formData.custom_key_objectives_content,
        key_objectives_content_edited: formData.key_objectives_content_edited,
        selected_documents: formData.selected_documents,
        selected_meetings: formData.selected_meetings,
        // AI-generated content baselines
        ai_generated_objective_overview_content: formData.ai_generated_objective_overview_content,
        ai_generated_key_objectives_content: formData.ai_generated_key_objectives_content,
        ai_generated_deliverables_content: formData.ai_generated_deliverables_content,
      };

    case 'Signers & Roles':
      return {
        roles: {
          client_roles: formData.roles?.client_roles,
        },
        template: {
          customer_signature_name: template?.customer_signature_name,
          customer_email: template?.customer_email,
          customer_signature: template?.customer_signature,
          // Second signer information
          customer_signature_name_2: template?.customer_signature_name_2,
          customer_signature_2: template?.customer_signature_2,
          customer_email_2: template?.customer_email_2,
          // LeanData signatory information
          lean_data_name: template?.lean_data_name,
          lean_data_title: template?.lean_data_title,
          lean_data_email: template?.lean_data_email,
        },
        salesforce_contact_id: ctx.selectedContactId || null,
        leandata_signatory_id: ctx.selectedLeanDataSignatoryId || null,
      };

    case 'Billing Information':
      return {
        template: {
          billing_contact_name: template?.billing_contact_name,
          billing_email: template?.billing_email,
          billing_company_name: template?.billing_company_name,
          billing_address: template?.billing_address,
          purchase_order_number: template?.purchase_order_number,
        },
        payment_terms: formData.payment_terms,
        pricing: {
          billing: formData.pricing?.billing,
        },
      };

    case 'Pricing': {
      const p = ctx.pricingData;
      return {
        pricing: {
          roles: p?.roles || formData.pricing?.roles || [],
          discount_type: p?.discount_type || formData.pricing?.discount_type || 'none',
          discount_amount: p?.discount_amount ?? formData.pricing?.discount_amount ?? 0,
          discount_percentage: p?.discount_percentage ?? formData.pricing?.discount_percentage ?? 0,
          subtotal: p?.subtotal ?? formData.pricing?.subtotal ?? 0,
          discount_total: p?.discount_total ?? formData.pricing?.discount_total ?? 0,
          total_amount: p?.total_amount ?? formData.pricing?.total_amount ?? 0,
          // Auto-save tracking fields
          auto_calculated: formData.pricing?.auto_calculated || false,
          last_calculated: formData.pricing?.last_calculated || ctx.nowIso,
        },
      };
    }

    case 'Content Editing':
      return {
        custom_intro_content: formData.custom_intro_content,
        custom_scope_content: formData.custom_scope_content,
        custom_objectives_disclosure_content: formData.custom_objectives_disclosure_content,
        custom_assumptions_content: formData.custom_assumptions_content,
        custom_project_phases_content: formData.custom_project_phases_content,
        custom_deliverables_content: formData.custom_deliverables_content,
        custom_objective_overview_content: formData.custom_objective_overview_content,
        intro_content_edited: formData.intro_content_edited,
        scope_content_edited: formData.scope_content_edited,
        objectives_disclosure_content_edited: formData.objectives_disclosure_content_edited,
        assumptions_content_edited: formData.assumptions_content_edited,
        project_phases_content_edited: formData.project_phases_content_edited,
        deliverables_content_edited: formData.deliverables_content_edited,
        objective_overview_content_edited: formData.objective_overview_content_edited,
        custom_key_objectives_content: formData.custom_key_objectives_content,
        key_objectives_content_edited: formData.key_objectives_content_edited,
      };

    default:
      return null;
  }
}
