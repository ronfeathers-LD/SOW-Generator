import { SalesforceAccount, SalesforceContact } from '@/lib/salesforce';

export interface BillingInfo {
  company_name: string;
  billing_contact: string;
  billing_address: string;
  billing_email: string;
  po_number: string;
}

export interface ClientRole {
  role: string;
  name: string;
  email: string;
  responsibilities: string;
  salesforce_contact_id?: string;
  contact_title?: string;
}

export interface SOWTemplate {
  // Header Information
  sow_title: string;
  company_logo: string;
  
  // Customer Information
  client_name: string;
  customer_signature_name: string;
  customer_signature: string;
  customer_email: string;
  customer_signature_date: Date | null;
  
  // Second Customer Signer (optional)
  customer_signature_name_2?: string;
  customer_signature_2?: string;
  customer_email_2?: string;
  
  // LeanData Information
  lean_data_name: string;
  lean_data_title: string;
  lean_data_email: string;
  lean_data_signature_name: string;
  lean_data_signature: string;
  lean_data_signature_date: Date | null;
  
  // Project Details
  products: string[];
  number_of_units: string;
  regions: string;
  salesforce_tenants: string;
  timeline_weeks: string;
  units_consumption: string;
  
  // BookIt Family Units
  orchestration_units: string;
  bookit_forms_units: string;
  bookit_links_units: string;
  bookit_handoff_units: string;
  other_products_units: string;
  
  // Billing Information
  billing_company_name: string;
  billing_contact_name: string;
  billing_address: string;
  billing_email: string;
  purchase_order_number: string;
  
  // Salesforce Opportunity Information
  opportunity_id?: string;
  opportunity_name?: string;
  opportunity_amount?: number;
  opportunity_stage?: string;
  opportunity_close_date?: string;
}

export interface SOWContentTemplate {
  id: string;
  created_at: Date;
  updated_at: Date;
  section_name: string;
  section_title: string;
  default_content: string;
  is_active: boolean;
  sort_order: number;
  description?: string;
}

export interface SOWData {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
  
  // Template Variables
  template?: SOWTemplate;
  
  // Header Information
  header: {
    company_logo: string;
    client_name: string;
    sow_title: string;
  };

  // Client Signature Information
  client_signature: {
    name: string;
    title: string;
    email: string;
    signature_date: Date;
  };

  // Project Objectives
  objectives: {
    description: string;
    key_objectives: string[];
    avoma_url?: string;
    avoma_transcription?: string;
    // Support for multiple Avoma recordings
    avoma_recordings?: Array<{
      id: string;
      url: string;
      transcription?: string;
      title?: string;
      date?: string;
      status: 'pending' | 'completed' | 'failed';
    }>;
  };

  // Project Scope
  scope: {
    deliverables: string;
    timeline: {
      duration: string;
    };
  };

  // Roles and Responsibilities
  roles: {
    client_roles: ClientRole[];
  };

  // Pricing Information
  pricing: {
    roles: Array<{
      role: string;
      ratePerHour: number;
      totalHours: number;
    }>;
    billing: BillingInfo;
    // New pricing configuration fields
    project_management_included?: boolean;
    project_management_hours?: number;
    project_management_rate?: number;
    base_hourly_rate?: number;
    discount_type?: 'none' | 'fixed' | 'percentage';
    discount_amount?: number | null;
    discount_percentage?: number | null;
    subtotal?: number;
    discount_total?: number;
    total_amount?: number;
    // Auto-save tracking fields
    auto_calculated?: boolean;
    last_calculated?: string;
  };

  // Project Assumptions
  // Note: access_requirements, travel_requirements, working_hours, testing_responsibilities columns have been removed

  client_signer_name?: string;
  deliverables?: string;
  
  // Salesforce Information
  salesforce_account_id?: string;
  salesforce_account_owner_name?: string;
  salesforce_account_owner_email?: string;
  salesforce_contact_id?: string;
  opportunity_id?: string;
  opportunity_name?: string;
  opportunity_amount?: number;
  opportunity_stage?: string;
  opportunity_close_date?: string;
  selectedAccount?: SalesforceAccount;
  selectedContact?: SalesforceContact;
  
  // PM Hours Removal tracking
  pm_hours_removed?: number;
  pm_hours_removal_approved?: boolean;
  pm_hours_removal_date?: Date;
  pm_hours_requirement_disabled?: boolean;
  pm_hours_requirement_disabled_date?: Date;
  pm_hours_requirement_disabled_requester_id?: string;
  pm_hours_requirement_disabled_approver_id?: string;
  
  // LeanData Signatory
  leandata_signatory_id?: string;
  
  // Account Information
  account_segment?: string;
  
