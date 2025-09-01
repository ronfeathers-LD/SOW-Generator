import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PMHoursRequirementDisableRequest, PMHoursComment, PMHoursRequirementDisableDashboardItem } from '@/types/sow';
import { getEmailService } from './email';

// Fallback client for client-side usage
const fallbackSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class PMHoursRemovalService {
  /**
   * Create a new PM hours requirement disable request
   */
  static async createRequest(
    sowId: string,
    requesterId: string,
    currentPMHours: number,
    reason: string,
    supabaseClient?: SupabaseClient
  ): Promise<{ success: boolean; request?: PMHoursRequirementDisableRequest; error?: string }> {
    try {
      // Validate the request
      if (currentPMHours <= 0) {
        return { success: false, error: 'No PM hours to disable' };
      }

      const hoursToRemove = currentPMHours;

      // Use the passed client or fall back to the default one
      const client = supabaseClient || fallbackSupabase;
      
      // Try to get a PMO reviewer to assign to this request, but don't fail if none exist
      let pmoReviewerId: string | null = null;
      const { data: pmoUsers, error: pmoError } = await client
        .from('users')
        .select('id')
        .eq('role', 'pmo')
        .limit(1);

      if (!pmoError && pmoUsers && pmoUsers.length > 0) {
        pmoReviewerId = pmoUsers[0].id;
      }
      // If no PMO user exists, the request can still be created and approved by Admins

      // Create the request
      const { data: request, error } = await client
        .from('pm_hours_removal_requests')
        .insert({
          sow_id: sowId,
          requester_id: requesterId,
          pmo_reviewer_id: pmoReviewerId,
          current_pm_hours: currentPMHours,
          hours_to_remove: hoursToRemove,
          reason: reason.trim(),
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating PM hours removal request:', error);
        return { success: false, error: 'Failed to create request' };
      }

      // Log the action
      await this.logAuditAction(
        sowId,
        request.id,
        requesterId,
        'request_created',
        currentPMHours,
        0, // No requested hours since we're disabling the requirement
        `PM hours requirement disable request created: ${reason}`,
        undefined,
        client
      );

      // Send email notifications to all PMO users
      try {
        await this.sendPMHoursRemovalEmails(request, sowId, requesterId, client);
      } catch (emailError) {
        console.error('Error sending PM hours removal emails:', emailError);
        // Don't fail the request creation if email fails
      }

      return { success: true, request };
    } catch (error) {
      console.error('Error in createRequest:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get all PM hours requirement disable requests for a specific SOW
   */
  static async getSOWRequests(sowId: string, supabaseClient?: SupabaseClient): Promise<PMHoursRequirementDisableRequest[]> {
    try {
      const client = supabaseClient || fallbackSupabase;
      const { data, error } = await client
        .from('pm_hours_removal_requests')
        .select('*')
        .eq('sow_id', sowId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching SOW requests:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSOWRequests:', error);
      return [];
    }
  }

  /**
   * Get all PM hours requirement disable requests for a user
   */
  static async getUserRequests(userId: string, supabaseClient?: SupabaseClient): Promise<PMHoursRequirementDisableRequest[]> {
    try {
      const client = supabaseClient || fallbackSupabase;
      const { data, error } = await client
        .from('pm_hours_removal_requests')
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user requests:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserRequests:', error);
      return [];
    }
  }

  /**
   * Get all pending PM hours requirement disable requests for PM Directors
   */
  static async getPendingRequests(supabaseClient?: SupabaseClient): Promise<PMHoursRequirementDisableDashboardItem[]> {
    try {
      const client = supabaseClient || fallbackSupabase;
      const { data, error } = await client
        .from('pm_hours_removal_dashboard')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending requests:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPendingRequests:', error);
      return [];
    }
  }

  /**
   * Get a specific PM hours requirement disable request with comments
   */
  static async getRequest(requestId: string, supabaseClient?: SupabaseClient): Promise<{
    request?: PMHoursRequirementDisableRequest;
    comments?: PMHoursComment[];
    error?: string;
  }> {
    try {
      const client = supabaseClient || fallbackSupabase;
      // Get the request
      const { data: request, error: requestError } = await client
        .from('pm_hours_removal_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) {
        console.error('Error fetching request:', requestError);
        return { error: 'Failed to fetch request' };
      }

      // Get comments
      const { data: comments, error: commentsError } = await client
        .from('pm_hours_comments')
        .select(`
          *,
          user:users!pm_hours_comments_user_id_fkey(id, name, email)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        // Don't fail if comments can't be loaded
      }

      return { request, comments: comments || [] };
    } catch (error) {
      console.error('Error in getRequest:', error);
      return { error: 'Internal server error' };
    }
  }

  /**
   * Approve a PM hours removal request
   */
  static async approveRequest(
    requestId: string,
    approverId: string,
    comments?: string,
    supabaseClient?: SupabaseClient
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = supabaseClient || fallbackSupabase;
      // Get the request
      const { data: request, error: requestError } = await client
        .from('pm_hours_removal_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        return { success: false, error: 'Request not found' };
      }

      if (request.status !== 'pending') {
        return { success: false, error: 'Request is not pending approval' };
      }

      // Update the request status
      const { error: updateError } = await client
        .from('pm_hours_removal_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approval_comments: comments?.trim() || null
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request:', updateError);
        return { success: false, error: 'Failed to approve request' };
      }

      // Update the SOW to disable PM hours requirement and reflect the hours removal
      const { error: sowUpdateError } = await client
        .from('sows')
        .update({
          pm_hours_requirement_disabled: true,
          pm_hours_requirement_disabled_date: new Date().toISOString(),
          pm_hours_requirement_disabled_approver_id: approverId,
          pm_hours_removed: request.hours_to_remove,
          pm_hours_removal_approved: true,
          pm_hours_removal_date: new Date().toISOString()
        })
        .eq('id', request.sow_id);

      if (sowUpdateError) {
        console.error('Error updating SOW:', sowUpdateError);
        return { success: false, error: 'Failed to update SOW' };
      }

      // Log the approval
      await this.logAuditAction(
        request.sow_id,
        requestId,
        approverId,
        'request_approved',
        request.current_pm_hours,
        0, // PM hours requirement is now disabled
        `PM hours requirement disable approved: ${comments || 'No comments'}`,
        { hours_removed: request.hours_to_remove, requirement_disabled: true },
        client
      );

      return { success: true };
    } catch (error) {
      console.error('Error in approveRequest:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Reject a PM hours removal request
   */
  static async rejectRequest(
    requestId: string,
    approverId: string,
    reason: string,
    supabaseClient?: SupabaseClient
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const client = supabaseClient || fallbackSupabase;
      // Get the request
      const { data: request, error: requestError } = await client
        .from('pm_hours_removal_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        return { success: false, error: 'Request not found' };
      }

      if (request.status !== 'pending') {
        return { success: false, error: 'Request is not pending approval' };
      }

      // Update the request status
      const { error: updateError } = await client
        .from('pm_hours_removal_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason.trim()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request:', updateError);
        return { success: false, error: 'Failed to reject request' };
      }

      // Log the rejection
      await this.logAuditAction(
        request.sow_id,
        requestId,
        approverId,
        'request_rejected',
        request.current_pm_hours,
        request.current_pm_hours, // No change in hours
        `PM hours requirement disable rejected: ${reason}`,
        { rejection_reason: reason },
        client
      );

      return { success: true };
    } catch (error) {
      console.error('Error in rejectRequest:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Add a comment to a PM hours removal request
   */
  static async addComment(
    requestId: string,
    userId: string,
    comment: string,
    parentId?: string,
    isInternal: boolean = false,
    supabaseClient?: SupabaseClient
  ): Promise<{ success: boolean; comment?: PMHoursComment; error?: string }> {
    try {
      const client = supabaseClient || fallbackSupabase;
      const { data, error } = await client
        .from('pm_hours_comments')
        .insert({
          request_id: requestId,
          user_id: userId,
          comment: comment.trim(),
          parent_id: parentId || null,
          is_internal: isInternal
        })
        .select(`
          *,
          user:users!pm_hours_comments_user_id_fkey(id, name, email)
        `)
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        return { success: false, error: 'Failed to add comment' };
      }

      return { success: true, comment: data };
    } catch (error) {
      console.error('Error in addComment:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get dashboard data for PM Directors
   */
  static async getDashboardData(supabaseClient?: SupabaseClient): Promise<PMHoursRequirementDisableDashboardItem[]> {
    try {
      const client = supabaseClient || fallbackSupabase;
      const { data, error } = await client
        .from('pm_hours_removal_dashboard')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dashboard data:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getDashboardData:', error);
      return [];
    }
  }

  /**
   * Get dashboard data for regular users (only their own requests)
   */
  static async getUserDashboardData(userId: string, supabaseClient?: SupabaseClient): Promise<PMHoursRequirementDisableDashboardItem[]> {
    try {
      const client = supabaseClient || fallbackSupabase;
      const { data, error } = await client
        .from('pm_hours_removal_dashboard')
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user dashboard data:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserDashboardData:', error);
      return [];
    }
  }

  /**
   * Log audit actions
   */
  private static async logAuditAction(
    sowId: string,
    requestId: string,
    userId: string,
    action: string,
    previousPMHours: number,
    newPMHours: number,
    comments?: string,
    metadata?: Record<string, unknown>,
    supabaseClient?: SupabaseClient
  ): Promise<void> {
    try {
      const client = supabaseClient || fallbackSupabase;
      await client
        .from('pm_hours_audit_log')
        .insert({
          sow_id: sowId,
          request_id: requestId,
          user_id: userId,
          action,
          previous_pm_hours: previousPMHours,
          new_pm_hours: newPMHours,
          comments: comments?.trim() || null,
          metadata: metadata || {}
        });
    } catch (error) {
      console.error('Error logging audit action:', error);
      // Don't throw as this is not critical to the main operation
    }
  }

  /**
   * Check if a user is a PMO
   */
  static async isPMDirector(userId: string, supabaseClient?: SupabaseClient): Promise<boolean> {
    try {
      const client = supabaseClient || fallbackSupabase;
      const { data, error } = await client
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return false;
      }

      return data.role === 'pmo';
    } catch (error) {
      console.error('Error checking PMO status:', error);
      return false;
    }
  }

  /**
   * Get PM hours removal statistics
   */
  static async getStatistics(supabaseClient?: SupabaseClient): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    totalHoursRemoved: number;
    totalFinancialImpact: number;
    averageProcessingTime: number;
  }> {
    try {
      const client = supabaseClient || fallbackSupabase;
      const { data, error } = await client
        .from('pm_hours_removal_dashboard')
        .select('*');

      if (error || !data) {
        return {
          totalRequests: 0,
          pendingRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0,
          totalHoursRemoved: 0,
          totalFinancialImpact: 0,
          averageProcessingTime: 0
        };
      }

      const totalRequests = data.length;
      const pendingRequests = data.filter(r => r.status === 'pending').length;
      const approvedRequests = data.filter(r => r.status === 'approved').length;
      const rejectedRequests = data.filter(r => r.status === 'rejected').length;
      
      const totalHoursRemoved = data
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + r.hours_to_remove, 0);
      
      const totalFinancialImpact = data
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + r.financial_impact, 0);

      const completedRequests = data.filter(r => r.status !== 'pending');
      const averageProcessingTime = completedRequests.length > 0
        ? completedRequests.reduce((sum, r) => sum + r.hours_since_request, 0) / completedRequests.length
        : 0;

      return {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        totalHoursRemoved,
        totalFinancialImpact,
        averageProcessingTime
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        totalHoursRemoved: 0,
        totalFinancialImpact: 0,
        averageProcessingTime: 0
      };
    }
  }

  /**
   * Send email notifications to all PMO users for a new PM hours removal request
   */
  private static async sendPMHoursRemovalEmails(
    request: PMHoursRequirementDisableRequest,
    sowId: string,
    requesterId: string,
    supabaseClient: SupabaseClient
  ): Promise<void> {
    try {
      // Get SOW information
      const { data: sow } = await supabaseClient
        .from('sows')
        .select('title, client_name')
        .eq('id', sowId)
        .single();

      if (!sow) {
        console.error('SOW not found for email notification:', sowId);
        return;
      }

      // Get requester information
      const { data: requester } = await supabaseClient
        .from('users')
        .select('name, email')
        .eq('id', requesterId)
        .single();

      if (!requester) {
        console.error('Requester not found for email notification:', requesterId);
        return;
      }

      // Get all PMO users
      const { data: pmoUsers } = await supabaseClient
        .from('users')
        .select('email')
        .eq('role', 'pmo');

      if (!pmoUsers || pmoUsers.length === 0) {
        console.log('No PMO users found for email notification');
        return;
      }

      // Get email service
      const emailService = await getEmailService();
      if (!emailService) {
        console.error('Email service not available');
        return;
      }

      // Send email to each PMO user
      const emailPromises = pmoUsers.map(pmoUser => 
        emailService.sendPMHoursRemovalNotification(
          request.id,
          sow.title,
          sow.client_name,
          pmoUser.email,
          requester.name || requester.email,
          request.hours_to_remove,
          request.reason
        )
      );

      await Promise.all(emailPromises);
      console.log(`Sent PM hours removal notifications to ${pmoUsers.length} PMO users`);
    } catch (error) {
      console.error('Error sending PM hours removal emails:', error);
      throw error;
    }
  }
}

