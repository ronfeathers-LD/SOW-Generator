import { supabase } from './supabase';

export interface ChangelogEntry {
  id: string;
  created_at: string;
  sow_id: string;
  user_id?: string;
  action: 'create' | 'update' | 'delete' | 'version_create';
  field_name?: string;
  previous_value?: string;
  new_value?: string;
  change_type: 'field_update' | 'content_edit' | 'status_change' | 'version_create';
  diff_summary: string;
  metadata?: Record<string, unknown>;
  version: number;
  parent_version_id?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ChangeDiff {
  field_name: string;
  previous_value: string;
  new_value: string;
  change_type: 'field_update' | 'content_edit' | 'status_change';
  diff_summary: string;
  metadata?: Record<string, unknown>;
}

export class ChangelogService {
  /**
   * Generate a diff between two values and create a changelog entry
   */
  static async logChange(
    sowId: string,
    fieldName: string,
    previousValue: unknown,
    newValue: unknown,
    changeType: 'field_update' | 'content_edit' | 'status_change',
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {

      // Convert values to strings for storage
      const prevValueStr = this.valueToString(previousValue);
      const newValueStr = this.valueToString(newValue);

      // Skip if no actual change
      if (prevValueStr === newValueStr) {
        return;
      }

      // Generate diff summary
      const diffSummary = this.generateDiffSummary(fieldName, prevValueStr, newValueStr, changeType);

      // Get current SOW version
      const { data: sow } = await supabase
        .from('sows')
        .select('version, parent_id')
        .eq('id', sowId)
        .single();

      const { error } = await supabase
        .from('sow_changelog')
        .insert({
          sow_id: sowId,
          user_id: userId,
          action: 'update',
          field_name: fieldName,
          previous_value: prevValueStr,
          new_value: newValueStr,
          change_type: changeType,
          diff_summary: diffSummary,
          metadata: metadata || {},
          version: sow?.version || 1,
          parent_version_id: sow?.parent_id
        });

      if (error) {
        console.error('Error logging change:', error);
        // Don't throw here as this is not critical to the main operation
      }
    } catch (error) {
      console.error('Error in changelog service:', error);
      // Don't throw here as this is not critical to the main operation
    }
  }

  /**
   * Log multiple changes at once
   */
  static async logChanges(
    sowId: string,
    changes: ChangeDiff[],
    userId?: string
  ): Promise<void> {
    try {
      if (changes.length === 0) {
        return;
      }

      // Get current SOW version
      const { data: sow, error: sowError } = await supabase
        .from('sows')
        .select('version, parent_id')
        .eq('id', sowId)
        .single();

      if (sowError) {
        console.error('❌ Error fetching SOW version:', sowError);
        return;
      }

      const changelogEntries = changes.map(change => ({
        sow_id: sowId,
        user_id: userId,
        action: 'update' as const,
        field_name: change.field_name,
        previous_value: change.previous_value,
        new_value: change.new_value,
        change_type: change.change_type,
        diff_summary: change.diff_summary,
        metadata: change.metadata || {},
        version: sow?.version || 1,
        parent_version_id: sow?.parent_id
      }));

      // Insert into sow_changelog table
      const { error } = await supabase
        .from('sow_changelog')
        .insert(changelogEntries)
        .select();

      if (error) {
        console.error('❌ Error logging changes:', error);
      }
    } catch (error) {
      console.error('❌ Error in changelog service:', error);
    }
  }

  /**
   * Log SOW creation
   */
  static async logSOWCreation(
    sowId: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {

      const { data: sow } = await supabase
        .from('sows')
        .select('version, parent_id')
        .eq('id', sowId)
        .single();

      const { error } = await supabase
        .from('sow_changelog')
        .insert({
          sow_id: sowId,
          user_id: userId,
          action: 'create',
          change_type: 'field_update',
          diff_summary: 'SOW created',
          metadata: metadata || {},
          version: sow?.version || 1,
          parent_version_id: sow?.parent_id
        });

      if (error) {
        console.error('Error logging SOW creation:', error);
      }
    } catch (error) {
      console.error('Error in changelog service:', error);
    }
  }

