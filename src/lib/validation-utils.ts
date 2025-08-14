/**
 * Client-safe validation utilities for SOW approval requirements
 */

export interface SOWValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
}

/**
 * Comprehensive validation of SOW before allowing approval
 * This runs on the client side and doesn't require server imports
 */
export function validateSOWForApproval(sowData: { [key: string]: any }): SOWValidationResult {
  const missingFields: string[] = [];
  const errors: string[] = [];

  // Basic required fields
  if (!sowData.sow_title) missingFields.push('SOW Title');
  if (!sowData.client_name) missingFields.push('Client Name');


  // Overview Tab validation
  if (!sowData.number_of_units || sowData.number_of_units <= 0 || sowData.number_of_units >= 99) {
    errors.push('Regions must be greater than 0 and less than 99');
  }
  if (!sowData.salesforce_tenants || sowData.salesforce_tenants <= 0 || sowData.salesforce_tenants >= 99) {
    errors.push('Tenants must be greater than 0 and less than 99');
  }
  if (!sowData.timeline_weeks || sowData.timeline_weeks <= 0 || sowData.timeline_weeks >= 99) {
    errors.push('Timeline must be greater than 0 and less than 99');
  }
  if (!sowData.products || !Array.isArray(sowData.products) || sowData.products.length === 0) {
    errors.push('At least one product must be selected');
  }

  // Objectives Tab validation
  if (!sowData.custom_objective_overview_content || sowData.custom_objective_overview_content.trim() === '') {
    missingFields.push('Objective Overview');
  }
  if (!sowData.custom_key_objectives_content || sowData.custom_key_objectives_content.trim() === '') {
    missingFields.push('Key Objectives');
  }
  if (!sowData.custom_deliverables_content || sowData.custom_deliverables_content.trim() === '') {
    missingFields.push('Deliverables');
  }

  // Team & Roles Tab validation
  if (!sowData.client_signer_name || sowData.client_signer_name.trim() === '') {
    missingFields.push('Customer Signer');
  }
  // Check if signer has a title (either from template or direct field)
  const signerTitle = sowData.template?.customer_signature || sowData.client_signer_title;
  if (!signerTitle || signerTitle.trim() === '') {
    missingFields.push('Customer Signer Title');
  }
  if (!sowData.leandata_name || sowData.leandata_name.trim() === '') {
    missingFields.push('LeanData Signatory');
  }
  if (!sowData.client_roles || !Array.isArray(sowData.client_roles) || sowData.client_roles.length === 0) {
    errors.push('At least one Client Role must be added');
  }

  // Billing & Payment Tab validation
  if (!sowData.billing_info?.hours || sowData.billing_info.hours <= 0) {
    errors.push('Hours must be greater than 0');
  }
  if (!sowData.billing_info?.billing_information || sowData.billing_info.billing_information.trim() === '') {
    missingFields.push('Billing Information');
  }
  if (!sowData.billing_info?.billing_contact || sowData.billing_info.billing_contact.trim() === '') {
    missingFields.push('Billing Contact');
  }

  const isValid = missingFields.length === 0 && errors.length === 0;
  
  return {
    isValid,
    missingFields,
    errors
  };
}
