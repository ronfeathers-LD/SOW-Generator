// Salesforce data types for JSONB storage in sow_salesforce_data table

export interface SalesforceAccountData {
  id: string;
  name: string;
  website?: string;
  type?: string;
  owner?: string;
  billing_address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  industry?: string;
  phone?: string;
  selected_at: string; // ISO timestamp
}

export interface SalesforceContactData {
  id: string;
  first_name?: string;
  last_name: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  role: 'primary_poc' | 'billing_contact' | 'technical_contact' | 'decision_maker' | 'other';
  selected_at: string; // ISO timestamp
}

export interface SalesforceOpportunityData {
  id: string;
  name: string;
  amount?: number;
  stage_name?: string;
  close_date?: string; // ISO date
  description?: string;
  selected_at: string; // ISO timestamp
}

export interface SOWSalesforceData {
  sow_id: string;
  account_data?: SalesforceAccountData;
  contacts_data?: SalesforceContactData[];
  opportunity_data?: SalesforceOpportunityData;
  last_synced_at?: string; // ISO timestamp
  created_at?: string; // ISO timestamp
  updated_at?: string; // ISO timestamp
}

// Helper types for API responses
export interface SalesforceDataResponse {
  success: boolean;
  data?: SOWSalesforceData;
  error?: string;
}

// Salesforce API response types
export interface SalesforceAccountResponse {
  Id: string;
  Name: string;
  Website?: string;
  Type?: string;
  Owner?: { Name: string };
  BillingStreet?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingPostalCode?: string;
  BillingCountry?: string;
  Industry?: string;
  Phone?: string;
}

export interface SalesforceContactResponse {
  Id: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  Department?: string;
}

export interface SalesforceOpportunityResponse {
  Id: string;
  Name: string;
  Amount?: number;
  StageName?: string;
  CloseDate?: string;
  Description?: string;
}

// Helper functions for working with Salesforce data
export const createSalesforceAccountData = (account: SalesforceAccountResponse): SalesforceAccountData => ({
  id: account.Id,
  name: account.Name,
  website: account.Website,
  type: account.Type,
  owner: account.Owner?.Name,
  billing_address: {
    street: account.BillingStreet,
    city: account.BillingCity,
    state: account.BillingState,
    postal_code: account.BillingPostalCode,
    country: account.BillingCountry,
  },
  industry: account.Industry,
  phone: account.Phone,
  selected_at: new Date().toISOString(),
});

export const createSalesforceContactData = (contact: SalesforceContactResponse, role: SalesforceContactData['role'] = 'primary_poc'): SalesforceContactData => ({
  id: contact.Id,
  first_name: contact.FirstName,
  last_name: contact.LastName,
  email: contact.Email,
  phone: contact.Phone,
  title: contact.Title,
  department: contact.Department,
  role,
  selected_at: new Date().toISOString(),
});

export const createSalesforceOpportunityData = (opportunity: SalesforceOpportunityResponse): SalesforceOpportunityData => ({
  id: opportunity.Id,
  name: opportunity.Name,
  amount: opportunity.Amount,
  stage_name: opportunity.StageName,
  close_date: opportunity.CloseDate,
  description: opportunity.Description,
  selected_at: new Date().toISOString(),
}); 