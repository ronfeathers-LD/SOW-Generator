import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEmailService } from '@/lib/email';

// POST - Backs the admin "Send Test Email" button. Checks that the saved email
// configuration can connect and authenticate to the mail server, then sends one
// test message to the admin who clicked. Tests the SAVED config, not unsaved
// form values.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recipient = session.user.email;
    if (!recipient) {
      return NextResponse.json({ error: 'Your account has no email address to send the test to.' }, { status: 400 });
    }

    const emailService = await getEmailService();
    if (!emailService) {
      return NextResponse.json({ error: 'Email is not configured. Save an email configuration first.' }, { status: 400 });
    }

    const connected = await emailService.testConnection();
    if (!connected) {
      return NextResponse.json(
        { error: 'Could not connect or sign in to the mail server with the saved configuration (or email is disabled).' },
        { status: 502 }
      );
    }

    const sent = await emailService.sendTemplateEmail(
      {
        name: 'admin_test_email',
        subject: 'SOW Generator test email',
        htmlContent:
          '<p>This is a test email from the SOW Generator admin page.</p><p>If you received it, outgoing email is working.</p>',
        textContent: 'This is a test email from the SOW Generator admin page. If you received it, outgoing email is working.',
      },
      recipient
    );
    if (!sent) {
      return NextResponse.json(
        { error: `Connected to the mail server, but sending to ${recipient} failed. Check the server logs.` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, recipient });
  } catch (error) {
    console.error('Email test failed:', error);
    return NextResponse.json({ error: 'Email test failed unexpectedly.' }, { status: 500 });
  }
}
