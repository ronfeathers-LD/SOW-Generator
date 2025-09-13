import nodemailer from 'nodemailer';
import { logInvalidEmailWarning } from './utils/email-domain-validation';
import { getSOWUrl, getPMHoursRemovalUrl } from './utils/app-url';

interface EmailConfig {
  provider: 'gmail' | 'sendgrid' | 'mailgun' | 'smtp';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  apiKey?: string;
  fromEmail: string;
  fromName: string;
  isActive: boolean;
}

interface EmailTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: Record<string, string>;
}

interface EmailLog {
  templateName: string;
  recipientEmail: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

class EmailService {
  private config: EmailConfig;
  private transporter: nodemailer.Transporter | null = null;

  constructor(config: EmailConfig) {
    this.config = config;
    this.initializeTransporter();
  }

  private initializeTransporter() {
    if (!this.config.isActive) {
      console.warn('Email service is disabled');
      return;
    }

    if (this.config.provider === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.config.username,
          pass: this.config.password
        }
      });
    } else if (this.config.provider === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port || 587,
        secure: false,
        auth: {
          user: this.config.username,
          pass: this.config.password
        }
      });
    }
  }

  /**
   * Send an email using a template
   */
  async sendTemplateEmail(
    template: EmailTemplate,
    recipientEmail: string,
    variables: Record<string, string> = {}
  ): Promise<boolean> {
    try {
      // Validate recipient email domain
      if (!recipientEmail || typeof recipientEmail !== 'string') {
        console.error('❌ Invalid recipient email address provided');
        return false;
      }

      // Check if email has @leandata.com domain
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const domain = recipientEmail.toLowerCase().split('@')[1];
      
      if (!emailRegex.test(recipientEmail) || domain !== 'leandata.com') {
        logInvalidEmailWarning(recipientEmail, 'email template');
        return false;
      }

      if (!this.transporter) {
        console.warn('Email transporter not initialized');
        return false;
      }

      // Replace variables in template
      let subject = template.subject;
      let htmlContent = template.htmlContent;
      let textContent = template.textContent || '';

      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value);
        htmlContent = htmlContent.replace(regex, value);
        textContent = textContent.replace(regex, value);
      });

      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: recipientEmail,
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      
      // Log the email
      await this.logEmail({
        templateName: template.name,
        recipientEmail,
        subject,
        status: 'sent',
        metadata: { messageId: result.messageId }
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      
      // Log the error
      await this.logEmail({
        templateName: template.name,
        recipientEmail,
        subject: template.subject,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      return false;
    }
  }

  /**
   * Send SOW approval notification
   */
  async sendSOWApprovalNotification(
    sowId: string,
    sowTitle: string,
    clientName: string,
    approverEmail: string,
    authorName: string
  ): Promise<boolean> {
    // Validate approver email domain
    if (!approverEmail || typeof approverEmail !== 'string') {
      console.error('❌ Invalid approver email address provided');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const domain = approverEmail.toLowerCase().split('@')[1];
    
    if (!emailRegex.test(approverEmail) || domain !== 'leandata.com') {
      logInvalidEmailWarning(approverEmail, 'SOW approval notification');
      return false;
    }
    const template: EmailTemplate = {
      name: 'sow_approval_request',
      subject: 'SOW Approval Required: {{sowTitle}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">SOW Approval Required</h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">{{sowTitle}}</h3>
            <p><strong>Client:</strong> {{clientName}}</p>
            <p><strong>Submitted by:</strong> {{authorName}}</p>
            <p><strong>Status:</strong> Awaiting Approval</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{sowUrl}}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review SOW
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This SOW is waiting for your approval. Please review and take action.
          </p>
        </div>
      `
    };

    const sowUrl = getSOWUrl(sowId);

    return this.sendTemplateEmail(template, approverEmail, {
      sowTitle,
      clientName,
      authorName,
      sowUrl
    });
  }

  /**
   * Send SOW status change notification
   */
  async sendSOWStatusNotification(
    sowId: string,
    sowTitle: string,
    clientName: string,
    authorEmail: string,
    status: 'approved' | 'rejected',
    approverName: string,
    comments?: string
  ): Promise<boolean> {
    // Validate author email domain
    if (!authorEmail || typeof authorEmail !== 'string') {
      console.error('❌ Invalid author email address provided');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const domain = authorEmail.toLowerCase().split('@')[1];
    
    if (!emailRegex.test(authorEmail) || domain !== 'leandata.com') {
      logInvalidEmailWarning(authorEmail, 'SOW status notification');
      return false;
    }
    const template: EmailTemplate = {
      name: 'sow_status_change',
      subject: 'SOW {{status}}: {{sowTitle}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: {{statusColor}};">SOW {{status}}</h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">{{sowTitle}}</h3>
            <p><strong>Client:</strong> {{clientName}}</p>
            <p><strong>Status:</strong> {{status}}</p>
            <p><strong>Reviewed by:</strong> {{approverName}}</p>
            ${comments ? '<p><strong>Comments:</strong> {{comments}}</p>' : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{sowUrl}}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View SOW
            </a>
          </div>
        </div>
      `
    };

    const sowUrl = getSOWUrl(sowId);
    const statusColor = status === 'approved' ? '#059669' : '#dc2626';

    return this.sendTemplateEmail(template, authorEmail, {
      status: status.charAt(0).toUpperCase() + status.slice(1),
      sowTitle,
      clientName,
      approverName,
      comments: comments || '',
      sowUrl,
      statusColor
    });
  }

  /**
   * Send mention notification email
   */
  async sendMentionNotification(
    sowTitle: string,
    clientName: string,
    commentText: string,
    commentAuthor: string,
    mentionedUserEmail: string,
    mentionedUserName: string,
    sowUrl: string
  ): Promise<boolean> {
    // Validate mentioned user email domain
    if (!mentionedUserEmail || typeof mentionedUserEmail !== 'string') {
      console.error('❌ Invalid mentioned user email address provided');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const domain = mentionedUserEmail.toLowerCase().split('@')[1];
    
    if (!emailRegex.test(mentionedUserEmail) || domain !== 'leandata.com') {
      logInvalidEmailWarning(mentionedUserEmail, 'mention notification');
      return false;
    }
    const template: EmailTemplate = {
      name: 'mention_notification',
      subject: 'You were mentioned in a SOW comment: {{sowTitle}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">You were mentioned in a SOW comment</h2>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">{{sowTitle}}</h3>
            <p><strong>Client:</strong> {{clientName}}</p>
            <p><strong>Comment by:</strong> {{commentAuthor}}</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <p style="margin: 0; font-style: italic;">{{commentText}}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{sowUrl}}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View SOW
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            You were mentioned in this comment. Click the button above to view the SOW and respond.
          </p>
        </div>
      `
    };

    return this.sendTemplateEmail(template, mentionedUserEmail, {
      sowTitle,
      clientName,
      commentText,
      commentAuthor,
      sowUrl
    });
  }

  /**
   * Send PM hours removal request notification
   */
  async sendPMHoursRemovalNotification(
    requestId: string,
    sowTitle: string,
    clientName: string,
    pmDirectorEmail: string,
    requesterName: string,
    hoursToRemove: number,
    reason: string
  ): Promise<boolean> {
    // Validate PM director email domain
    if (!pmDirectorEmail || typeof pmDirectorEmail !== 'string') {
      console.error('❌ Invalid PM director email address provided');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const domain = pmDirectorEmail.toLowerCase().split('@')[1];
    
    if (!emailRegex.test(pmDirectorEmail) || domain !== 'leandata.com') {
      logInvalidEmailWarning(pmDirectorEmail, 'PM hours removal notification');
      return false;
    }
    const template: EmailTemplate = {
      name: 'pm_hours_removal_request',
      subject: 'PM Hours Removal Request: {{sowTitle}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">PM Hours Removal Request</h2>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">{{sowTitle}}</h3>
            <p><strong>Client:</strong> {{clientName}}</p>
            <p><strong>Requested by:</strong> {{requesterName}}</p>
            <p><strong>Hours to remove:</strong> {{hoursToRemove}}</p>
            <p><strong>Reason:</strong> {{reason}}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{requestUrl}}" 
               style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review Request
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This PM hours removal request requires your approval.
          </p>
        </div>
      `
    };

    const requestUrl = getPMHoursRemovalUrl(requestId);

    return this.sendTemplateEmail(template, pmDirectorEmail, {
      sowTitle,
      clientName,
      requesterName,
      hoursToRemove: hoursToRemove.toString(),
      reason,
      requestUrl
    });
  }

  /**
   * Send PM hours removal approval notification to requester
   */
  async sendPMHoursRemovalApprovalNotification(
    requestId: string,
    sowTitle: string,
    clientName: string,
    requesterEmail: string,
    requesterName: string,
    approverName: string,
    hoursRemoved: number,
    comments: string
  ): Promise<boolean> {
    if (!this.config.apiKey || !this.config.fromEmail) {
      console.error('Email service not configured');
      return false;
    }
    const template: EmailTemplate = {
      name: 'pm_hours_removal_approval',
      subject: 'PM Hours Removal Request Approved: {{sowTitle}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">PM Hours Removal Request Approved</h2>
          
          <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">{{sowTitle}}</h3>
            <p><strong>Client:</strong> {{clientName}}</p>
            <p><strong>Approved by:</strong> {{approverName}}</p>
            <p><strong>Hours removed:</strong> {{hoursRemoved}}</p>
            <p><strong>Comments:</strong> {{comments}}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{sowUrl}}" 
               style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View SOW
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Your PM hours removal request has been approved and the hours have been removed from the SOW.
          </p>
        </div>
      `
    };

    const sowUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sow/${requestId}/edit`;

    return this.sendTemplateEmail(template, requesterEmail, {
      sowTitle,
      clientName,
      approverName,
      hoursRemoved: hoursRemoved.toString(),
      comments,
      sowUrl
    });
  }

  /**
   * Send PM hours removal rejection notification to requester
   */
  async sendPMHoursRemovalRejectionNotification(
    requestId: string,
    sowTitle: string,
    clientName: string,
    requesterEmail: string,
    requesterName: string,
    approverName: string,
    hoursRequested: number,
    reason: string
  ): Promise<boolean> {
    if (!this.config.apiKey || !this.config.fromEmail) {
      console.error('Email service not configured');
      return false;
    }
    const template: EmailTemplate = {
      name: 'pm_hours_removal_rejection',
      subject: 'PM Hours Removal Request Rejected: {{sowTitle}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">PM Hours Removal Request Rejected</h2>
          
          <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">{{sowTitle}}</h3>
            <p><strong>Client:</strong> {{clientName}}</p>
            <p><strong>Rejected by:</strong> {{approverName}}</p>
            <p><strong>Hours requested:</strong> {{hoursRequested}}</p>
            <p><strong>Reason:</strong> {{reason}}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{sowUrl}}" 
               style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View SOW
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Your PM hours removal request has been rejected. Please review the reason and consider resubmitting if appropriate.
          </p>
        </div>
      `
    };

    const sowUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sow/${requestId}/edit`;

    return this.sendTemplateEmail(template, requesterEmail, {
      sowTitle,
      clientName,
      approverName,
      hoursRequested: hoursRequested.toString(),
      reason,
      sowUrl
    });
  }

  /**
   * Log email sending activity
   */
  private async logEmail(log: EmailLog): Promise<void> {
    try {
      // Import here to avoid circular dependencies
      const { createServiceRoleClient } = await import('./supabase-server');
      const supabase = createServiceRoleClient();
      
      await supabase
        .from('email_logs')
        .insert({
          template_name: log.templateName,
          recipient_email: log.recipientEmail,
          subject: log.subject,
          status: log.status,
          error_message: log.errorMessage,
          metadata: log.metadata || {}
        });
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }

      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}

// Create a singleton instance
let emailService: EmailService | null = null;

export async function getEmailService(): Promise<EmailService | null> {
  if (!emailService) {
    try {
      // Try to get config from database first
      const { createServiceRoleClient } = await import('./supabase-server');
      const supabase = createServiceRoleClient();
      
      const { data: config, error } = await supabase
        .from('email_config')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error reading email config from database:', error);
      }

      let emailConfig: EmailConfig;

      if (config) {
        // Use database config
        emailConfig = {
          provider: config.provider as 'gmail' | 'sendgrid' | 'mailgun',
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          apiKey: config.api_key,
          fromEmail: config.from_email,
          fromName: config.from_name,
          isActive: config.is_active
        };
      } else {
        // Fall back to environment variables
        emailConfig = {
          provider: (process.env.EMAIL_PROVIDER as 'gmail' | 'sendgrid' | 'mailgun') || 'gmail',
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : undefined,
          username: process.env.EMAIL_USER,
          password: process.env.EMAIL_PASSWORD,
          apiKey: process.env.EMAIL_API_KEY,
          fromEmail: process.env.EMAIL_USER || '',
          fromName: process.env.EMAIL_FROM_NAME || 'SOW Generator',
          isActive: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD)
        };
      }

      if (!emailConfig.isActive) {
        console.warn('Email service not configured - email notifications disabled');
        return null;
      }

      emailService = new EmailService(emailConfig);
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      return null;
    }
  }

  return emailService;
}

export { EmailService };
export type { EmailConfig, EmailTemplate, EmailLog };