  // Custom content fields
  custom_intro_content?: string;
  custom_scope_content?: string;
  custom_out_of_scope_content?: string;
  custom_objectives_disclosure_content?: string;
  custom_objective_overview_content?: string;
  custom_key_objectives_content?: string;
  custom_assumptions_content?: string;
  custom_deliverables_content?: string;
  custom_project_phases_content?: string;
  custom_timeline_content?: string;
  custom_team_content?: string;
  custom_billing_content?: string;
  custom_terms_content?: string;
  
  // Content editing flags
  intro_content_edited?: boolean;
  scope_content_edited?: boolean;
  out_of_scope_content_edited?: boolean;
  objectives_disclosure_content_edited?: boolean;
  objective_overview_content_edited?: boolean;
  key_objectives_content_edited?: boolean;
  assumptions_content_edited?: boolean;
  deliverables_content_edited?: boolean;
  project_phases_content_edited?: boolean;
  timeline_content_edited?: boolean;
  team_content_edited?: boolean;
  billing_content_edited?: boolean;
  terms_content_edited?: boolean;
}

// PM Hours Requirement Disable System Types
export interface PMHoursRequirementDisableRequest {
  id: string;
  created_at: Date;
  updated_at: Date;
  sow_id: string;
  requester_id: string;
  pm_director_id?: string;
  current_pm_hours?: number;
  requested_pm_hours?: number;
  hours_to_remove?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: Date;
  rejected_by?: string;
  rejected_at?: Date;
  approval_comments?: string;
  rejection_reason?: string;
  financial_impact?: number;
}

export interface PMHoursComment {
  id: string;
  created_at: Date;
  updated_at: Date;
  request_id: string;
  user_id: string;
  comment: string;
  parent_id?: string;
  is_internal: boolean;
  user?: {
    name: string;
    email: string;
  };
}

export interface PMHoursRequirementDisableDashboardItem {
  request_id: string;
  created_at: Date;
  updated_at: Date;
  status: string;
  current_pm_hours: number;
  hours_to_remove: number;
  reason: string;
  financial_impact: number;
  sow_id: string;
  sow_title: string;
  client_name: string;
  sow_status: string;
  requester_id: string;
  requester_name: string;
  requester_email: string;
  pmo_reviewer_name?: string;
  pmo_reviewer_email?: string;
  hours_since_request: number;
}

// Change Order Types
export type ChangeOrderStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export type ChangeCategory = 
  | 'Schedule' 
  | 'Cost' 
  | 'Scope' 
  | 'Testing (Quality)' 
  | 'Resources' 
  | 'Artifacts';

export interface ChangeOrderData {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
  
  // Reference to original SOW
  sow_id: string;
  
  // Change Order Details
  change_order_number: string; // CO#01, CO#02, etc.
  change_number: number;      // Sequential number (1, 2, 3...)
  change_requestor: string;     // Who requested the change
  
  // Change Categories
  change_categories: ChangeCategory[];
  
  // User Input Fields
  reason_for_change: string;
  change_description: string;
  
  // Project Details (copied from SOW)
  project_name: string;
  original_start_date?: Date;
  original_end_date?: Date;
  new_start_date?: Date;
  new_end_date?: Date;
  
  // Signer Information (copied from SOW)
  client_signer_name: string;
  client_signer_title: string;
  client_signer_email: string;
  leandata_signer_name: string;
  leandata_signer_title: string;
  leandata_signer_email: string;
  
  // Order Form Details
  order_form_date: Date;
  
  // Additional fields from template
  associated_po?: string;
  
  // Pricing data (if Cost or Scope is selected)
  pricing_roles?: Array<{
    role: string;
    ratePerHour: number;
    totalHours: number;
    totalCost: number;
  }>;
  total_change_amount?: number;
  
  // Status and Tracking
  status: ChangeOrderStatus;
  author_id?: string;
  
  // Soft delete
  is_hidden?: boolean;
}

export interface ChangeOrderFormData {
  // SOW Selection
  sow_id: string;
  
  // Change Order Details
  change_requestor: string;
  change_categories: ChangeCategory[];
  
  // User Input Fields
  reason_for_change: string;
  change_description: string;
  
  // New Dates (if applicable)
  new_start_date?: Date;
  new_end_date?: Date;
  
  // Additional fields
  associated_po?: string;
  
  // Pricing data (if Cost or Scope is selected)
  pricing_roles?: Array<{
    role: string;
    ratePerHour: number;
    totalHours: number;
    totalCost: number;
  }>;
}

export interface ChangeOrderWithSOW extends ChangeOrderData {
  sow?: {
    id: string;
    sow_title: string;
    client_name: string;
    start_date?: Date;
    template?: SOWTemplate;
  };
}

export interface ChangeOrderCreationRequest {
  sow_id: string;
  change_requestor: string;
  change_categories: ChangeCategory[];
  reason_for_change: string;
  change_description: string;
  new_start_date?: Date;
  new_end_date?: Date;
  associated_po?: string;
  pricing_roles?: Array<{
    role: string;
    ratePerHour: number;
    totalHours: number;
    totalCost: number;
  }>;
} 