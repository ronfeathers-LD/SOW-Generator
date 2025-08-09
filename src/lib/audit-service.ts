import { supabase } from './supabase';

export interface AuditLogEntry {
  id: string;
  sow_id: string;
  approval_id?: string;
  user_id?: string;
  action: 'approve' | 'reject' | 'skip' | 'comment_added' | 'workflow_started' | 'status_change';
  previous_status?: string;
  new_status?: string;
  comments?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ApprovalStats {
  total_approvals: number;
  pending_approvals: number;
  approved_approvals: number;
  rejected_approvals: number;
  skipped_approvals: number;
  workflow_status: string;
}

export class AuditService {
  /**
   * Log an approval action to the audit trail
   */
  static async logApprovalAction(
    sowId: string,
    approvalId: string,
    userId: string,
    action: 'approve' | 'reject' | 'skip',
    previousStatus: string,
    newStatus: string,
    comments?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('approval_audit_log')
        .insert({
          sow_id: sowId,
          approval_id: approvalId,
          user_id: userId,
          action,
          previous_status: previousStatus,
          new_status: newStatus,
          comments: comments?.trim() || null,
          metadata: metadata || {}
        });

      if (error) {
        console.error('Error logging approval action:', error);
        // Don't throw here as this is not critical to the approval process
      }
    } catch (error) {
      console.error('Error in audit service:', error);
      // Don't throw here as this is not critical to the approval process
    }
  }

  /**
   * Log a comment addition to the audit trail
   */
  static async logCommentAdded(
    sowId: string,
    userId: string,
    comment: string,
    isInternal: boolean = false,
    parentId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('approval_audit_log')
        .insert({
          sow_id: sowId,
          user_id: userId,
          action: 'comment_added',
          comments: comment,
          metadata: {
            is_internal: isInternal,
            parent_id: parentId
          }
        });

      if (error) {
        console.error('Error logging comment addition:', error);
      }
    } catch (error) {
      console.error('Error in audit service:', error);
    }
  }

  /**
   * Log workflow start to the audit trail
   */
  static async logWorkflowStarted(
    sowId: string,
    approvalId: string,
    stageId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('approval_audit_log')
        .insert({
          sow_id: sowId,
          approval_id: approvalId,
          action: 'workflow_started',
          new_status: 'pending',
          metadata: {
            stage_id: stageId
          }
        });

      if (error) {
        console.error('Error logging workflow start:', error);
      }
    } catch (error) {
      console.error('Error in audit service:', error);
    }
  }

  /**
   * Get audit trail for a SOW
   */
  static async getAuditTrail(sowId: string): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('approval_audit_log')
        .select(`
          *,
          user:users(id, name, email)
        `)
        .eq('sow_id', sowId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching audit trail:', error);
        throw new Error('Failed to fetch audit trail');
      }

      return data || [];
    } catch (error) {
      console.error('Error in audit service:', error);
      throw error;
    }
  }

  /**
   * Get approval statistics for a SOW
   */
  static async getApprovalStats(sowId: string): Promise<ApprovalStats> {
    try {
      const { data, error } = await supabase
        .rpc('get_approval_stats', { sow_id_param: sowId });

      if (error) {
        console.error('Error fetching approval stats:', error);
        throw new Error('Failed to fetch approval statistics');
      }

      if (!data || data.length === 0) {
        return {
          total_approvals: 0,
          pending_approvals: 0,
          approved_approvals: 0,
          rejected_approvals: 0,
          skipped_approvals: 0,
          workflow_status: 'no_workflow'
        };
      }

      return data[0];
    } catch (error) {
      console.error('Error in audit service:', error);
      throw error;
    }
  }

  /**
   * Validate approval workflow for a SOW
   */
  static async validateWorkflow(sowId: string): Promise<{ isValid: boolean; errorMessage?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('validate_approval_workflow', { sow_id_param: sowId });

      if (error) {
        console.error('Error validating workflow:', error);
        throw new Error('Failed to validate workflow');
      }

      if (!data || data.length === 0) {
        return { isValid: false, errorMessage: 'No workflow found' };
      }

      return {
        isValid: data[0].is_valid,
        errorMessage: data[0].error_message
      };
    } catch (error) {
      console.error('Error in audit service:', error);
      throw error;
    }
  }

  /**
   * Get audit trail with filtering options
   */
  static async getFilteredAuditTrail(
    sowId: string,
    filters: {
      action?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('approval_audit_log')
        .select(`
          *,
          user:users(id, name, email)
        `)
        .eq('sow_id', sowId);

      // Apply filters
      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching filtered audit trail:', error);
        throw new Error('Failed to fetch audit trail');
      }

      return data || [];
    } catch (error) {
      console.error('Error in audit service:', error);
      throw error;
    }
  }

  /**
   * Export audit trail as CSV
   */
  static async exportAuditTrail(sowId: string): Promise<string> {
    try {
      const auditTrail = await this.getAuditTrail(sowId);
      
      // Create CSV header
      const csvHeader = [
        'Date',
        'User',
        'Action',
        'Previous Status',
        'New Status',
        'Comments',
        'Metadata'
      ].join(',');

      // Create CSV rows
      const csvRows = auditTrail.map(entry => [
        new Date(entry.created_at).toISOString(),
        entry.user?.name || 'Unknown',
        entry.action,
        entry.previous_status || '',
        entry.new_status || '',
        `"${(entry.comments || '').replace(/"/g, '""')}"`,
        JSON.stringify(entry.metadata || {})
      ].join(','));

      return [csvHeader, ...csvRows].join('\n');
    } catch (error) {
      console.error('Error exporting audit trail:', error);
      throw error;
    }
  }

  /**
   * Get audit trail summary for reporting
   */
  static async getAuditSummary(sowId: string): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByUser: Record<string, number>;
    timeline: Array<{
      date: string;
      action: string;
      user: string;
    }>;
  }> {
    try {
      const auditTrail = await this.getAuditTrail(sowId);
      
      const actionsByType: Record<string, number> = {};
      const actionsByUser: Record<string, number> = {};
      
      auditTrail.forEach(entry => {
        // Count by action type
        actionsByType[entry.action] = (actionsByType[entry.action] || 0) + 1;
        
        // Count by user
        const userName = entry.user?.name || 'Unknown';
        actionsByUser[userName] = (actionsByUser[userName] || 0) + 1;
      });

      const timeline = auditTrail.slice(0, 10).map(entry => ({
        date: new Date(entry.created_at).toLocaleDateString(),
        action: entry.action,
        user: entry.user?.name || 'Unknown'
      }));

      return {
        totalActions: auditTrail.length,
        actionsByType,
        actionsByUser,
        timeline
      };
    } catch (error) {
      console.error('Error getting audit summary:', error);
      throw error;
    }
  }
}
