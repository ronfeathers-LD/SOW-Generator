import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_SEGMENT_RULES,
  rowsToRulesMap,
  type SegmentRulesMap,
} from '@/lib/segment-rules';

/**
 * Load effective segment rules from the DB, falling back to defaults on
 * error or empty table. Takes the caller's Supabase client (service-role).
 */
export async function loadSegmentRules(supabase: SupabaseClient): Promise<SegmentRulesMap> {
  try {
    const { data, error } = await supabase
      .from('segment_rules')
      .select('segment, display_name, pm_removal_self_serve, extra_hours')
      .eq('is_active', true);
    if (error || !data || data.length === 0) {
      if (error) console.error('segment_rules query failed, using defaults:', error);
      return DEFAULT_SEGMENT_RULES;
    }
    return rowsToRulesMap(data);
  } catch (error) {
    console.error('segment_rules load threw, using defaults:', error);
    return DEFAULT_SEGMENT_RULES;
  }
}
