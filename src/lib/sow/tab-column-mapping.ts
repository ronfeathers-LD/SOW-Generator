/**
 * Server-side field→DB-column mapping for SOW tab saves.
 *
 * Extracted verbatim from the `PUT /api/sow/[id]/tab-update` route so the same
 * mapping can back both the per-tab endpoint and the bulk save endpoint without
 * duplication. `buildTabColumnUpdate` is pure (column mapping + billing JSONB
 * merge + server-side pricing recompute); side effects that touch other tables
 * (the Objectives tab's `avoma_recordings`) live in `applyTabSideEffects`.
 *
 * The client-side payload shape these consume is built by `tab-payloads.ts`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { canonicalizeContentColumns } from '@/lib/sow-content';
import { buildPricingRolesColumn, type PricingInput } from '@/lib/sow/pricing-roles-column';

/** Thrown for an unknown tab key so callers can map it to a 400. */
export class InvalidTabError extends Error {
  constructor(tab: string) {
    super(`Invalid tab specified: ${tab}`);
    this.name = 'InvalidTabError';
  }
}

type Payload = Record<string, unknown>;
type Row = Record<string, unknown>;

/**
 * Map a single tab's payload to the `sows` columns to update. Reads `existingSOW`
 * only for the Billing tab's `billing_info` JSONB merge. Throws `InvalidTabError`
 * for an unrecognized tab. Does NOT perform side effects — see `applyTabSideEffects`.
 */
