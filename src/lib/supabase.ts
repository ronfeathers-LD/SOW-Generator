import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on your current schema
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
  deliverables: string;
  start_date: string;
  duration: string;
  client_roles: any;
  pricing_roles: any;
  billing_info: any;
  access_requirements: string;
  travel_requirements: string;
  working_hours: string;
  testing_responsibilities: string;
  addendums: any;
  is_latest: boolean;
  parent_id?: string;
  version: number;
  leandata_email: string;
  leandata_name: string;
  leandata_title: string;
  client_signer_name: string;
  content: string;
  status: string;
  title: string;
  opportunity_amount?: number;
  opportunity_close_date?: string;
  opportunity_id?: string;
  opportunity_name?: string;
  opportunity_stage?: string;
  project_description: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface Comment {
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

export interface LeanDataSignator {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  title: string;
  is_active: boolean;
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