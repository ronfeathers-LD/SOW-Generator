import { createServiceRoleClient } from './supabase-server';

export interface ApprovalWorkflowConfig {
  sowId: string;
  sowTitle: string;
  clientName: string;
  authorId: string;
  authorEmail: string;
}

export class ApprovalWorkflowService {
  /**
   * Automatically start an approval workflow for a SOW
   * This creates the approval record and sets the workflow in motion
   */
  static async startApprovalWorkflow(config: ApprovalWorkflowConfig): Promise<void> {
    try {
      const supabase = createServiceRoleClient();
      
      console.log('Starting automatic approval workflow for SOW:', config.sowId);
      
      // Check if approval workflow already exists
      const { data: existingApproval, error: checkError } = await supabase
        .from('sow_approvals')
        .select('id')
        .eq('sow_id', config.sowId)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking existing approval:', checkError);
        throw new Error('Failed to check existing approval workflow');
      }
      
      // If approval workflow already exists, don't create another one
      if (existingApproval) {
        console.log('Approval workflow already exists for SOW:', config.sowId);
        return;
      }
      
      // IMPORTANT: Get the current SOW data to validate before proceeding
      const { data: currentSOW, error: sowError } = await supabase
        .from('sows')
        .select('*')
        .eq('id', config.sowId)
        .single();
      
      if (sowError || !currentSOW) {
        console.error('Error fetching SOW data for validation:', sowError);
        throw new Error('Failed to fetch SOW data for validation');
      }
      
      // Validate the SOW before creating approval workflow
      const validation = this.validateSOWForApproval(currentSOW);
      if (!validation.isValid) {
        console.log('SOW validation failed, cannot start approval workflow:', validation);
        console.log('Missing fields:', validation.missingFields);
        console.log('Validation errors:', validation.errors);
        return; // Don't proceed with approval workflow
      }
      
      console.log('SOW validation passed, proceeding with approval workflow creation');
      
      // Create the approval record
      const { error: createError } = await supabase
        .from('sow_approvals')
        .insert({
          sow_id: config.sowId,
          stage_id: 'simple-approval', // Use our simplified stage
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating approval record:', createError);
        throw new Error('Failed to create approval record');
      }
      
      console.log('Approval workflow started successfully for SOW:', config.sowId);
      
      // Update SOW status to indicate it's in review
      const { error: statusError } = await supabase
        .from('sows')
        .update({ 
          status: 'in_review',
          updated_at: new Date().toISOString()
        })
        .eq('id', config.sowId);
      
      if (statusError) {
        console.error('Error updating SOW status:', statusError);
        // Don't throw here as the approval was created successfully
      }
      
    } catch (error) {
      console.error('Error starting approval workflow:', error);
      // Don't throw here as this shouldn't fail the main SOW operation
    }
  }
  
  /**
   * Check if a SOW needs approval workflow started
   * This determines when to automatically start the workflow
   */
  static shouldStartApprovalWorkflow(sowData: { status?: string; [key: string]: any }): boolean {
    // Check all required fields are properly filled out
    const validation = this.validateSOWForApproval(sowData);
    
    // Don't start if SOW is already in review or approved
    const notAlreadyInWorkflow = 
      sowData.status !== 'in_review' && 
      sowData.status !== 'approved' && 
      sowData.status !== 'rejected';
    
    return validation.isValid && notAlreadyInWorkflow;
  }

  /**
   * Reset SOW status if it's incorrectly set to "in_review" but validation fails
   * This fixes the case where a SOW got into an invalid state
   */
  static async resetInvalidSOWStatus(sowId: string): Promise<void> {
    try {
      const supabase = createServiceRoleClient();
      
      // Get current SOW data
      const { data: currentSOW, error: sowError } = await supabase
        .from('sows')
        .select('*')
        .eq('id', sowId)
        .single();
      
      if (sowError || !currentSOW) {
        console.error('Error fetching SOW data for status reset:', sowError);
        return;
      }
      
      // If SOW is "in_review" but validation fails, reset to "draft"
      if (currentSOW.status === 'in_review') {
        const validation = this.validateSOWForApproval(currentSOW);
        if (!validation.isValid) {
          console.log('SOW is incorrectly in review status, resetting to draft:', sowId);
          
          // Reset status to draft
          const { error: resetError } = await supabase
            .from('sows')
            .update({ 
              status: 'draft',
              updated_at: new Date().toISOString()
            })
            .eq('id', sowId);
          
          if (resetError) {
            console.error('Error resetting SOW status:', resetError);
          } else {
            console.log('SOW status reset to draft successfully:', sowId);
          }
        }
      }
    } catch (error) {
      console.error('Error resetting invalid SOW status:', error);
    }
  }

  /**
   * Comprehensive validation of SOW before allowing approval
   * This duplicates the client-side validation logic for server-side use
   */
  static validateSOWForApproval(sowData: { status?: string; [key: string]: any }): { isValid: boolean; missingFields: string[]; errors: string[] } {
    const missingFields: string[] = [];
    const errors: string[] = [];

    // Basic required fields
    if (!sowData.sow_title) missingFields.push('SOW Title');
    if (!sowData.client_name) missingFields.push('Client Name');
    if (!sowData.project_description) missingFields.push('Project Description');

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

  /**
   * Check and fix SOW status consistency
   * This ensures SOWs aren't in "in_review" status without a valid approval workflow
   */
  static async checkAndFixStatusConsistency(sowId: string): Promise<void> {
    try {
      const supabase = createServiceRoleClient();
      
      // Get current SOW data
      const { data: sow, error: sowError } = await supabase
        .from('sows')
        .select('*')
        .eq('id', sowId)
        .single();
      
      if (sowError || !sow) {
        console.error('Error fetching SOW for status consistency check:', sowError);
        return;
      }
      
      // If SOW is in "in_review" status, check if it has a valid approval workflow
      if (sow.status === 'in_review') {
        const { data: approvals, error: approvalError } = await supabase
          .from('sow_approvals')
          .select('*')
          .eq('sow_id', sowId);
        
        if (approvalError) {
          console.error('Error checking approvals for status consistency:', approvalError);
          return;
        }
        
        // If no approvals exist, the SOW shouldn't be in "in_review" status
        if (!approvals || approvals.length === 0) {
          console.log('❌ Status inconsistency detected: SOW is "in_review" but has no approval workflow');
          console.log('Resetting SOW status to "draft" for SOW:', sowId);
          
          // Reset status to draft
          const { error: updateError } = await supabase
            .from('sows')
            .update({ 
              status: 'draft',
              updated_at: new Date().toISOString()
            })
            .eq('id', sowId);
          
          if (updateError) {
            console.error('Error resetting SOW status:', updateError);
          } else {
            console.log('✅ SOW status reset to "draft" successfully:', sowId);
          }
        } else {
          console.log('✅ Status consistency check passed: SOW has valid approval workflow');
        }
      }
    } catch (error) {
      console.error('Error in status consistency check:', error);
    }
  }
}
