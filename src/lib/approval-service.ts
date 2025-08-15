import { supabase } from './supabase';
import { createServiceRoleClient } from './supabase-server';
import { AuditService } from './audit-service';
import { getSlackService } from './slack';

export interface ApprovalStage {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  requires_comment: boolean;
  auto_approve: boolean;
  assigned_role?: string;
  created_at: string;
  updated_at: string;
  assigned_user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SOWApproval {
  id: string;
  sow_id: string;
  stage_id: string;
  approver_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  comments?: string;
  approved_at?: string;
  rejected_at?: string;
  skipped_at?: string;
  version: number;
  created_at: string;
  updated_at: string;
  stage?: ApprovalStage;
  approver?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ApprovalWorkflow {
  sow_id: string;
  current_stage?: ApprovalStage;
  approvals: SOWApproval[];
  can_approve: boolean;
  can_reject: boolean;
  can_skip: boolean;
  next_stage?: ApprovalStage;
  is_complete: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export class ApprovalService {
  /**
   * Get the current approval workflow for a SOW
   */
  static async getWorkflow(sowId: string, userEmail: string): Promise<ApprovalWorkflow> {
    try {
      // Get user information using service role client to bypass RLS
      const supabaseServer = createServiceRoleClient();
      const { data: user, error: userError } = await supabaseServer
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .single();

      // If user doesn't exist, something is wrong - we shouldn't be creating users here
      if (userError || !user) {
        console.error('User not found in database:', userEmail, 'Error:', userError);
        throw new Error(`User not found: ${userEmail}. This should not happen for existing users.`);
      }

      // Get all approvals for this SOW
      const { data: approvals, error: approvalsError } = await supabase
        .from('sow_approvals')
        .select(`
          *,
          stage:approval_stages(*),
          approver:users(id, name, email)
        `)
        .eq('sow_id', sowId)
        .order('created_at', { ascending: true });

      if (approvalsError) {
        throw new Error('Failed to fetch approvals');
      }

      // Super simple: No complex stages needed
      
      // Determine current stage and workflow state
      const workflowState = this.determineWorkflowState(approvals);
      
      // Calculate user permissions for the current stage
      const permissions = this.calculatePermissions(workflowState.currentStage, user);
      
      return {
        sow_id: sowId,
        current_stage: workflowState.currentStage || undefined,
        approvals,
        can_approve: permissions.canApprove,
        can_reject: permissions.canReject,
        can_skip: permissions.canSkip,
        next_stage: workflowState.nextStage || undefined,
        is_complete: workflowState.isComplete
      };
    } catch (error) {
      console.error('Error getting approval workflow:', error);
      throw error;
    }
  }

  /**
   * Process an approval action (approve, reject, skip)
   */
  static async processApproval(
    sowId: string,
    approvalId: string,
    action: 'approve' | 'reject' | 'skip',
    userEmail: string,
    comments?: string
  ): Promise<void> {
    try {
      // Get user information using service role client to bypass RLS
      const supabaseServer = createServiceRoleClient();
      const { data: user, error: userError } = await supabaseServer
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .single();

      // If user doesn't exist, something is wrong - we shouldn't be creating users here
      if (userError || !user) {
        console.error('User not found in database:', userEmail, 'Error:', userError);
        throw new Error(`User not found: ${userEmail}. This should not happen for existing users.`);
      }

      // Get the approval record
      const { data: approval, error: approvalError } = await supabase
        .from('sow_approvals')
        .select(`
          *,
          stage:approval_stages(*)
        `)
        .eq('id', approvalId)
        .eq('sow_id', sowId)
        .single();

      if (approvalError || !approval) {
        console.error('Approval lookup error:', approvalError);
        console.error('Approval ID:', approvalId);
        console.error('SOW ID:', sowId);
        throw new Error(`Approval not found: ${approvalError?.message || 'No approval record'}`);
      }

  

      // Validate permissions
      const canProcess = this.validateApprovalPermission(approval, user);
      if (!canProcess) {
        throw new Error('Insufficient permissions for this approval');
      }

      // Validate required comments
      if (approval.stage?.requires_comment && !comments?.trim()) {
        throw new Error('Comments are required for this stage');
      }

      // Update the approval record
      const updateData: Record<string, unknown> = {
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action,
        approver_id: user.id,
        comments: comments?.trim() || null
      };

      // Set the appropriate timestamp
      if (action === 'approve') {
        updateData.approved_at = new Date().toISOString();
      } else if (action === 'reject') {
        updateData.rejected_at = new Date().toISOString();
      } else if (action === 'skip') {
        updateData.skipped_at = new Date().toISOString();
      }

  
      
      const { error: updateError } = await supabase
        .from('sow_approvals')
        .update(updateData)
        .eq('id', approvalId);

      if (updateError) {
        console.error('Database update error:', updateError);
        console.error('Update data:', updateData);
        console.error('Approval ID:', approvalId);
        throw new Error(`Failed to update approval: ${updateError.message}`);
      }

      // Update SOW status based on action
      await this.updateSOWStatus(sowId, action);

          // Log the approval action for audit trail (don't fail if audit logging fails)
      try {
        await AuditService.logApprovalAction(
          sowId,
          approvalId,
          user.id,
          action,
          approval.status,
          action,
          comments
        );
      } catch (auditError) {
        console.error('Audit logging failed, but approval succeeded:', auditError);
        // Don't throw here as audit logging is not critical to the approval process
      }

      // Send Slack notification only for key approval events
      try {
        const slackService = getSlackService();
        if (slackService) {
          // Only send notifications for key business events
          if (action === 'approve') {
            // Get SOW details for the notification
            const { data: sow } = await supabase
              .from('sows')
              .select('sow_title, client_name, template')
              .eq('id', sowId)
              .single();

            const sowTitle = sow?.sow_title || sow?.template?.sow_title || 'Untitled SOW';
            const clientName = sow?.client_name || sow?.template?.customer_name || 'Unknown Client';
            const stageName = approval.stage?.name || 'Unknown Stage';

            await slackService.sendApprovalNotification(
              sowId,
              sowTitle,
              clientName,
              stageName,
              user.name || user.email,
              'approved',
              comments
            );
          }
          // Note: We don't send notifications for reject/skip to reduce noise
        }
      } catch (slackError) {
        console.error('Slack notification failed, but approval succeeded:', slackError);
        // Don't throw here as Slack notification is not critical to the approval process
      }

    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  }

  /**
   * Start an approval workflow for a SOW
   */
  static async startWorkflow(sowId: string, sowAmount?: number): Promise<void> {
    try {
      // Check if workflow already exists
      const { data: existingApprovals } = await supabase
        .from('sow_approvals')
        .select('id')
        .eq('sow_id', sowId);

      if (existingApprovals && existingApprovals.length > 0) {
        throw new Error('Approval workflow already exists');
      }

      // IMPORTANT: Validate the SOW before creating approval workflow
      const { data: sow, error: sowError } = await supabase
        .from('sows')
        .select('*')
        .eq('id', sowId)
        .single();

      if (sowError || !sow) {
        throw new Error('Failed to fetch SOW data for validation');
      }

      // Use the same validation logic as the automatic workflow
      const { validateSOWForApproval } = await import('./validation-utils');
      const validation = validateSOWForApproval(sow);

      if (!validation.isValid) {
        return;
      }

      // Get required stages based on rules and amount
      const requiredStages = await this.getRequiredStages(sowAmount);

      // Create approval records
      const approvalRecords = requiredStages.map(stageId => ({
        sow_id: sowId,
        stage_id: stageId,
        status: 'pending',
        version: 1
      }));

      const { data: createdApprovals, error: insertError } = await supabase
        .from('sow_approvals')
        .insert(approvalRecords)
        .select();

      if (insertError) {
        throw new Error('Failed to create approval workflow');
      }

      // Log workflow start for each approval (don't fail if audit logging fails)
      if (createdApprovals) {
        for (const approval of createdApprovals) {
          try {
            await AuditService.logWorkflowStarted(sowId, approval.id, approval.stage_id);
          } catch (auditError) {
            console.error('Audit logging failed for workflow start, but workflow was created:', auditError);
            // Don't throw here as audit logging is not critical to the workflow creation
          }
        }
      }

      // Update SOW status to in_review
      const { error: updateError } = await supabase
        .from('sows')
        .update({ status: 'in_review' })
        .eq('id', sowId);

      if (updateError) {
        throw new Error('Failed to update SOW status');
      }

      // Send Slack notification for SOW submitted for approval
      try {
        const slackService = getSlackService();
        if (slackService) {
          // Get SOW details for the notification
          const { data: sow } = await supabase
            .from('sows')
            .select('sow_title, client_name, template')
            .eq('id', sowId)
            .single();

          const sowTitle = sow?.sow_title || sow?.template?.sow_title || 'Untitled SOW';
          const clientName = sow?.client_name || sow?.template?.customer_name || 'Unknown Client';

          await slackService.sendApprovalRequestNotification(
            sowId,
            sowTitle,
            clientName,
            'Approval Workflow Started',
            'System',
            sowAmount
          );
        }
      } catch (slackError) {
        console.error('Slack notification failed for workflow start, but workflow was created:', slackError);
        // Don't throw here as Slack notification is not critical to the workflow creation
      }

    } catch (error) {
      console.error('Error starting approval workflow:', error);
      throw error;
    }
  }

  /**
   * Determine the current workflow state
   */
  private static determineWorkflowState(approvals: SOWApproval[]) {
    // Super simple: Just check if there's any approval
    const hasApproval = approvals.some(approval => approval.status === 'approved');
    const hasRejection = approvals.some(approval => approval.status === 'rejected');
    
    if (hasApproval || hasRejection) {
      return { currentStage: null, isComplete: true, nextStage: null };
    }
    
    // If no approvals exist yet, create a simple approval stage
    const simpleStage = {
      id: 'simple-approval',
      name: 'Approval Required',
      description: 'This SOW needs approval from an Approver or Admin',
      sort_order: 1,
      is_active: true,
      requires_comment: false,
      auto_approve: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return { currentStage: simpleStage, isComplete: false, nextStage: null };
  }

  /**
   * Calculate user permissions for the current stage
   */
  private static calculatePermissions(currentStage: ApprovalStage | null, user: User) {
    // Simple role-based permissions
    const userRole = user.role;
    
    // Admin and Manager can approve/reject
    if (userRole === 'admin' || userRole === 'manager') {
      return {
        canApprove: true,
        canReject: true,
        canSkip: false
      };
    }
    
    // Regular users cannot approve
    return {
      canApprove: false,
      canReject: false,
      canSkip: false
    };
  }

  /**
   * Validate if user can process this approval
   */
  private static validateApprovalPermission(approval: SOWApproval, user: User): boolean {
    const userRole = user.role;
    
    // Admin and Manager can approve anything
    if (userRole === 'admin' || userRole === 'manager') {
      return true;
    }
    
    // Regular users cannot approve
    return false;
  }

  /**
   * Get required stages based on rules and SOW amount
   */
  private static async getRequiredStages(sowAmount?: number): Promise<string[]> {
    // Get approval rules to determine required stages
    const { data: rules } = await supabase
      .from('approval_rules')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const requiredStages: string[] = [];

    // Apply rules (currently only amount-based)
    if (rules && sowAmount) {
      rules.forEach(rule => {
        if (rule.condition_type === 'amount') {
          try {
            const conditionValue = JSON.parse(rule.condition_value);
            if (sowAmount >= conditionValue.min_amount) {
              requiredStages.push(rule.stage_id);
            }
          } catch (error) {
            console.error('Error parsing approval rule condition:', error);
          }
        }
      });
    }

    // If no rules match, use default stages
    if (requiredStages.length === 0) {
      const { data: defaultStages } = await supabase
        .from('approval_stages')
        .select('id')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(3); // Default to first 3 stages (Manager, Director, VP)

      if (defaultStages) {
        requiredStages.push(...defaultStages.map(stage => stage.id));
      }
    }

    return requiredStages;
  }

  /**
   * Update SOW status based on approval action
   */
  private static async updateSOWStatus(sowId: string, action: 'approve' | 'reject' | 'skip'): Promise<void> {
    if (action === 'reject') {
      // If rejected, update SOW status to rejected
      const { error: sowUpdateError } = await supabase
        .from('sows')
        .update({ status: 'rejected' })
        .eq('id', sowId);

      if (sowUpdateError) {
        throw new Error('Failed to update SOW status');
      }
    } else {
      // Check if workflow is complete
      const { data: allApprovals } = await supabase
        .from('sow_approvals')
        .select(`
          status,
          stage_id
        `)
        .eq('sow_id', sowId);

      if (allApprovals) {
        // Get stage names for the approvals
        const stageIds = allApprovals.map(a => a.stage_id).filter((id, index, arr) => arr.indexOf(id) === index);
        const { data: stages } = await supabase
          .from('approval_stages')
          .select('id, name')
          .in('id', stageIds);

        // Create a map for quick lookup
        const stageMap = new Map();
        if (stages) {
          stages.forEach(s => stageMap.set(s.id, s.name));
        }

        // Check if VP approved (bypasses all)
        const vpApproved = allApprovals.find(a => 
          stageMap.get(a.stage_id) === 'VP Approval' && a.status === 'approved'
        );
        
        // Check if Director approved (bypasses all)
        const directorApproved = allApprovals.find(a => 
          stageMap.get(a.stage_id) === 'Director Approval' && a.status === 'approved'
        );
        
        // Check if Manager approved
        const managerApproved = allApprovals.find(a => 
          stageMap.get(a.stage_id) === 'Manager Approval' && a.status === 'approved'
        );

        // Workflow is complete if:
        // 1. VP approved (bypasses all), OR
        // 2. Director approved (bypasses all), OR
        // 3. Manager approved
        const isComplete = vpApproved || directorApproved || managerApproved;

        if (isComplete) {
          // Update SOW status to approved
          const { error: sowUpdateError } = await supabase
            .from('sows')
            .update({ status: 'approved' })
            .eq('id', sowId);

          if (sowUpdateError) {
            throw new Error('Failed to update SOW status');
          }
        }
      }
    }
  }


}
