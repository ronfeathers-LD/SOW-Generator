/**
 * Client-side SOW mapper — the counterpart to the server serializer
 * (src/lib/sow/map-sow-response.ts, #68).
 *
 * `GET /api/sow/[id]` returns the canonical nested response; the editor then has
 * to turn that into the `SOWData` the form drives off. That response→form-state
 * mapping was inlined in the edit page (~120 lines) and is the client-side twin
 * of the duplication we removed on the server. Centralizing it here gives one
 * seam where the form's initial state — including the legacy `header`
 * compatibility shape and the form-only defaults the API does not supply — is
 * produced.
 *
 * Behavior-preserving: this reproduces exactly what the edit page used to build,
 * including its form-only defaults (`'None Selected'` signatories, an empty
 * `key_objectives` of `['']`, and the synthesized `selectedAccount`).
 */
import { SOWData } from '@/types/sow';
import { SalesforceAccount } from '@/lib/salesforce';

// The parsed JSON from GET /api/sow/[id]. The endpoint is untyped, so the
// response is modelled as a loose record — the same way the edit page treated it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SowApiResponse = Record<string, any>;

export function mapApiResponseToSOWData(data: SowApiResponse): SOWData {
  return {
    id: data.id,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
    // Include salesforce_account_id
    salesforce_account_id: data.salesforce_account_id,
    // Include Salesforce account owner information
    salesforce_account_owner_name: data.salesforce_account_owner_name,
    salesforce_account_owner_email: data.salesforce_account_owner_email,
    // Include salesforce_contact_id
    salesforce_contact_id: data.salesforce_contact_id,
    // Include account segment
    account_segment: data.account_segment,
    // Include PM hours removal state so hour recalculation reflects an approved removal
    pm_hours_requirement_disabled: data.pm_hours_requirement_disabled || false,
    pm_hours_removed: data.pm_hours_removed || 0,
    // Use the template data from the API response, merging with top-level fields
    template: {
      ...data.template,
      // Ensure client_name is available
      client_name: data.client_name || data.template?.client_name || '',
      // Include other template fields
      sow_title: data.sow_title || data.template?.sow_title || '',
      lean_data_name: data.leandata_name || data.template?.lean_data_name || 'None Selected',
      lean_data_title: data.leandata_title || data.template?.lean_data_title || 'None Selected',
      lean_data_email: data.leandata_email || data.template?.lean_data_email || 'None Selected',
    },
    // Required properties for SOWData interface
    header: {
      company_logo: data.company_logo || '',
      client_name: data.client_name || data.template?.client_name || '',
      sow_title: data.sow_title || data.template?.sow_title || '',
    },
    objectives: {
      description: data.objectives?.description || '',
      key_objectives: data.objectives?.key_objectives || [''],
      avoma_url: data.objectives?.avoma_url || '',
      avoma_transcription: data.objectives?.avoma_transcription || '',
      avoma_recordings: data.objectives?.avoma_recordings || [],
    },
    scope: {
      deliverables: data.deliverables || '',
      timeline: {
        duration: data.duration || '',
      },
    },
    roles: {
      client_roles: data.client_roles || [],
    },
    pricing: {
      roles: data.pricingRoles || [],
      billing: data.billing_info || {
        companyName: '',
        billingContact: '',
        billingAddress: '',
        billingEmail: '',
        poNumber: '',
        paymentTerms: '',
        currency: '',
      },
      // Include pricing configuration fields
      project_management_included: data.pricing?.project_management_included || false,
      project_management_hours: data.pricing?.project_management_hours || 40,
      project_management_rate: data.pricing?.project_management_rate || 225,
      base_hourly_rate: data.pricing?.base_hourly_rate || 200,
      discount_type: data.pricing?.discount_type || 'none',
      discount_amount: data.pricing?.discount_amount || 0,
      discount_percentage: data.pricing?.discount_percentage || 0,
      subtotal: data.pricing?.subtotal || 0,
      discount_total: data.pricing?.discount_total || 0,
      total_amount: data.pricing?.total_amount || 0,
      auto_calculated: data.pricing?.auto_calculated || false,
      last_calculated: data.pricing?.last_calculated || null,
    },
    // Set selectedAccount immediately if we have salesforce_account_id
    selectedAccount: data.salesforce_account_id ? ({
      Id: data.salesforce_account_id,
      Name: data.client_name || data.template?.client_name || '',
      // Add other required fields with defaults
      BillingStreet: '',
      BillingCity: '',
      BillingState: '',
      BillingPostalCode: '',
      BillingCountry: '',
      Billing_Contact__c: '',
      Billing_Email__c: '',
      Employee_Band__c: data.account_segment || '', // Include account segment
    } as SalesforceAccount) : undefined,
    // Include custom content fields
    custom_intro_content: data.custom_intro_content || null,
    custom_scope_content: data.custom_scope_content || null,
    custom_objectives_disclosure_content: data.custom_objectives_disclosure_content || null,
    custom_assumptions_content: data.custom_assumptions_content || null,
    custom_project_phases_content: data.custom_project_phases_content || null,
    custom_deliverables_content: data.custom_deliverables_content || null,
    custom_objective_overview_content: data.custom_objective_overview_content || null,
    custom_key_objectives_content: data.custom_key_objectives_content || null,
    // Include wizard data fields
    selected_documents: data.selected_documents || [],
    selected_meetings: data.selected_meetings || [],
    preview_content: data.preview_content || null,
    // Include Salesforce data
    salesforce_data: data.salesforce_data || null,
    intro_content_edited: data.intro_content_edited || false,
    scope_content_edited: data.scope_content_edited || false,
    objectives_disclosure_content_edited: data.objectives_disclosure_content_edited || false,
    assumptions_content_edited: data.assumptions_content_edited || false,
    project_phases_content_edited: data.project_phases_content_edited || false,
    deliverables_content_edited: data.deliverables_content_edited || false,
    objective_overview_content_edited: data.objective_overview_content_edited || false,
    key_objectives_content_edited: data.key_objectives_content_edited || false,
    // AI-generated content baselines for edit detection
    ai_generated_objective_overview_content: data.ai_generated_objective_overview_content || null,
    ai_generated_key_objectives_content: data.ai_generated_key_objectives_content || null,
    ai_generated_deliverables_content: data.ai_generated_deliverables_content || null,
  };
}