export function buildTabColumnUpdate(
  tab: string,
  data: Payload,
  existingSOW: Row,
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  // Narrow helpers for the loosely-typed JSON payload.
  const d = data as Record<string, any>;

  switch (tab) {
    case 'Project Overview':
      if (d.template) {
        if (d.template.sow_title !== undefined) updateData.sow_title = d.template.sow_title;
        if (d.template.regions !== undefined) updateData.regions = d.template.regions;
        if (d.template.salesforce_tenants !== undefined) updateData.salesforce_tenants = d.template.salesforce_tenants;
        if (d.template.salesforce_tenant_names !== undefined) updateData.salesforce_tenant_names = d.template.salesforce_tenant_names;
        if (d.template.timeline_weeks !== undefined) updateData.timeline_weeks = d.template.timeline_weeks;
        if (d.template.units_consumption !== undefined) updateData.units_consumption = d.template.units_consumption;

        // BookIt Family Units
        if (d.template.bookit_forms_units !== undefined) updateData.bookit_forms_units = d.template.bookit_forms_units;
        if (d.template.bookit_links_units !== undefined) updateData.bookit_links_units = d.template.bookit_links_units;
        if (d.template.bookit_handoff_units !== undefined) updateData.bookit_handoff_units = d.template.bookit_handoff_units;
        if (d.template.other_products_units !== undefined) {
          updateData.other_products_units = d.template.other_products_units;
        }
      }

      // Also check for other_products_units at root level (fallback)
      if (d.other_products_units !== undefined) {
        updateData.other_products_units = d.other_products_units;
      }

      // Orchestration Units
      if (d.template?.orchestration_units !== undefined) {
        updateData.orchestration_units = d.template.orchestration_units;
      }

      // Products - JSONB field
      if (d.template?.products !== undefined) {
        updateData.products = d.template.products;
      }
      break;

    case 'Customer Information':
      if (d.template) {
        if (d.template.client_name !== undefined) updateData.client_name = d.template.client_name;
        if (d.template.customer_email !== undefined) updateData.client_email = d.template.customer_email;
        if (d.template.lean_data_name !== undefined) updateData.leandata_name = d.template.lean_data_name;
        if (d.template.lean_data_title !== undefined) updateData.leandata_title = d.template.lean_data_title;
        if (d.template.lean_data_email !== undefined) updateData.leandata_email = d.template.lean_data_email;
        if (d.template.opportunity_id !== undefined) updateData.opportunity_id = d.template.opportunity_id || null;
        if (d.template.opportunity_name !== undefined) updateData.opportunity_name = d.template.opportunity_name || null;
        if (d.template.opportunity_amount !== undefined) updateData.opportunity_amount = d.template.opportunity_amount || null;
        if (d.template.opportunity_stage !== undefined) updateData.opportunity_stage = d.template.opportunity_stage || null;
        if (d.template.opportunity_close_date !== undefined) updateData.opportunity_close_date = d.template.opportunity_close_date ? new Date(d.template.opportunity_close_date).toISOString() : null;
      }
      if (d.template?.company_logo !== undefined) {
        updateData.company_logo = d.template.company_logo;
      }
      break;

    case 'Objectives':
      // Flat fields (new format from wizard)
      if (d.objectives_description !== undefined) updateData.objectives_description = d.objectives_description;
      if (d.objectives_key_objectives !== undefined) updateData.objectives_key_objectives = d.objectives_key_objectives;
      if (d.objectives_avoma_transcription !== undefined) updateData.avoma_transcription = d.objectives_avoma_transcription;
      if (d.objectives_avoma_url !== undefined) updateData.avoma_url = d.objectives_avoma_url;

      // Legacy nested format (backward compatibility)
      if (d.objectives) {
        if (d.objectives.description !== undefined) updateData.objectives_description = d.objectives.description;
        if (d.objectives.key_objectives !== undefined) updateData.objectives_key_objectives = d.objectives.key_objectives;
        if (d.objectives.avoma_transcription !== undefined) updateData.avoma_transcription = d.objectives.avoma_transcription;
        if (d.objectives.avoma_url !== undefined) updateData.avoma_url = d.objectives.avoma_url;
        // avoma_recordings is a side effect on the avoma_recordings table — see applyTabSideEffects.
      }

      // Deliverables - flat (new) and nested (legacy)
      if (d.deliverables !== undefined) updateData.deliverables = d.deliverables;
      if (d.scope && d.scope.deliverables !== undefined) updateData.deliverables = d.scope.deliverables;

      // Wizard data
      if (d.selected_documents !== undefined) updateData.selected_documents = d.selected_documents;
      if (d.selected_meetings !== undefined) updateData.selected_meetings = d.selected_meetings;

      // Custom content + edit flags
      if (d.custom_deliverables_content !== undefined) updateData.custom_deliverables_content = d.custom_deliverables_content;
      if (d.deliverables_content_edited !== undefined) updateData.deliverables_content_edited = d.deliverables_content_edited;
      if (d.custom_objective_overview_content !== undefined) updateData.custom_objective_overview_content = d.custom_objective_overview_content;
      if (d.objective_overview_content_edited !== undefined) updateData.objective_overview_content_edited = d.objective_overview_content_edited;
      if (d.custom_key_objectives_content !== undefined) updateData.custom_key_objectives_content = d.custom_key_objectives_content;
      if (d.key_objectives_content_edited !== undefined) updateData.key_objectives_content_edited = d.key_objectives_content_edited;
      if (d.custom_scope_content !== undefined) updateData.custom_scope_content = d.custom_scope_content;
      if (d.scope_content_edited !== undefined) updateData.scope_content_edited = d.scope_content_edited;
      if (d.preview_content !== undefined) updateData.preview_content = d.preview_content;
      // AI-generated content baselines (stored at generation time for edit detection)
      if (d.ai_generated_objective_overview_content !== undefined) updateData.ai_generated_objective_overview_content = d.ai_generated_objective_overview_content;
      if (d.ai_generated_key_objectives_content !== undefined) updateData.ai_generated_key_objectives_content = d.ai_generated_key_objectives_content;
      if (d.ai_generated_deliverables_content !== undefined) updateData.ai_generated_deliverables_content = d.ai_generated_deliverables_content;
      if (d.ai_generated_scope_content !== undefined) updateData.ai_generated_scope_content = d.ai_generated_scope_content;
      break;

    case 'Signers & Roles': {
      // Check if data.template exists, otherwise look for template data at the top level
      const templateData = d.template || d;

      if (templateData) {
        if (templateData.customer_signature_name !== undefined) updateData.client_signer_name = templateData.customer_signature_name;
        if (templateData.customer_email !== undefined) updateData.client_email = templateData.customer_email;
        if (templateData.customer_signature !== undefined) updateData.client_title = templateData.customer_signature;
        // Second signer information
        if (templateData.customer_signature_name_2 !== undefined) updateData.customer_signature_name_2 = templateData.customer_signature_name_2;
        if (templateData.customer_signature_2 !== undefined) updateData.customer_signature_2 = templateData.customer_signature_2;
        if (templateData.customer_email_2 !== undefined) updateData.customer_email_2 = templateData.customer_email_2;
        // LeanData signatory information
        if (templateData.lean_data_name !== undefined) updateData.leandata_name = templateData.lean_data_name;
        if (templateData.lean_data_title !== undefined) updateData.leandata_title = templateData.lean_data_title;
        if (templateData.lean_data_email !== undefined) updateData.leandata_email = templateData.lean_data_email;
      }

      if (d.roles?.client_roles !== undefined) updateData.client_roles = d.roles.client_roles;

      if (d.salesforce_contact_id !== undefined) {
        updateData.salesforce_contact_id = d.salesforce_contact_id;
      }
      if (d.leandata_signatory_id !== undefined) {
        updateData.leandata_signatory_id = d.leandata_signatory_id;
      }
      break;
    }

    case 'Billing Information': {
      const billingTemplateData = d.template || d;

      if (billingTemplateData) {
        // Billing contact information - store in billing_info JSONB field
        if (billingTemplateData.billing_contact_name !== undefined || billingTemplateData.billing_email !== undefined ||
            billingTemplateData.billing_company_name !== undefined || billingTemplateData.billing_address !== undefined ||
            billingTemplateData.purchase_order_number !== undefined) {
          // Merge onto the SOW's CURRENT billing_info so fields not included in
          // this update aren't dropped. (audit #103)
          const rawExistingBilling = existingSOW.billing_info;
          const existingBillingInfo = (typeof rawExistingBilling === 'string'
            ? (() => { try { return JSON.parse(rawExistingBilling); } catch { return {}; } })()
            : rawExistingBilling) || {};
          updateData.billing_info = {
            ...existingBillingInfo,
            billing_contact: billingTemplateData.billing_contact_name !== undefined ?
              billingTemplateData.billing_contact_name : (existingBillingInfo as Record<string, unknown>).billing_contact,
            billing_email: billingTemplateData.billing_email !== undefined ?
              billingTemplateData.billing_email : (existingBillingInfo as Record<string, unknown>).billing_email,
            company_name: billingTemplateData.billing_company_name !== undefined ?
              billingTemplateData.billing_company_name : (existingBillingInfo as Record<string, unknown>).company_name,
            billing_address: billingTemplateData.billing_address !== undefined ?
              billingTemplateData.billing_address : (existingBillingInfo as Record<string, unknown>).billing_address,
            po_number: billingTemplateData.purchase_order_number !== undefined ?
              billingTemplateData.purchase_order_number : (existingBillingInfo as Record<string, unknown>).po_number,
          };
        }
      }

      // Payment terms is a top-level `sows` column (not part of the billing_info
      // JSONB blob), so it's read straight off the payload root.
      if (d.payment_terms !== undefined) {
        updateData.payment_terms = d.payment_terms;
      }

      // (The Billing tab must never write the pricing_roles column. audit #102)
      break;
    }

    case 'Pricing':
      if (d.pricing) {
        // Canonical object shape with server-side recomputed totals — never
        // trust client-supplied subtotal/discount_total/total_amount.
        // (audit #88, #104)
        updateData.pricing_roles = buildPricingRolesColumn(d.pricing);
      }
      break;

    case 'Content Editing':
      if (d.custom_intro_content !== undefined) updateData.custom_intro_content = d.custom_intro_content;
      if (d.custom_scope_content !== undefined) updateData.custom_scope_content = d.custom_scope_content;
      if (d.custom_out_of_scope_content !== undefined) updateData.custom_out_of_scope_content = d.custom_out_of_scope_content;
      if (d.custom_objectives_disclosure_content !== undefined) updateData.custom_objectives_disclosure_content = d.custom_objectives_disclosure_content;
      if (d.custom_assumptions_content !== undefined) updateData.custom_assumptions_content = d.custom_assumptions_content;
      if (d.custom_project_phases_content !== undefined) updateData.custom_project_phases_content = d.custom_project_phases_content;
      if (d.custom_deliverables_content !== undefined) updateData.custom_deliverables_content = d.custom_deliverables_content;
      if (d.custom_objective_overview_content !== undefined) updateData.custom_objective_overview_content = d.custom_objective_overview_content;
      if (d.intro_content_edited !== undefined) updateData.intro_content_edited = d.intro_content_edited;
      if (d.scope_content_edited !== undefined) updateData.scope_content_edited = d.scope_content_edited;
      if (d.out_of_scope_content_edited !== undefined) updateData.out_of_scope_content_edited = d.out_of_scope_content_edited;
      if (d.objectives_disclosure_content_edited !== undefined) updateData.objectives_disclosure_content_edited = d.objectives_disclosure_content_edited;
      if (d.assumptions_content_edited !== undefined) updateData.assumptions_content_edited = d.assumptions_content_edited;
      if (d.project_phases_content_edited !== undefined) updateData.project_phases_content_edited = d.project_phases_content_edited;
      if (d.deliverables_content_edited !== undefined) updateData.deliverables_content_edited = d.deliverables_content_edited;
      if (d.objective_overview_content_edited !== undefined) updateData.objective_overview_content_edited = d.objective_overview_content_edited;
      if (d.custom_key_objectives_content !== undefined) updateData.custom_key_objectives_content = d.custom_key_objectives_content;
      if (d.key_objectives_content_edited !== undefined) updateData.key_objectives_content_edited = d.key_objectives_content_edited;
      break;

    default:
      throw new InvalidTabError(tab);
  }

  // Canonicalize section HTML at write time (#346): every `custom_*_content`
  // column in the registry is stored in its sanitized canonical form so the
  // rendered textContent is byte-stable for text-anchored comments. Only the
  // registered content columns are touched; null/undefined pass through.
  return canonicalizeContentColumns(updateData);
}

