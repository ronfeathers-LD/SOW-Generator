import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on your current schema
export interface ClientRole {
  role: string;
  name: string;
  contact: string;
  responsibilities: string;
}

export interface SOW {
  id: string;
  created_at: string;
  updated_at: string;
  company_logo: string;
  client_name: string;
  sow_title: string;
  client_title: string;
  client_email: string;
  signature_date: string;
  deliverables: string[];
  projectDescription: string;
  keyObjectives: string[];
  startDate: string;
  duration: string;
  clientRoles: ClientRole[];
  pricingRoles?: Array<{
    role: string;
    ratePerHour: number;
    totalHours: number;
    totalCost: number;
  }>; // Add pricing roles
  pm_hours_requirement_disabled?: boolean;
  pm_hours_requirement_disabled_date?: string;
  pm_hours_requirement_disabled_requester_id?: string;
  pm_hours_requirement_disabled_approver_id?: string;
  // Note: access_requirements, travel_requirements, working_hours, testing_responsibilities columns have been removed
  version: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

/**
 * Anchor + resolution fields on approval_comments (#348). All nullable: a
 * comment with a NULL anchor is a general (non-anchored) comment. The core
 * quartet (section_key, quoted_text, start_offset, end_offset) is all-or-none
 * (DB CHECK constraint); context_prefix/context_suffix may be empty strings
 * at section edges. See src/lib/comment-anchors.ts for the anchor-text
 * convention the offsets are measured in.
 */
export interface CommentAnchorFields {
  section_key: string | null;
  quoted_text: string | null;
  context_prefix: string | null;
  context_suffix: string | null;
  start_offset: number | null;
  end_offset: number | null;
  /** Reserved for future stable block IDs — unused in v1. */
  block_id: string | null;
  /** The sow_content_snapshots row this anchor was authored against. */
  snapshot_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface Comment extends Partial<CommentAnchorFields> {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  sow_id: string;
  user_id: string;
  parent_id?: string;
}

export interface SalesforceConfig {
  id: string;
  created_at: string;
  updated_at: string;
  username: string;
  password: string;
  security_token?: string;
  login_url: string;
  is_active: boolean;
  last_tested?: string;
  last_error?: string;
}

export interface LeanDataSignatory {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  title: string;
  is_active: boolean;
  is_default: boolean;
}

export interface AvomaConfig {
  id: string;
  created_at: string;
  updated_at: string;
  api_key: string;
  api_url: string;
  is_active: boolean;
  last_tested?: string;
  last_error?: string;
  customer_id?: string;
}

export interface GeminiConfig {
  id: string;
  created_at: string;
  updated_at: string;
  api_key: string;
  model_name: string;
  is_active: boolean;
  last_tested?: string;
  last_error?: string;
} 