  /**
   * Log SOW version creation
   */
  static async logVersionCreation(
    sowId: string,
    parentSowId: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {

      const { data: sow } = await supabase
        .from('sows')
        .select('version')
        .eq('id', sowId)
        .single();

      const { error } = await supabase
        .from('sow_changelog')
        .insert({
          sow_id: sowId,
          user_id: userId,
          action: 'version_create',
          change_type: 'version_create',
          diff_summary: `New version ${sow?.version || 1} created from parent SOW`,
          metadata: metadata || {},
          version: sow?.version || 1,
          parent_version_id: parentSowId
        });

      if (error) {
        console.error('Error logging version creation:', error);
      }
    } catch (error) {
      console.error('Error in changelog service:', error);
    }
  }

  /**
   * Get changelog for a SOW
   */
  static async getChangelog(sowId: string): Promise<ChangelogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('sow_changelog')
        .select('*')
        .eq('sow_id', sowId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching changelog:', error);
        throw new Error('Failed to fetch changelog');
      }

      // For now, return data without user info until we can properly set up the relationship
      return (data || []).map(entry => ({
        ...entry,
        user: undefined // We'll add user info back later
      }));
    } catch (error) {
      console.error('Error in changelog service:', error);
      throw error;
    }
  }

  /**
   * Get changelog with filtering options
   */
  static async getFilteredChangelog(
    sowId: string,
    filters: {
      changeType?: string;
      fieldName?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ChangelogEntry[]> {
    try {
      let query = supabase
        .from('sow_changelog')
        .select(`
          *,
          user:users(id, name, email)
        `)
        .eq('sow_id', sowId);

      // Apply filters
      if (filters.changeType) {
        query = query.eq('change_type', filters.changeType);
      }

      if (filters.fieldName) {
        query = query.eq('field_name', filters.fieldName);
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
        console.error('Error fetching filtered changelog:', error);
        throw new Error('Failed to fetch changelog');
      }

      return data || [];
    } catch (error) {
      console.error('Error in changelog service:', error);
      throw error;
    }
  }

  /**
   * Get changelog summary for reporting
   */
  static async getChangelogSummary(sowId: string): Promise<{
    totalChanges: number;
    changesByType: Record<string, number>;
    changesByUser: Record<string, number>;
    changesByField: Record<string, number>;
    timeline: Array<{
      date: string;
      action: string;
      user: string;
      field: string;
    }>;
  }> {
    try {
      const changelog = await this.getChangelog(sowId);
      
      const changesByType: Record<string, number> = {};
      const changesByUser: Record<string, number> = {};
      const changesByField: Record<string, number> = {};
      
      changelog.forEach(entry => {
        // Count by change type
        changesByType[entry.change_type] = (changesByType[entry.change_type] || 0) + 1;
        
        // Count by user
        const userName = entry.user?.name || 'Unknown';
        changesByUser[userName] = (changesByUser[userName] || 0) + 1;
        
        // Count by field
        if (entry.field_name) {
          changesByField[entry.field_name] = (changesByField[entry.field_name] || 0) + 1;
        }
      });

      const timeline = changelog.slice(0, 20).map(entry => ({
        date: new Date(entry.created_at).toLocaleDateString(),
        action: entry.action,
        user: entry.user?.name || 'Unknown',
        field: entry.field_name || 'N/A'
      }));

      return {
        totalChanges: changelog.length,
        changesByType,
        changesByUser,
        changesByField,
        timeline
      };
    } catch (error) {
      console.error('Error getting changelog summary:', error);
      throw error;
    }
  }

  /**
   * Export changelog as CSV
   */
  static async exportChangelog(sowId: string): Promise<string> {
    try {
      const changelog = await this.getChangelog(sowId);
      
      // Create CSV header
      const csvHeader = [
        'Date',
        'User',
        'Action',
        'Field',
        'Change Type',
        'Previous Value',
        'New Value',
        'Diff Summary',
        'Version'
      ].join(',');

      // Create CSV rows
      const csvRows = changelog.map(entry => [
        new Date(entry.created_at).toISOString(),
        entry.user?.name || 'Unknown',
        entry.action,
        entry.field_name || '',
        entry.change_type,
        `"${(entry.previous_value || '').replace(/"/g, '""')}"`,
        `"${(entry.new_value || '').replace(/"/g, '""')}"`,
        `"${(entry.diff_summary || '').replace(/"/g, '""')}"`,
        entry.version
      ].join(','));

      return [csvHeader, ...csvRows].join('\n');
    } catch (error) {
      console.error('Error exporting changelog:', error);
      throw error;
    }
  }

  /**
   * Compare two SOW objects and generate changelog entries
   */
  static async compareSOWs(
    sowId: string,
    previousSOW: Record<string, unknown>,
    newSOW: Record<string, unknown>,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const changes: ChangeDiff[] = [];
    
    // Get all unique field names from both objects
    const allFields = Array.from(new Set([
      ...Object.keys(previousSOW),
      ...Object.keys(newSOW)
    ]));

    // Filter out internal/system fields that we don't want to track
    const excludedFields = new Set([
      'id', 'created_at', 'updated_at', 'is_latest', 'parent_id', 'version',
      'author_id', 'salesforce_account_id', 'salesforce_contact_id'
    ]);

    for (const field of allFields) {
      // Skip excluded fields
      if (excludedFields.has(field)) {
        continue;
      }

      const prevValue = previousSOW[field];
      const newValue = newSOW[field];

      if (this.hasChanged(prevValue, newValue)) {
        const changeType = this.getChangeType(field);
        const diffSummary = this.generateDiffSummary(field, this.valueToString(prevValue), this.valueToString(newValue), changeType);
        
        changes.push({
          field_name: field,
          previous_value: this.valueToString(prevValue),
          new_value: this.valueToString(newValue),
          change_type: changeType,
          diff_summary: diffSummary,
          metadata
        });
      }
    }

    if (changes.length > 0) {
      await this.logChanges(sowId, changes, userId);
    }
  }

  /**
   * Helper method to convert values to strings
   */
  private static valueToString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Helper method to check if values have changed
   */
  private static hasChanged(prev: unknown, next: unknown): boolean {
    if (prev === next) return false;
    if (prev === null && next === null) return false;
    if (prev === undefined && next === undefined) return false;
    if (prev === null || prev === undefined || next === null || next === undefined) return true;
    
    const prevStr = this.valueToString(prev);
    const nextStr = this.valueToString(next);
    return prevStr !== nextStr;
  }

  /**
   * Helper method to determine change type based on field name
   */
  private static getChangeType(fieldName: string): 'field_update' | 'content_edit' | 'status_change' {
    if (fieldName === 'status') {
      return 'status_change';
    }
    if (fieldName.startsWith('custom_') || fieldName.includes('content')) {
      return 'content_edit';
    }
    return 'field_update';
  }

  /**
   * Helper method to generate human-readable diff summary
   */
  private static generateDiffSummary(
    fieldName: string,
    previousValue: string,
    newValue: string,
    changeType: 'field_update' | 'content_edit' | 'status_change'
  ): string {
    const fieldDisplayName = this.getFieldDisplayName(fieldName);
    
    switch (changeType) {
      case 'status_change':
        return `Status changed from "${previousValue || 'None'}" to "${newValue || 'None'}"`;
      
      case 'content_edit':
        if (previousValue && newValue) {
          const prevLength = previousValue.length;
          const newLength = newValue.length;
          const change = newLength > prevLength ? 'expanded' : 'shortened';
          return `${fieldDisplayName} content ${change} (${prevLength} → ${newLength} characters)`;
        } else if (newValue && !previousValue) {
          return `${fieldDisplayName} content added (${newValue.length} characters)`;
        } else if (previousValue && !newValue) {
          return `${fieldDisplayName} content removed`;
        }
        return `${fieldDisplayName} content updated`;
      
      case 'field_update':
      default:
        if (previousValue && newValue) {
          return `${fieldDisplayName} changed from "${previousValue}" to "${newValue}"`;
        } else if (newValue && !previousValue) {
          return `${fieldDisplayName} set to "${newValue}"`;
        } else if (previousValue && !newValue) {
          return `${fieldDisplayName} cleared (was "${previousValue}")`;
        }
        return `${fieldDisplayName} updated`;
    }
  }

  /**
   * Helper method to get human-readable field names
   */
  private static getFieldDisplayName(fieldName: string): string {
    const fieldMap: Record<string, string> = {
      // Common field mappings for better readability
      'client_name': 'Client Name',
      'sow_title': 'SOW Title',
  
      'deliverables': 'Deliverables',
      'custom_intro_content': 'Introduction Content',
      'custom_scope_content': 'Scope Content',
      'custom_objectives_disclosure_content': 'Objectives Disclosure Content',
      'custom_assumptions_content': 'Assumptions Content',
      'custom_project_phases_content': 'Project Phases Content',
      'custom_roles_content': 'Roles Content',
      'custom_deliverables_content': 'Deliverables Content',
      'custom_objective_overview_content': 'Objective Overview Content',
      'custom_key_objectives_content': 'Key Objectives Content',
      'status': 'Status',
      'opportunity_amount': 'Opportunity Amount',
      'timeline_weeks': 'Timeline Weeks',
      'start_date': 'Project Start Date',
      'duration': 'Project Duration',
      'products': 'Products',
      'number_of_units': 'Number of Units',
      'regions': 'Regions',
      'salesforce_tenants': 'Salesforce Tenants',
      'units_consumption': 'Units Consumption',
      'orchestration_units': 'Orchestration Units',
      'bookit_forms_units': 'BookIt Forms Units',
      'bookit_links_units': 'BookIt Links Units',
      'bookit_handoff_units': 'BookIt Handoff Units',
      'client_title': 'Client Title',
      'client_email': 'Client Email',
      'client_signer_name': 'Client Signer Name',
      'signature_date': 'Signature Date',
      'objectives_description': 'Objectives Description',
      'objectives_key_objectives': 'Key Objectives',
      'avoma_transcription': 'Avoma Transcription',
      'avoma_url': 'Avoma URL',
      'client_roles': 'Client Roles',
      'pricing_roles': 'Pricing Roles',
      'billing_info': 'Billing Information',
      'access_requirements': 'Access Requirements',
      'travel_requirements': 'Travel Requirements',
      'working_hours': 'Working Hours',
      'testing_responsibilities': 'Testing Responsibilities',
      'leandata_name': 'LeanData Name',
      'leandata_title': 'LeanData Title',
      'leandata_email': 'LeanData Email',
      'opportunity_id': 'Opportunity ID',
      'opportunity_name': 'Opportunity Name',
      'opportunity_stage': 'Opportunity Stage',
      'opportunity_close_date': 'Opportunity Close Date',
      'project_start_date': 'Project Start Date',
      'project_end_date': 'Project End Date',
      'company_logo': 'Company Logo',
      'title': 'Title',
      'content': 'Content',
      'addendums': 'Addendums',
      'customer_signature_name_2': 'Second Customer Signer Name',
      'customer_signature_2': 'Second Customer Signature',
      'customer_email_2': 'Second Customer Email',
      'customer_signature_date_2': 'Second Customer Signature Date'
    };

    // For any field not in the map, convert snake_case to Title Case
    return fieldMap[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}
