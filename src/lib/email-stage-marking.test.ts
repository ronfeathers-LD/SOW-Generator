import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmailService, markEmailForStage } from './email';
import type { EmailConfig } from './email';

// sendTemplateEmail logs to Supabase after sending; stub the client so no
// real database (or network) is touched.
vi.mock('./supabase-server', () => ({
  createServiceRoleClient: () => ({
    from: () => ({ insert: async () => ({ data: null, error: null }) })
  })
}));

const ORIGINAL_APP_ENV = process.env.NEXT_PUBLIC_APP_ENV;
const ORIGINAL_RAILWAY_ENV = process.env.RAILWAY_ENVIRONMENT_NAME;

const BANNER_TEXT =
  '⚠️ Sent from the SOW Generator STAGING environment — test traffic.';

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

describe('markEmailForStage (pure decoration)', () => {
  it('prefixes the subject with [STAGE]', () => {
    const marked = markEmailForStage({ subject: 'SOW Approval Required', html: '<p>x</p>', text: 'x' });
    expect(marked.subject).toBe('[STAGE] SOW Approval Required');
  });

  it('prepends an amber banner div to HTML bodies', () => {
    const marked = markEmailForStage({ subject: 's', html: '<p>body</p>', text: '' });
    expect(marked.html.startsWith('<div')).toBe(true);
    expect(marked.html).toContain(BANNER_TEXT);
    expect(marked.html).toContain('#f59e0b'); // amber border
    expect(marked.html.endsWith('<p>body</p>')).toBe(true);
  });

  it('prepends a plain banner line to text bodies', () => {
    const marked = markEmailForStage({ subject: 's', html: '', text: 'plain body' });
    expect(marked.text).toBe(`${BANNER_TEXT}\n\nplain body`);
  });

  it('uses just the banner when the text body is empty', () => {
    const marked = markEmailForStage({ subject: 's', html: '', text: '' });
    expect(marked.text).toBe(BANNER_TEXT);
  });
});

describe('EmailService staging gate (no network — transporter is stubbed)', () => {
  const sendMail = vi.fn();
  let service: EmailService;

  const config: EmailConfig = {
    provider: 'gmail',
    username: 'noreply@leandata.com',
    password: 'not-a-real-password',
    fromEmail: 'noreply@leandata.com',
    fromName: 'SOW Generator',
    isActive: true
  };

  const template = {
    name: 'test_template',
    subject: 'SOW Approval Required: {{sowTitle}}',
    htmlContent: '<p>Please review {{sowTitle}}</p>',
    textContent: 'Please review {{sowTitle}}'
  };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.RAILWAY_ENVIRONMENT_NAME;
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: 'test-message-id' });
    service = new EmailService(config);
    // Replace the real nodemailer transporter so nothing leaves the process.
    (service as unknown as { transporter: { sendMail: typeof sendMail } }).transporter = { sendMail };
  });

  afterEach(() => {
    restoreEnv('NEXT_PUBLIC_APP_ENV', ORIGINAL_APP_ENV);
    restoreEnv('RAILWAY_ENVIRONMENT_NAME', ORIGINAL_RAILWAY_ENV);
  });

  it('marks subject, html, and text when staging', async () => {
    process.env.RAILWAY_ENVIRONMENT_NAME = 'staging';
    const ok = await service.sendTemplateEmail(template, 'ron.feathers@leandata.com', {
      sowTitle: 'Acme SOW'
    });
    expect(ok).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.subject).toBe('[STAGE] SOW Approval Required: Acme SOW');
    expect(mail.html).toContain(BANNER_TEXT);
    expect(mail.html).toContain('<p>Please review Acme SOW</p>');
    expect(mail.text.startsWith(BANNER_TEXT)).toBe(true);
    expect(mail.text).toContain('Please review Acme SOW');
  });

  it('sends unmodified emails when not staging (no-op)', async () => {
    const ok = await service.sendTemplateEmail(template, 'ron.feathers@leandata.com', {
      sowTitle: 'Acme SOW'
    });
    expect(ok).toBe(true);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.subject).toBe('SOW Approval Required: Acme SOW');
    expect(mail.html).not.toContain('STAGING');
    expect(mail.text).not.toContain('STAGING');
  });

  it('sends unmodified emails in production', async () => {
    process.env.RAILWAY_ENVIRONMENT_NAME = 'production';
    await service.sendTemplateEmail(template, 'ron.feathers@leandata.com', {
      sowTitle: 'Acme SOW'
    });
    const mail = sendMail.mock.calls[0][0];
    expect(mail.subject).toBe('SOW Approval Required: Acme SOW');
    expect(mail.html).not.toContain('STAGING');
  });
});
