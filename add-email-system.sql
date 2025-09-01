-- Add Email System
-- This migration adds the necessary tables and fields for email functionality

-- Create email configuration table
CREATE TABLE IF NOT EXISTS email_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'sendgrid', 'mailgun', 'smtp')),
  host TEXT,
  port INTEGER,
  username TEXT,
  password TEXT,
  api_key TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true
);

-- Create email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  template_name TEXT,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_config_active ON email_config(is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_email_config_updated_at') THEN
        CREATE TRIGGER update_email_config_updated_at 
          BEFORE UPDATE ON email_config 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_email_templates_updated_at') THEN
        CREATE TRIGGER update_email_templates_updated_at 
          BEFORE UPDATE ON email_templates 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE email_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_config (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_config' AND policyname = 'Admins can manage email config') THEN
        CREATE POLICY "Admins can manage email config" ON email_config
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
    END IF;
END $$;

-- Create RLS policies for email_templates (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'Admins can manage email templates') THEN
        CREATE POLICY "Admins can manage email templates" ON email_templates
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
    END IF;
END $$;

-- Create RLS policies for email_logs (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'Admins can view email logs') THEN
        CREATE POLICY "Admins can view email logs" ON email_logs
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'System can insert email logs') THEN
        CREATE POLICY "System can insert email logs" ON email_logs
          FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content, variables) VALUES
(
  'sow_approval_request',
  'SOW Approval Required: {{sowTitle}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #2563eb;">SOW Approval Required</h2><div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="margin-top: 0;">{{sowTitle}}</h3><p><strong>Client:</strong> {{clientName}}</p><p><strong>Submitted by:</strong> {{authorName}}</p><p><strong>Status:</strong> Awaiting Approval</p></div><div style="text-align: center; margin: 30px 0;"><a href="{{sowUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review SOW</a></div><p style="color: #6b7280; font-size: 14px;">This SOW is waiting for your approval. Please review and take action.</p></div>',
  'SOW Approval Required: {{sowTitle}}\n\nClient: {{clientName}}\nSubmitted by: {{authorName}}\nStatus: Awaiting Approval\n\nReview SOW: {{sowUrl}}\n\nThis SOW is waiting for your approval. Please review and take action.',
  '{"sowTitle": "string", "clientName": "string", "authorName": "string", "sowUrl": "string"}'
),
(
  'sow_status_change',
  'SOW {{status}}: {{sowTitle}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: {{statusColor}};">SOW {{status}}</h2><div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="margin-top: 0;">{{sowTitle}}</h3><p><strong>Client:</strong> {{clientName}}</p><p><strong>Status:</strong> {{status}}</p><p><strong>Reviewed by:</strong> {{approverName}}</p>{{#if comments}}<p><strong>Comments:</strong> {{comments}}</p>{{/if}}</div><div style="text-align: center; margin: 30px 0;"><a href="{{sowUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View SOW</a></div></div>',
  'SOW {{status}}: {{sowTitle}}\n\nClient: {{clientName}}\nStatus: {{status}}\nReviewed by: {{approverName}}\n{{#if comments}}Comments: {{comments}}{{/if}}\n\nView SOW: {{sowUrl}}',
  '{"status": "string", "sowTitle": "string", "clientName": "string", "approverName": "string", "comments": "string", "sowUrl": "string", "statusColor": "string"}'
),
(
  'pm_hours_removal_request',
  'PM Hours Removal Request: {{sowTitle}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #f59e0b;">PM Hours Removal Request</h2><div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="margin-top: 0;">{{sowTitle}}</h3><p><strong>Client:</strong> {{clientName}}</p><p><strong>Requested by:</strong> {{requesterName}}</p><p><strong>Hours to remove:</strong> {{hoursToRemove}}</p><p><strong>Reason:</strong> {{reason}}</p></div><div style="text-align: center; margin: 30px 0;"><a href="{{requestUrl}}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Request</a></div><p style="color: #6b7280; font-size: 14px;">This PM hours removal request requires your approval.</p></div>',
  'PM Hours Removal Request: {{sowTitle}}\n\nClient: {{clientName}}\nRequested by: {{requesterName}}\nHours to remove: {{hoursToRemove}}\nReason: {{reason}}\n\nReview Request: {{requestUrl}}\n\nThis PM hours removal request requires your approval.',
  '{"sowTitle": "string", "clientName": "string", "requesterName": "string", "hoursToRemove": "string", "reason": "string", "requestUrl": "string"}'
),
(
  'mention_notification',
  'You were mentioned in a SOW comment: {{sowTitle}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #2563eb;">You were mentioned in a SOW comment</h2><div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="margin-top: 0;">{{sowTitle}}</h3><p><strong>Client:</strong> {{clientName}}</p><p><strong>Comment by:</strong> {{commentAuthor}}</p></div><div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;"><p style="margin: 0; font-style: italic;">{{commentText}}</p></div><div style="text-align: center; margin: 30px 0;"><a href="{{sowUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View SOW</a></div><p style="color: #6b7280; font-size: 14px;">You were mentioned in this comment. Click the button above to view the SOW and respond.</p></div>',
  'You were mentioned in a SOW comment: {{sowTitle}}\n\nClient: {{clientName}}\nComment by: {{commentAuthor}}\n\nComment: {{commentText}}\n\nView SOW: {{sowUrl}}\n\nYou were mentioned in this comment. Click the link above to view the SOW and respond.',
  '{"sowTitle": "string", "clientName": "string", "commentText": "string", "commentAuthor": "string", "sowUrl": "string"}'
)
ON CONFLICT (name) DO NOTHING;

-- Grant access to the tables
GRANT SELECT, INSERT, UPDATE, DELETE ON email_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_templates TO authenticated;
GRANT SELECT, INSERT ON email_logs TO authenticated;
