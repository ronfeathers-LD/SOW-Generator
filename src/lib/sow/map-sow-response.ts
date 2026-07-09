/**
 * Canonical SOW serializer (the keystone of #68).
 *
 * The raw `sows` table row stores most fields as flat snake_case columns plus a
 * couple of JSONB blobs (`billing_info`, `pricing_roles`). The app, however,
 * consumes a nested shape (`template` / `objectives` / `scope` / `pricing` …).
 * That row→shape mapping was hand-rolled
 * and duplicated across the GET route, the edit page, SOWForm, SOWDisplay and
 * SOWDataLoader — so any schema change had to be chased through all of them and
 * the copies had already drifted.
 *
 * This module is the single place that mapping lives. `GET /api/sow/[id]` builds
 * its response from here; other consumers should migrate onto it incrementally
 * so there is exactly one source of truth for the SOW shape.
 *
 * The `sows` table has no generated types, so the row is modelled as a loose
 * record — the same way the API route already treats it.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SowRow = Record<string, any>;

export interface AvomaRecordingRow {
  id: string;
  url: string;
  transcription?: string | null;
  title?: string | null;
  date?: string | null;
  created_at?: string | null;
  status?: string | null;
}

export interface MapSowExtras {
  /** Resolved LeanData signatory (overrides the flat leandata_* columns). */
  leanDataSignatory?: { name?: string; title?: string; email?: string } | null;
  /** Raw avoma_recordings rows for this SOW. */
  avomaRecordings?: AvomaRecordingRow[] | null;
  /** Display name of the submitter, if the SOW was submitted for review. */
  submittedByName?: string | null;
}

/** True when pricing_roles is the newer object form `{ roles, discount_*, … }`. */
function isPricingConfigObject(
  pricingRoles: unknown,
): pricingRoles is Record<string, unknown> {
  return (
    !!pricingRoles &&
    typeof pricingRoles === 'object' &&
    !Array.isArray(pricingRoles)
  );
}

/** Extract the roles array from either the array form or the `{ roles }` object form. */
function extractPricingRoles(pricingRoles: unknown): unknown[] {
  if (isPricingConfigObject(pricingRoles) && Array.isArray(pricingRoles.roles)) {
    return pricingRoles.roles as unknown[];
  }
  if (Array.isArray(pricingRoles)) {
    return pricingRoles;
  }
  return [];
}

/**
 * Map a raw `sows` row into the nested response shape the app consumes.
 *
 * Pure and behavior-preserving: it reproduces exactly what the GET route used to
 * build inline. The route still performs its post-mapping mutations (account
 * segment backfill, Salesforce client_name sync) on the returned object.
 */
