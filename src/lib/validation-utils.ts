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
  const regionsNum = parseInt(String(sowData.regions || ''));
  if (!sowData.regions || isNaN(regionsNum) || regionsNum <= 0 || regionsNum >= 99) {
    errors.push('Regions must be greater than 0 and less than 99');
  }
  const tenantsNum = parseInt(String(sowData.salesforce_tenants || ''));
  if (!sowData.salesforce_tenants || isNaN(tenantsNum) || tenantsNum <= 0 || tenantsNum >= 99) {
    errors.push('Tenants must be greater than 0 and less than 99');
  }
  const timelineNum = parseInt(String(sowData.timeline_weeks || ''));
  if (!sowData.timeline_weeks || isNaN(timelineNum) || timelineNum <= 0 || timelineNum >= 99) {
    errors.push('Timeline must be greater than 0 and less than 99');
  }
  if (!sowData.products || !Array.isArray(sowData.products) || (sowData.products as unknown[]).length === 0) {
    errors.push('At least one product must be selected');
  }

  // Objectives Tab validation
  const objectiveOverview = (sowData.custom_objective_overview_content as string) || (sowData.objectives as Record<string, unknown>)?.description as string || '';
  if (!objectiveOverview || objectiveOverview.trim() === '') {
    missingFields.push('Objective Overview');
  }
  
  // Handle keyObjectives as either custom content string or array of objectives
  const customKeyObjectivesContent = sowData.custom_key_objectives_content as string;
  const objectivesArray = (sowData.objectives as Record<string, unknown>)?.key_objectives as string[] | undefined;
  
  let keyObjectivesValid = false;
  if (customKeyObjectivesContent && customKeyObjectivesContent.trim() !== '') {
    keyObjectivesValid = true;
  } else if (objectivesArray && Array.isArray(objectivesArray) && objectivesArray.length > 0) {
    // Check if any objective in the array has content
    keyObjectivesValid = objectivesArray.some(obj => obj && typeof obj === 'string' && obj.trim() !== '');
  }
  
  if (!keyObjectivesValid) {
    missingFields.push('Key Objectives');
  }
  
  const deliverables = (sowData.custom_deliverables_content as string) || (sowData.scope as Record<string, unknown>)?.deliverables as string || '';
  if (!deliverables || deliverables.trim() === '') {
    missingFields.push('Deliverables');
  }

  // Signers & Roles Tab validation
  if (!sowData.client_signer_name || ((sowData.client_signer_name as string) || '').trim() === '') {
    missingFields.push('Customer Signer');
  }
  // Check if signer has a title from template
  const signerTitle = (sowData.template as Record<string, unknown>)?.customer_signature;
  if (!signerTitle || ((signerTitle as string) || '').trim() === '') {
    missingFields.push('Customer Signer Title');
  }
  // Check LeanData signatory - look for leandata_name in template (which gets set when signatory is selected)
  const leanDataName = (sowData.template as Record<string, unknown>)?.lean_data_name;
  if (!leanDataName || ((leanDataName as string) || '').trim() === '' || (leanDataName as string).trim() === 'None Selected') {
    missingFields.push('LeanData Signatory');
  }
  if (!sowData.client_roles || !Array.isArray(sowData.client_roles) || (sowData.client_roles as unknown[]).length === 0) {
    errors.push('At least one Client Role must be added');
  }

  // Pricing Tab validation - check for pricing roles and hours
  if (sowData.pricing_roles) {
    let pricingRoles: Array<Record<string, unknown>> = [];
    
    // Handle different pricing_roles data structures
    if (Array.isArray(sowData.pricing_roles)) {
      // If it's directly an array, use it
      pricingRoles = sowData.pricing_roles;
    } else if (sowData.pricing_roles && typeof sowData.pricing_roles === 'object' && 'roles' in sowData.pricing_roles) {
      // If it's an object with a roles property, extract the roles array
      const rolesData = (sowData.pricing_roles as Record<string, unknown>).roles;
      if (Array.isArray(rolesData)) {
        pricingRoles = rolesData;
      }
    }
    
    if (pricingRoles.length === 0) {
      errors.push('At least one pricing role must be configured');
    } else {
      // Check if any role has hours > 0
      const hasValidHours = pricingRoles.some(role => 
        role.totalHours && (role.totalHours as number) > 0
      );
      if (!hasValidHours) {
        errors.push('Hours must be greater than 0');
      }
    }
  }

  // Billing Information validation - now stored in template fields
  const billingCompanyName = (sowData.template as Record<string, unknown>)?.billing_company_name;
  const billingContactName = (sowData.template as Record<string, unknown>)?.billing_contact_name;
  const billingAddress = (sowData.template as Record<string, unknown>)?.billing_address;
  const billingEmail = (sowData.template as Record<string, unknown>)?.billing_email;
  
  if (!billingCompanyName || (billingCompanyName as string || '').trim() === '') {
    missingFields.push('Billing Company Name');
  }
  if (!billingContactName || (billingContactName as string || '').trim() === '') {
    missingFields.push('Billing Contact');
  }
  if (!billingAddress || (billingAddress as string || '').trim() === '') {
    missingFields.push('Billing Address');
  }
  if (!billingEmail || (billingEmail as string || '').trim() === '') {
    missingFields.push('Billing Email');
  }

  const isValid = missingFields.length === 0 && errors.length === 0;
  
  return {
    isValid,
    missingFields,
    errors
  };
}
