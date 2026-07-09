/**
 * Client-side SOW mapper for the read-only view — the display-side counterpart
 * to `mapApiResponseToSOWData` (src/lib/sow/map-api-response.ts, #68).
 *
 * `GET /api/sow/[id]` returns the canonical nested response (built server-side
 * by `mapSowRowToResponse`). The editor turns that into the form's `SOWData`;
 * the read-only view (`SOWDisplay`, print + full) instead needs the flattened,
 * camelCase `DisplaySOW` presentation shape. That response→display mapping was
 * inlined in `SOWDisplay`'s fetch effect (~110 lines) and is the display-side
 * twin of the duplication centralized for the form. This module is the single
 * seam where the display shape is produced.
 *
 * Behavior-preserving: this reproduces exactly what `SOWDisplay` used to build
 * inline, including its defaults and snake_case/camelCase fallbacks.
 */
import { parseObjectives } from '@/lib/utils/parse-objectives';
import { DisplaySOW } from '@/types/sow-display';

// The parsed JSON from GET /api/sow/[id]. The endpoint is untyped, so the
// response is modelled as a loose record — the same way SOWDisplay treated it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SowDisplayApiResponse = Record<string, any>;

export function mapApiResponseToDisplaySOW(data: SowDisplayApiResponse): DisplaySOW {
  // Parse JSON fields with safe defaults (same logic as main view)
  return {
    ...data,
    deliverables: data.deliverables ? data.deliverables.split('\n').filter(Boolean) : [],
    projectDescription: data.objectives?.description || '',
    keyObjectives: parseObjectives(data.objectives?.key_objectives),
    clientRoles: Array.isArray(data.roles?.client_roles) ? data.roles.client_roles.map((role: unknown) => {
      const roleObj = role as { role?: string; name?: string; email?: string; responsibilities?: string; contact_title?: string };
      return {
        role: roleObj.role || '',
        name: roleObj.name || '',
        email: roleObj.email || '',
        contact_title: roleObj.contact_title || '',
        responsibilities: roleObj.responsibilities || ''
      };
    }) : [],
    pricing: {
      roles: [],
      billing: data.billingInfo || {
        companyName: '',
        billingContact: '',
        billingAddress: '',
        billingEmail: '',
        poNumber: '',
        paymentTerms: '',
        currency: '',
      },
      project_management_included: data.pricing?.project_management_included || false,
      project_management_hours: data.pricing?.project_management_hours || 40,
      project_management_rate: data.pricing?.project_management_rate || 225,
      base_hourly_rate: data.pricing?.base_hourly_rate || 200,
      discount_type: data.pricing?.discount_type || 'none',
      discount_amount: data.pricing?.discount_amount || null,
      discount_percentage: data.pricing?.discount_percentage || null,
      subtotal: data.pricing?.subtotal || 0,
      discount_total: data.pricing?.discount_total || 0,
      total_amount: data.pricing?.total_amount || 0,
      auto_calculated: data.pricing?.auto_calculated || false,
      last_calculated: data.pricing?.last_calculated || null,
    },
    pricingRoles: data.pricingRoles || [],
    companyLogo: data.template?.company_logo || data.company_logo || data.companyLogo || '',
    clientName: data.template?.client_name || data.client_name || '',
    sowTitle: data.sow_title || data.title || 'Untitled SOW',
    clientSignature: data.template?.customer_signature_name ? {
      name: data.template.customer_signature_name,
      title: data.template.customer_signature || data.client_title || '',
      email: data.template.customer_email || data.client_email || '',
      date: data.signature_date || new Date().toISOString()
    } : undefined,
    clientSignerName: data.template?.customer_signature_name || data.client_signer_name || undefined,
    clientTitle: data.template?.customer_signature || data.client_title || '',
    clientEmail: data.template?.customer_email || data.client_email || '',
    customer_signature_name_2: data.template?.customer_signature_name_2 || undefined,
    customer_signature_2: data.template?.customer_signature_2 || undefined,
    customer_email_2: data.template?.customer_email_2 || undefined,
    salesforceAccountId: data.salesforce_account_id || undefined,
    template: {
      billing_company_name: data.template?.billing_company_name || (data.billing_info as Record<string, unknown>)?.company_name || '',
      billing_contact_name: data.template?.billing_contact_name || (data.billing_info as Record<string, unknown>)?.billing_contact || '',
      billing_address: data.template?.billing_address || (data.billing_info as Record<string, unknown>)?.billing_address || '',
      billing_email: data.template?.billing_email || (data.billing_info as Record<string, unknown>)?.billing_email || '',
      purchase_order_number: data.template?.purchase_order_number || (data.billing_info as Record<string, unknown>)?.po_number || '',
      customer_signature_name: data.template?.customer_signature_name || data.client_signer_name || '',
      customer_signature: data.template?.customer_signature || data.client_title || '',
      customer_email: data.template?.customer_email || data.client_email || '',
      lean_data_name: data.template?.lean_data_name || '',
      lean_data_title: data.template?.lean_data_title || '',
      lean_data_email: data.template?.lean_data_email || '',
    },
    custom_intro_content: data.custom_intro_content || undefined,
    custom_scope_content: data.custom_scope_content || undefined,
    custom_out_of_scope_content: data.custom_out_of_scope_content || undefined,
    custom_objectives_disclosure_content: data.custom_objectives_disclosure_content || undefined,
    custom_assumptions_content: data.custom_assumptions_content || undefined,
    custom_project_phases_content: data.custom_project_phases_content || undefined,
    custom_roles_content: data.custom_roles_content || undefined,
    custom_deliverables_content: data.custom_deliverables_content || undefined,
    custom_objective_overview_content: data.custom_objective_overview_content || undefined,
    custom_key_objectives_content: data.custom_key_objectives_content || undefined,
    products: data.template?.products || [],
    number_of_units: data.template?.number_of_units || data.number_of_units || '',
    regions: data.template?.regions || data.regions || '',
    salesforce_tenants: data.template?.salesforce_tenants || data.salesforce_tenants || '',
    salesforce_tenant_names: data.template?.salesforce_tenant_names || data.salesforce_tenant_names || '',
    timeline_weeks: data.template?.timeline_weeks || data.timeline_weeks || '',
    timeline_phases: data.template?.timeline_phases ?? [],
    units_consumption: data.template?.units_consumption || data.units_consumption || '',
    orchestration_units: data.template?.orchestration_units || data.orchestration_units || data.template?.number_of_units || '',
    bookit_forms_units: data.template?.bookit_forms_units || data.bookit_forms_units || '',
    bookit_links_units: data.template?.bookit_links_units || data.bookit_links_units || '',
    bookit_handoff_units: data.template?.bookit_handoff_units || data.bookit_handoff_units || '',
    leandata_name: data.template?.lean_data_name || data.leandata_name || '',
    leandata_title: data.template?.lean_data_title || data.leandata_title || '',
    leandata_email: data.template?.lean_data_email || data.leandata_email || '',
    intro_content_edited: data.intro_content_edited || false,
    scope_content_edited: data.scope_content_edited || false,
    out_of_scope_content_edited: data.out_of_scope_content_edited || false,
    objectives_disclosure_content_edited: data.objectives_disclosure_content_edited || false,
    assumptions_content_edited: data.assumptions_content_edited || false,
    project_phases_content_edited: data.project_phases_content_edited || false,
    roles_content_edited: data.roles_content_edited || false,
    deliverables_content_edited: data.deliverables_content_edited || false,
    objective_overview_content_edited: data.objective_overview_content_edited || false,
    key_objectives_content_edited: data.key_objectives_content_edited || false,
    approved_at: data.approved_at || undefined,
    rejected_at: data.rejected_at || undefined,
    approval_comments: data.approval_comments || undefined,
    author_id: data.author_id || null,
    is_latest: data.is_latest ?? true,
    version: data.version || 1,
  } as unknown as DisplaySOW;
}
