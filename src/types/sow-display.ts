/**
 * Display view-model for the read-only SOW view (`SOWDisplay`, print + full).
 *
 * This is deliberately distinct from `@/types/sow` `SOWData` (the editable form
 * shape). Where `SOWData` mirrors the nested API/template structure the form
 * drives off, `DisplaySOW` is a flattened, camelCase presentation shape
 * (`clientName`, `sowTitle`, `keyObjectives`, `projectDescription`, …) tailored
 * to what the view templates render. It is produced from the
 * `GET /api/sow/[id]` response by `mapApiResponseToDisplaySOW`
 * (src/lib/sow/map-api-response-to-display.ts) — the display-side counterpart to
 * `mapApiResponseToSOWData` (the form-side mapper).
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  sort_order: number;
}

export interface ClientRole {
  role: string;
  responsibilities: string;
  name: string;
  email: string;
  salesforce_contact_id?: string;
  contact_title?: string;
}

export interface DisplaySOW {
  id: string;
  clientName: string;
  sowTitle: string;
  clientTitle: string;
  clientEmail: string;
  signatureDate: string;
  deliverables: string[];
  projectDescription: string;
  keyObjectives: string[];
  startDate: string;
  duration: string;
  clientRoles: ClientRole[];
  pricingRoles?: Array<{
    role: string;
    rate_per_hour: number;
    default_rate?: number;
    total_hours: number;
    totalCost: number;
  }>;
  status: 'draft' | 'in_review' | 'approved' | 'rejected' | 'recalled';
  submitted_by?: string;
  submitted_at?: string;
  submitted_by_name?: string;
  pricing: {
    roles: Array<{
      role: string;
      ratePerHour: number;
      totalHours: number;
    }>;
    billing: {
      companyName: string;
      billingContact: string;
      billingAddress: string;
      billingEmail: string;
      poNumber: string;
      paymentTerms: string;
      currency: string;
      taxRate?: number;
      shipping?: number;
    };
    project_management_included?: boolean;
    project_management_hours?: number;
    project_management_rate?: number;
    base_hourly_rate?: number;
    discount_type?: 'none' | 'fixed' | 'percentage';
    discount_amount?: number;
    discount_percentage?: number;
    subtotal?: number;
    discount_total?: number;
    total_amount?: number;
    auto_calculated?: boolean;
    last_calculated?: string | null;
  };
  accessRequirements: string;
  travelRequirements: string;
  workingHours: string;
  testingResponsibilities: string;
  version: number;
  companyLogo: string;
  clientSignature?: {
    name: string;
    title: string;
    email: string;
    date: string;
  };
  clientSignerName?: string;
  salesforceAccountId?: string;
  customer_signature_name_2?: string;
  customer_signature_2?: string;
  customer_email_2?: string;
  products?: string[];
  number_of_units?: string;
  regions?: string;
  salesforce_tenants?: string;
  salesforce_tenant_names?: string;
  timeline_weeks?: string;
  timeline_phases?: import('@/lib/sow/timeline-phases').TimelinePhase[];
  units_consumption?: string;
  orchestration_units?: string;
  bookit_forms_units?: string;
  bookit_links_units?: string;
  bookit_handoff_units?: string;
  custom_intro_content?: string;
  custom_scope_content?: string;
  custom_out_of_scope_content?: string;
  custom_objectives_disclosure_content?: string;
  custom_assumptions_content?: string;
  custom_project_phases_content?: string;
  custom_roles_content?: string;
  custom_deliverables_content?: string;
  custom_objective_overview_content?: string;
  custom_key_objectives_content?: string;
  intro_content_edited?: boolean;
  scope_content_edited?: boolean;
  out_of_scope_content_edited?: boolean;
  objectives_disclosure_content_edited?: boolean;
  assumptions_content_edited?: boolean;
  project_phases_content_edited?: boolean;
  roles_content_edited?: boolean;
  deliverables_content_edited?: boolean;
  objective_overview_content_edited?: boolean;
  key_objectives_content_edited?: boolean;
  /** Flat `sows.payment_terms` column — top-level, not part of `template` (see map-sow-response). */
  payment_terms?: string;
  template?: {
    billing_company_name?: string;
    billing_contact_name?: string;
    billing_address?: string;
    billing_email?: string;
    purchase_order_number?: string;
    customer_signature_name?: string;
    customer_signature?: string;
    customer_email?: string;
    lean_data_name?: string;
    lean_data_title?: string;
    lean_data_email?: string;
  };
  approved_at?: string;
  rejected_at?: string;
  approval_comments?: string;
  pm_hours_requirement_disabled?: boolean;
  pm_hours_requirement_disabled_date?: string;
  pm_hours_requirement_disabled_requester_id?: string;
  pm_hours_requirement_disabled_approver_id?: string;
  author_id?: string | null;
  is_latest?: boolean;
}

export interface SalesforceData {
  account_data?: {
    name: string;
    id: string;
  };
  contacts_data?: Array<{
    first_name?: string;
    last_name: string;
    email?: string;
    title?: string;
    role: string;
  }>;
  opportunity_data?: unknown;
}
