// Salesforce data types for JSONB storage in sow_salesforce_data table

export interface SalesforceAccountData {
  id: string;
  name: string;
  website?: string;
  type?: string;
  owner?: string;
  owner_email?: string;
  billing_address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  industry?: string;
  phone?: string;
  account_segment?: string; // Account_Segment__c field
  // Partner-related fields
  partner_account_status?: string; // Partner_Account_Status__c
  partner_type?: string; // Partner_Type__c
  partner_tier?: string; // Partner_Tier__c
  primary_partner_contact?: string; // Primary_Partner_Contact__c
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
  // Partner-related fields
  isv_partner_account?: string; // ISV_Partner_Account__c
  isv_partner_account_name?: string; // Partner account name
  partner_account?: string; // Partner_Account__c (alternative partner field)
  implementation_partner?: string; // Implementation_Partner__c
  channel_partner_contract_amount?: number; // Channel_Partner_Contract_Amount__c
  date_of_partner_engagement?: string; // Date_of_Partner_Engagement__c
  is_partner_sourced?: boolean; // Calculated boolean indicating if opportunity is partner-sourced
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
  Owner?: { Name: string; Email?: string };
  BillingStreet?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingPostalCode?: string;
  BillingCountry?: string;
  Industry?: string;
  Phone?: string;
  Employee_Band__c?: string;
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
  // Partner-related fields
  ISV_Partner_Account__c?: string;
  ISV_Partner_Account__r?: { Name: string };
  Partner_Account__c?: string;
  Partner_Account__r?: { Name: string };
  Implementation_Partner__c?: string;
  Channel_Partner_Contract_Amount__c?: number;
  Date_of_Partner_Engagement__c?: string;
}

// Helper functions for working with Salesforce data
export const createSalesforceAccountData = (account: SalesforceAccountResponse): SalesforceAccountData => ({
  id: account.Id,
  name: account.Name,
  website: account.Website,
  type: account.Type,
  owner: account.Owner?.Name,
  owner_email: account.Owner?.Email,
  billing_address: {
    street: account.BillingStreet,
    city: account.BillingCity,
    state: account.BillingState,
    postal_code: account.BillingPostalCode,
    country: account.BillingCountry,
  },
  industry: account.Industry,
  phone: account.Phone,
  account_segment: account.Employee_Band__c,
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

export const createSalesforceOpportunityData = (opportunity: SalesforceOpportunityResponse): SalesforceOpportunityData => {
  // Determine if this is a partner-sourced opportunity (same logic as partner-info API)
  const isPartnerSourced = !!(
    opportunity.ISV_Partner_Account__c || 
    opportunity.Partner_Account__c ||
    opportunity.Implementation_Partner__c ||
    opportunity.Date_of_Partner_Engagement__c ||
    opportunity.Channel_Partner_Contract_Amount__c
  );

  return {
    id: opportunity.Id,
    name: opportunity.Name,
    amount: opportunity.Amount,
    stage_name: opportunity.StageName,
    close_date: opportunity.CloseDate,
    description: opportunity.Description,
    // Partner-related fields
    isv_partner_account: opportunity.ISV_Partner_Account__c,
    isv_partner_account_name: opportunity.ISV_Partner_Account__r?.Name,
    partner_account: opportunity.Partner_Account__c,
    implementation_partner: opportunity.Implementation_Partner__c,
    channel_partner_contract_amount: opportunity.Channel_Partner_Contract_Amount__c,
    date_of_partner_engagement: opportunity.Date_of_Partner_Engagement__c,
    is_partner_sourced: isPartnerSourced, // Add the calculated boolean
    selected_at: new Date().toISOString(),
  };
}; 