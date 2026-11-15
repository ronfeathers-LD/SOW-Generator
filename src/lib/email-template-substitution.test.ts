import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailService } from './email';
import type { EmailConfig } from './email';

vi.mock('./supabase-server', () => ({
  createServiceRoleClient: () => ({
    from: () => ({ insert: async () => ({ data: null, error: null }) })
  })
}));

// gmail provider: authenticates with username/password and never sets apiKey.
const config: EmailConfig = {
  provider: 'gmail',
  username: 'noreply@leandata.com',
  password: 'not-a-real-password',
  fromEmail: 'noreply@leandata.com',
  fromName: 'SOW Generator',
  isActive: true
};

describe('EmailService templates (transporter stubbed, no network)', () => {
  const sendMail = vi.fn();
  let service: EmailService;

  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: 'id' });
    service = new EmailService(config);
    (service as unknown as { transporter: { sendMail: typeof sendMail } }).transporter = { sendMail };
  });

  it('does not re-substitute placeholders that appear inside a variable value (audit #75)', async () => {
    const ok = await service.sendTemplateEmail(
      { name: 't', subject: 'S {{a}}', htmlContent: '<p>{{a}}</p>', textContent: '{{a}}' },
      'ron.feathers@leandata.com',
      { a: '{{b}}', b: 'SECRET' }
    );
    expect(ok).toBe(true);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.subject).toBe('S {{b}}');
    expect(mail.html).toBe('<p>{{b}}</p>');
    expect(mail.text).toBe('{{b}}');
  });

  it('leaves unknown placeholders alone and still escapes html values', async () => {
    await service.sendTemplateEmail(
      { name: 't', subject: '{{x}}', htmlContent: '<p>{{a}} {{missing}}</p>' },
      'ron.feathers@leandata.com',
      { a: '<b>&</b>', x: '<s>' }
    );
    const mail = sendMail.mock.calls[0][0];
    expect(mail.html).toBe('<p>&lt;b&gt;&amp;&lt;/b&gt; {{missing}}</p>');
    expect(mail.subject).toBe('<s>');
  });

  it('PM hours approval/rejection emails send on gmail/smtp config without an apiKey and link the SOW id (audit #147)', async () => {
    const approved = await service.sendPMHoursRemovalApprovalNotification(
      'sow-123', 'Title', 'Client', 'ron.feathers@leandata.com', 'Req', 'App', 5, 'ok'
    );
    expect(approved).toBe(true);
    expect(sendMail.mock.calls[0][0].html).toContain('/sow/sow-123/edit');

    const rejected = await service.sendPMHoursRemovalRejectionNotification(
      'sow-123', 'Title', 'Client', 'ron.feathers@leandata.com', 'Req', 'App', 5, 'no'
    );
    expect(rejected).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});
