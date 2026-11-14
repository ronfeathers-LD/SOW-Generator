/** An application user as returned by the admin users API. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  slack_user_id?: string;
  slack_username?: string;
  slack_mapping_updated_at?: string;
}