export function mapSowRowToResponse(sow: SowRow, extras: MapSowExtras = {}): SowRow {
  const { leanDataSignatory, avomaRecordings, submittedByName } = extras;

  // Get products from JSONB field
  const productNames = Array.isArray(sow.products) ? sow.products : [];

  // Transform recordings to match frontend format
  const transformedRecordings = (avomaRecordings || []).map((recording) => ({
    id: recording.id,
    url: recording.url,
    transcription: recording.transcription || '',
    title: recording.title || '',
    date: recording.date || recording.created_at,
    status: recording.status || 'pending',
  }));

  const pricingRoles = sow.pricing_roles;
  const pricingConfig = isPricingConfigObject(pricingRoles) ? pricingRoles : null;
  const billingInfo = (sow.billing_info as Record<string, unknown>) || {};

  return {
    ...sow,
    objectives: {
      description: sow.objectives_description || '',
      key_objectives: sow.objectives_key_objectives || [],
      avoma_transcription: sow.avoma_transcription || '',
      avoma_url: sow.avoma_url || '',
      avoma_recordings: transformedRecordings,
    },
    scope: {
      deliverables: sow.deliverables || '',
      timeline: {
        duration: sow.duration || '',
      },
    },
    template: {
      company_logo: sow.company_logo || '',
      client_name: sow.client_name || '',
      sow_title: sow.sow_title || '',
      customer_signature_name: sow.client_signer_name || '',
      customer_email: sow.client_email || '',
      customer_signature: sow.client_title || '',
      lean_data_name: leanDataSignatory?.name || sow.leandata_name || '',
      lean_data_title: leanDataSignatory?.title || sow.leandata_title || '',
      lean_data_email: leanDataSignatory?.email || sow.leandata_email || '',
      products: productNames,
      regions: sow.regions || '',
      salesforce_tenants: sow.salesforce_tenants || '',
      salesforce_tenant_names: sow.salesforce_tenant_names || '',
      timeline_weeks: sow.timeline_weeks || '',
      units_consumption: sow.units_consumption || 'All units immediately',
      // BookIt Family Units
      orchestration_units: sow.orchestration_units || '',
      bookit_forms_units: sow.bookit_forms_units || '',
      bookit_links_units: sow.bookit_links_units || '',
      bookit_handoff_units: sow.bookit_handoff_units || '',
      other_products_units: sow.other_products_units || '',
      opportunity_id: sow.opportunity_id || '',
      opportunity_name: sow.opportunity_name || '',
      opportunity_amount: sow.opportunity_amount || undefined,
      opportunity_stage: sow.opportunity_stage || '',
      opportunity_close_date: sow.opportunity_close_date || undefined,
      // Second signer information
      customer_signature_name_2: sow.customer_signature_name_2 || '',
      customer_signature_2: sow.customer_signature_2 || '',
      customer_email_2: sow.customer_email_2 || '',
      // Billing information - map from billing_info JSONB field
      billing_company_name: billingInfo.company_name || '',
      billing_contact_name: billingInfo.billing_contact || '',
      billing_address: billingInfo.billing_address || '',
      billing_email: billingInfo.billing_email || '',
      purchase_order_number: billingInfo.po_number || '',
    },
    client_signer_name: sow.client_signer_name || '',
    // Explicitly include salesforce_account_id
    salesforce_account_id: sow.salesforce_account_id || null,
    // Include Salesforce account owner information
    salesforce_account_owner_name: sow.salesforce_account_owner_name || null,
    salesforce_account_owner_email: sow.salesforce_account_owner_email || null,
    // Include LeanData signatory ID
    leandata_signatory_id: sow.leandata_signatory_id || null,
    // Include account segment
    account_segment: sow.account_segment || null,
    // Include payment terms — plain passthrough, empty stays empty (no sentinel).
    payment_terms: sow.payment_terms || '',
    // Include PM hours removal state so the editor recalculates hours correctly
    pm_hours_requirement_disabled: sow.pm_hours_requirement_disabled || false,
    pm_hours_removed: sow.pm_hours_removed || 0,
    pm_hours_removal_approved: sow.pm_hours_removal_approved || false,
    // Include custom content fields
    custom_intro_content: sow.custom_intro_content || null,
    custom_scope_content: sow.custom_scope_content || null,
    custom_objectives_disclosure_content: sow.custom_objectives_disclosure_content || null,
    custom_assumptions_content: sow.custom_assumptions_content || null,
    custom_project_phases_content: sow.custom_project_phases_content || null,
    custom_deliverables_content: sow.custom_deliverables_content || null,
    custom_objective_overview_content: sow.custom_objective_overview_content || null,
    custom_key_objectives_content: sow.custom_key_objectives_content || null,
    intro_content_edited: sow.intro_content_edited || false,
    scope_content_edited: sow.scope_content_edited || false,
    objectives_disclosure_content_edited: sow.objectives_disclosure_content_edited || false,
    assumptions_content_edited: sow.assumptions_content_edited || false,
    project_phases_content_edited: sow.project_phases_content_edited || false,
    deliverables_content_edited: sow.deliverables_content_edited || false,
    objective_overview_content_edited: sow.objective_overview_content_edited || false,
    key_objectives_content_edited: sow.key_objectives_content_edited || false,
    // AI-generated content baselines for edit detection
    ai_generated_objective_overview_content: sow.ai_generated_objective_overview_content || null,
    ai_generated_key_objectives_content: sow.ai_generated_key_objectives_content || null,
    ai_generated_deliverables_content: sow.ai_generated_deliverables_content || null,
    // Include submission tracking
    submitted_by: sow.submitted_by || null,
    submitted_at: sow.submitted_at || null,
    submitted_by_name: submittedByName ?? null,
    // Include approval/rejection tracking
    approval_comments: sow.approval_comments || null,
    approved_at: sow.approved_at || null,
    rejected_at: sow.rejected_at || null,
    approved_by: sow.approved_by || null,
    rejected_by: sow.rejected_by || null,
    // Include client roles
    roles: {
      client_roles: sow.client_roles || [],
    },
    // Include pricing data - handle mixed structure where pricing_roles contains both roles and config
    pricingRoles: extractPricingRoles(pricingRoles),
    billingInfo: sow.billing_info || {},
    // Include pricing configuration from JSONB fields
    pricing: {
      roles: extractPricingRoles(pricingRoles),
      project_management_included: pricingConfig?.project_management_included || false,
      project_management_hours: pricingConfig?.project_management_hours || 40,
      project_management_rate: pricingConfig?.project_management_rate || 225,
      base_hourly_rate: pricingConfig?.base_hourly_rate || 200,
      discount_type: pricingConfig?.discount_type || 'none',
      discount_amount: pricingConfig?.discount_amount || 0,
      discount_percentage: pricingConfig?.discount_percentage || 0,
      subtotal: pricingConfig?.subtotal || 0,
      discount_total: pricingConfig?.discount_total || 0,
      total_amount: pricingConfig?.total_amount || 0,
      auto_calculated: pricingConfig?.auto_calculated || false,
      last_calculated: pricingConfig?.last_calculated || null,
    },
  };
}
