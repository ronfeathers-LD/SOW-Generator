/**
 * Approval Workflow Service
 * Handles multi-step approval workflow for SOWs
 */

import { createServerSupabaseClient } from './supabase-server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { 
  ApprovalWorkflowStatus, 
  SOWApproval, 
  ApprovalInitiationResult 
} from '@/types/sow';
import { requiresPMApproval } from './approval-workflow-rules';
import { canApproveStage } from './utils/approval-permissions';

interface ApprovalStage {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export class ApprovalWorkflowService {
  /**
   * Initialize approval workflow when SOW is submitted for review
   * Creates sow_approvals records for all required stages
   */
  static async initiateWorkflow(
    sowId: string,
    supabaseClient?: SupabaseClient
  ): Promise<ApprovalInitiationResult> {
    try {
      const supabase = supabaseClient || await createServerSupabaseClient();
      
      // Get the SOW to determine if PM stage is needed
      const { data: sow, error: sowError } = await supabase
        .from('sows')
        .select('products, pricing_roles, pm_hours_requirement_disabled')
        .eq('id', sowId)
        .single();

      if (sowError || !sow) {
        return {
          success: false,
          workflow_created: false,
          stages_created: 0,
          requires_pm_approval: false,
          error: 'SOW not found'
        };
      }

      // Determine if PM approval is needed
      const needsPMApproval = requiresPMApproval({
        products: sow.products || [],
        pricing_roles: sow.pricing_roles,
        pm_hours_requirement_disabled: sow.pm_hours_requirement_disabled
      });

      // Get all active stages from the database
      const { data: allStages, error: stagesError } = await supabase
        .from('approval_stages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (stagesError || !allStages || allStages.length === 0) {
        return {
          success: false,
          workflow_created: false,
          stages_created: 0,
          requires_pm_approval: needsPMApproval,
          error: 'No approval stages found'
        };
      }

      // Check if workflow already exists for this SOW (prevents duplicate key errors)
      // Ignore rejected approvals - they don't prevent re-initialization after a rejection
      const { data: existingApprovals, error: checkError } = await supabase
        .from('sow_approvals')
        .select('id, stage_id, status')
        .eq('sow_id', sowId)
        .neq('status', 'rejected'); // Ignore rejected approvals

      if (checkError) {
        console.error('Error checking for existing approvals:', checkError);
        // Continue with creation attempt - might be a transient error
      }

      // If non-rejected approvals already exist, return success without creating duplicates
      if (existingApprovals && existingApprovals.length > 0) {
        return {
          success: true,
          workflow_created: false, // Already existed
          stages_created: existingApprovals.length,
          requires_pm_approval: needsPMApproval,
          error: undefined
        };
      }

      // Determine which stages to include
      const stagesToInclude = allStages.filter((stage: ApprovalStage) => {
        if (stage.name === 'Project Management') {
          return needsPMApproval;
        }
        return true; // Professional Services and Sr. Leadership are always included
      });

      // Create sow_approvals records - all stages start as 'pending' for parallel approval
      const approvalsToCreate = stagesToInclude.map((stage) => ({
        sow_id: sowId,
        stage_id: stage.id,
        status: 'pending', // All stages start as pending for parallel approval workflow
        comments: null,
        approver_id: null,
        approved_at: null,
        rejected_at: null,
        skipped_at: null,
        version: 1
      }));

      const { data: createdApprovals, error: insertError } = await supabase
        .from('sow_approvals')
        .insert(approvalsToCreate)
        .select();

      if (insertError) {
        // Check if error is due to duplicate key (workflow already exists)
        // Supabase errors can be in different formats, so check multiple properties
        const errorMessage = insertError.message || insertError.details || String(insertError);
        const errorCode = insertError.code || (insertError as { code?: string })?.code;
        const errorString = JSON.stringify(insertError).toLowerCase();
        
        // Check for duplicate key errors in various formats
        const isDuplicateKeyError = 
          errorMessage?.toLowerCase().includes('duplicate key') ||
          errorMessage?.toLowerCase().includes('unique constraint') ||
          errorMessage?.toLowerCase().includes('unique_sow_stage') ||
          errorCode === '23505' || // PostgreSQL unique violation error code
          errorString.includes('duplicate key') ||
          errorString.includes('unique constraint') ||
          errorString.includes('unique_sow_stage');
        
        if (isDuplicateKeyError) {
          // Workflow already exists - this is okay, return success
          const { data: existingApprovals } = await supabase
            .from('sow_approvals')
            .select('id')
            .eq('sow_id', sowId);
          
          return {
            success: true,
            workflow_created: false, // Already existed
            stages_created: existingApprovals?.length || 0,
            requires_pm_approval: needsPMApproval,
            error: undefined
          };
        }
        
        console.error('Error creating approval records:', insertError);
        return {
          success: false,
          workflow_created: false,
          stages_created: 0,
          requires_pm_approval: needsPMApproval,
          error: `Failed to create approval records: ${insertError.message || insertError}`
        };
      }

      // Log workflow initiation to audit trail
      await this.logAuditAction(
        sowId,
        'workflow_initiated',
        'System',
        null,
        'pending',
        `Approval workflow initiated with ${createdApprovals.length} stages`,
        { stages_created: createdApprovals.length, includes_pm: needsPMApproval }
      );

      return {
        success: true,
        workflow_created: true,
        stages_created: createdApprovals.length,
        requires_pm_approval: needsPMApproval,
        first_stage_id: createdApprovals[0]?.id
      };
    } catch (error) {
      console.error('Error in initiateWorkflow:', error);
      return {
        success: false,
        workflow_created: false,
        stages_created: 0,
        requires_pm_approval: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get current approval workflow status for a SOW
   */
  static async getWorkflowStatus(
    sowId: string,
    supabaseClient?: SupabaseClient
  ): Promise<ApprovalWorkflowStatus | null> {
    try {
      const supabase = supabaseClient || await createServerSupabaseClient();

      // Get all approvals for this SOW with stage details
      const { data: approvals, error } = await supabase
        .from('sow_approvals')
        .select(`
          *,
          stage:approval_stages(*),
          approver:users(id, name, email)
        `)
        .eq('sow_id', sowId)
        .order('created_at', { ascending: true });

      if (error || !approvals) {
        console.error('Error fetching approvals:', error);
        return null;
      }

      // For parallel approval: find first pending stage (for backwards compatibility with UI)
      // Note: In parallel mode, multiple stages can be pending simultaneously
      const currentStage = approvals.find(
        a => a.status === 'pending'
      );

      // Calculate completion
      const completedStages = approvals.filter(
        a => a.status === 'approved'
      ).length;
      
      const totalStages = approvals.length;
      const completionPercentage = totalStages > 0 
        ? Math.round((completedStages / totalStages) * 100) 
        : 0;

      // Check if PM approval is included
      const pmApproval = approvals.find(
        a => a.stage?.name === 'Project Management'
      );
      const requiresPMApproval = !!pmApproval;

      return {
        sow_id: sowId,
        current_stage: currentStage as SOWApproval, // First pending stage (for UI compatibility)
        all_stages: approvals as SOWApproval[],
        completion_percentage: completionPercentage,
        requires_pm_approval: requiresPMApproval,
        total_stages: totalStages,
        completed_stages: completedStages
      };
    } catch (error) {
      console.error('Error in getWorkflowStatus:', error);
      return null;
    }
  }

  /**
   * Approve a specific stage
   */
  static async approveStage(
    sowId: string,
    stageId: string,
    approverId: string,
    comments?: string,
    userRole?: string,
    supabaseClient?: SupabaseClient
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = supabaseClient || await createServerSupabaseClient();

      // Get the approval record
      const { data: approval, error: fetchError } = await supabase
        .from('sow_approvals')
        .select('*, stage:approval_stages(*)')
        .eq('id', stageId)
        .eq('sow_id', sowId)
        .single();

      if (fetchError || !approval) {
        return { success: false, error: 'Approval record not found' };
      }

      // Validate permission if user role is provided
      if (userRole && !canApproveStage(approval.stage.name, userRole)) {
        return { 
          success: false, 
          error: 'You do not have permission to approve this stage' 
        };
      }

      // Check if stage is already approved
      if (approval.status === 'approved') {
        return { success: false, error: 'Stage is already approved' };
      }

      // Update approval record
      const { error: updateError } = await supabase
        .from('sow_approvals')
        .update({
          status: 'approved',
          approver_id: approverId,
          comments: comments?.trim() || null,
          approved_at: new Date().toISOString()
        })
        .eq('id', stageId);

      if (updateError) {
        console.error('Error updating approval:', updateError);
        return { success: false, error: 'Failed to approve stage' };
      }

      // Log the approval
      await this.logAuditAction(
        sowId,
        'stage_approved',
        approverId,
        approval.status,
        'approved',
        comments || 'No comments',
        { stage_name: approval.stage.name }
      );

      // Check if all stages are approved (parallel approval - no sequential activation needed)
      const { data: allApprovals } = await supabase
        .from('sow_approvals')
        .select('*')
        .eq('sow_id', sowId);

      if (allApprovals) {
        // If all stages are approved, mark SOW as fully approved
        const allApproved = allApprovals.every(a => a.status === 'approved');
        if (allApproved) {
          await supabase
            .from('sows')
            .update({ status: 'approved' })
            .eq('id', sowId);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in approveStage:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Reject a specific stage
   */
  static async rejectStage(
    sowId: string,
    stageId: string,
    approverId: string,
    comments: string,
    userRole?: string,
    supabaseClient?: SupabaseClient
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = supabaseClient || await createServerSupabaseClient();

      // Get the approval record
      const { data: approval, error: fetchError } = await supabase
        .from('sow_approvals')
        .select('*, stage:approval_stages(*)')
        .eq('id', stageId)
        .eq('sow_id', sowId)
        .single();

      if (fetchError || !approval) {
        return { success: false, error: 'Approval record not found' };
      }

      // Validate permission if user role is provided
      if (userRole && !canApproveStage(approval.stage.name, userRole)) {
        return { 
          success: false, 
          error: 'You do not have permission to reject this stage' 
        };
      }

      if (!comments?.trim()) {
        return { success: false, error: 'Comments are required for rejection' };
      }

      // Update approval record to rejected
      const { error: updateError } = await supabase
        .from('sow_approvals')
        .update({
          status: 'rejected',
          approver_id: approverId,
          comments: comments.trim(),
          rejected_at: new Date().toISOString()
        })
        .eq('id', stageId);

      if (updateError) {
        console.error('Error updating approval:', updateError);
        return { success: false, error: 'Failed to reject stage' };
      }

      // Delete all other approval records (pending, approved, not_started) to allow clean workflow re-initialization on resubmission
      // Keep the rejected record itself for audit/history purposes
      // This ensures when the SOW is resubmitted, a fresh workflow can be created
      await supabase
        .from('sow_approvals')
        .delete()
        .eq('sow_id', sowId)
        .neq('status', 'rejected'); // Keep rejected records for audit trail

      // Return SOW to draft status
      await supabase
        .from('sows')
        .update({ status: 'draft' })
        .eq('id', sowId);

      // Log the rejection
      await this.logAuditAction(
        sowId,
        'stage_rejected',
        approverId,
        approval.status,
        'rejected',
        comments,
        { stage_name: approval.stage.name }
      );

      return { success: true };
    } catch (error) {
      console.error('Error in rejectStage:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Log audit action
   */
  private static async logAuditAction(
    sowId: string,
    action: string,
    userId: string,
    previousStatus: string | null,
    newStatus: string,
    comments: string | null,
    metadata: Record<string, unknown> = {},
    supabaseClient?: SupabaseClient
  ): Promise<void> {
    try {
      const supabase = supabaseClient || await createServerSupabaseClient();

      await supabase
        .from('approval_audit_log')
        .insert({
          sow_id: sowId,
          user_id: userId,
          action,
          previous_status: previousStatus,
          new_status: newStatus,
          comments: comments || null,
          metadata: metadata || {}
        });
    } catch (error) {
      console.error('Error logging audit action:', error);
      // Don't throw - audit logging failure shouldn't break the workflow
    }
  }
}

