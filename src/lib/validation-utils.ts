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
export function validateSOWForApproval(sowData: { [key: string]: unknown }): SOWValidationResult {
  const missingFields: string[] = [];
  const errors: string[] = [];

  // Basic required fields
  if (!sowData.sow_title) missingFields.push('SOW Title');
  if (!sowData.client_name) missingFields.push('Client Name');


  // Overview Tab validation
  if (!sowData.number_of_units || (sowData.number_of_units as number) <= 0 || (sowData.number_of_units as number) >= 99) {
    errors.push('Regions must be greater than 0 and less than 99');
  }
  if (!sowData.salesforce_tenants || (sowData.salesforce_tenants as number) <= 0 || (sowData.salesforce_tenants as number) >= 99) {
    errors.push('Tenants must be greater than 0 and less than 99');
  }
  if (!sowData.timeline_weeks || (sowData.timeline_weeks as number) <= 0 || (sowData.timeline_weeks as number) >= 99) {
    errors.push('Timeline must be greater than 0 and less than 99');
  }
  if (!sowData.products || !Array.isArray(sowData.products) || (sowData.products as unknown[]).length === 0) {
    errors.push('At least one product must be selected');
  }

  // Objectives Tab validation
  if (!sowData.custom_objective_overview_content || ((sowData.custom_objective_overview_content as string) || '').trim() === '') {
    missingFields.push('Objective Overview');
  }
  if (!sowData.custom_key_objectives_content || ((sowData.custom_key_objectives_content as string) || '').trim() === '') {
    missingFields.push('Key Objectives');
  }
  if (!sowData.custom_deliverables_content || ((sowData.custom_deliverables_content as string) || '').trim() === '') {
    missingFields.push('Deliverables');
  }

  // Team & Roles Tab validation
  if (!sowData.client_signer_name || ((sowData.client_signer_name as string) || '').trim() === '') {
    missingFields.push('Customer Signer');
  }
  // Check if signer has a title (either from template or direct field)
  const signerTitle = (sowData.template as Record<string, unknown>)?.customer_signature || sowData.client_signer_title;
  if (!signerTitle || ((signerTitle as string) || '').trim() === '') {
    missingFields.push('Customer Signer Title');
  }
  if (!sowData.leandata_name || ((sowData.leandata_name as string) || '').trim() === '') {
    missingFields.push('LeanData Signatory');
  }
  if (!sowData.client_roles || !Array.isArray(sowData.client_roles) || (sowData.client_roles as unknown[]).length === 0) {
    errors.push('At least one Client Role must be added');
  }

  // Pricing Tab validation
  if (sowData.billing_info) {
    const billingInfo = sowData.billing_info as Record<string, unknown>;
    if (!billingInfo.hours || (billingInfo.hours as number || 0) <= 0) {
      errors.push('Hours must be greater than 0');
    }
    if (!billingInfo.billing_information || ((billingInfo.billing_information as string) || '').trim() === '') {
      missingFields.push('Billing Information');
    }
    if (!billingInfo.billing_contact || ((billingInfo.billing_contact as string) || '').trim() === '') {
      missingFields.push('Billing Contact');
    }
  }

  const isValid = missingFields.length === 0 && errors.length === 0;
  
  return {
    isValid,
    missingFields,
    errors
  };
}
