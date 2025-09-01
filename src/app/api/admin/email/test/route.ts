import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { EmailService } from '@/lib/email';

// POST - Send test email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const config = await request.json();
    
    if (!config.is_active) {
      return new NextResponse('Email service is not active', { status: 400 });
    }

    // Create a temporary email service with the provided config
    const emailService = new EmailService({
      provider: config.provider,
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      apiKey: config.api_key,
      fromEmail: config.from_email,
      fromName: config.from_name,
      isActive: config.is_active
    });

    // Test the connection first
    const connectionTest = await emailService.testConnection();
    if (!connectionTest) {
      return new NextResponse('Failed to connect to email service', { status: 500 });
    }

    // Send test email
    const testTemplate = {
      name: 'test_email',
      subject: 'SOW Generator - Test Email',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Test Successful!</h2>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">SOW Generator Email Configuration</h3>
            <p><strong>Provider:</strong> ${config.provider}</p>
            <p><strong>From:</strong> ${config.from_name} &lt;${config.from_email}&gt;</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This is a test email to verify that your email configuration is working correctly.
            If you received this email, your SOW Generator email notifications are ready to use!
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px;">
              Sent from SOW Generator Email Test
            </p>
          </div>
        </div>
      `,
      textContent: `Email Test Successful!\n\nSOW Generator Email Configuration\nProvider: ${config.provider}\nFrom: ${config.from_name} <${config.from_email}>\nTest Time: ${new Date().toLocaleString()}\n\nThis is a test email to verify that your email configuration is working correctly.`
    };

    const success = await emailService.sendTemplateEmail(
      testTemplate,
      session.user.email!,
      {}
    );

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test email sent successfully' 
      });
    } else {
      return new NextResponse('Failed to send test email', { status: 500 });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
