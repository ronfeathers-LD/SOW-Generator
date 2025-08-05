export interface BillingInfo {
  company_name: string;
  billing_contact: string;
  billing_address: string;
  billing_email: string;
  po_number: string;
  payment_terms: string;
  currency: string;
  tax_exempt?: boolean;
  tax_exemption_number?: string;
  credit_rating?: string;
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
  customer_name: string;
  customer_signature_name: string;
  customer_signature: string;
  customer_email: string;
  customer_signature_date: Date | null;
  
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
  };

  // Project Scope
  scope: {
    project_description: string;
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
      rate_per_hour: number;
      total_hours: number;
    }>;
    billing: BillingInfo;
  };

  // Project Assumptions
  assumptions: {
    access_requirements: string;
    travel_requirements: string;
    working_hours: string;
    testing_responsibilities: string;
  };

  client_signer_name?: string;
  deliverables?: string;
  
  // Salesforce Information
  salesforce_account_id?: string;
  salesforce_contact_id?: string;
  selectedAccount?: {
    id: string;
    name: string;
  } | null;
  
  // Salesforce Opportunity Information
  opportunity_id?: string;
  opportunity_name?: string;
  opportunity_amount?: number;
  opportunity_stage?: string;
  opportunity_close_date?: string;

  // Custom content tracking
  custom_intro_content?: string;
  custom_scope_content?: string;
  custom_objectives_disclosure_content?: string;
  custom_assumptions_content?: string;
  custom_project_phases_content?: string;
  custom_roles_content?: string;
  intro_content_edited?: boolean;
  scope_content_edited?: boolean;
  objectives_disclosure_content_edited?: boolean;
  assumptions_content_edited?: boolean;
  project_phases_content_edited?: boolean;
  roles_content_edited?: boolean;
  
  // Database date fields
  project_start_date?: string;
  project_end_date?: string;
} 