/**
 * Apply a tab's cross-table side effects. Currently only the Objectives tab,
 * which replaces the SOW's `avoma_recordings` rows. Must run before the main
 * `sows` UPDATE (matching the original route ordering). Throws if the insert
 * fails so the caller can surface a 500.
 */
export async function applyTabSideEffects(
  supabase: SupabaseClient,
  sowId: string,
  tab: string,
  data: Record<string, unknown>,
): Promise<void> {
  const d = data as Record<string, any>;

  if (tab === 'Objectives' && d.objectives?.avoma_recordings !== undefined) {
    // First, delete existing recordings for this SOW.
    const { error: deleteError } = await supabase
      .from('avoma_recordings')
      .delete()
      .eq('sow_id', sowId);

    if (deleteError) {
      console.error('Error deleting existing recordings:', deleteError);
    }

    // Then insert the new recordings.
    if (d.objectives.avoma_recordings.length > 0) {
      const recordingsToInsert = d.objectives.avoma_recordings.map((recording: {
        id: string;
        url: string;
        transcription?: string;
        title?: string;
        date?: string;
        status?: string;
      }) => ({
        sow_id: sowId,
        url: recording.url,
        transcription: recording.transcription || null,
        title: recording.title || null,
        date: recording.date || new Date().toISOString(),
        status: recording.status || 'pending',
      }));

      const { error: insertError } = await supabase
        .from('avoma_recordings')
        .insert(recordingsToInsert);

      if (insertError) {
        console.error('Error inserting recordings:', insertError);
        throw new Error('Failed to save Avoma recordings');
      }
    }
  }
}
