import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SlackService } from './slack';
import { buildSowSubmittedMessage } from './slack-messages';

describe('Slack messages escape user-controlled text (#176)', () => {
  const fetchMock = vi.fn();
  let service: SlackService;

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);
    service = new SlackService({ webhookUrl: 'https://hooks.slack.invalid/test' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function sentJson(): string {
    return fetchMock.mock.calls[0][1].body as string;
  }

  it('escapes client and submitter in the SOW-submitted message, keeps our own link syntax', () => {
    const msg = buildSowSubmittedMessage({
      clientName: 'Acme <!channel> & Co',
      submitterName: '<@U999> Eve',
      approvalsNeeded: 'Project Management',
      signerWarningLine: '',
      sowUrl: 'https://app.example/sow/1',
    });
    expect(msg).toContain('*Client:* Acme &lt;!channel&gt; &amp; Co');
    expect(msg).toContain('*Submitted by:* &lt;@U999&gt; Eve');
    expect(msg).not.toContain('<!channel>');
    expect(msg).not.toContain('<@U999>');
    expect(msg).toContain('<https://app.example/sow/1|Review SOW>');
  });

  it('escapes rejection fields and comments in sendApprovalNotification', async () => {
    await service.sendApprovalNotification(
      'sow-1',
      'Title <!here>',
      'Client <https://evil.example|click>',
      'Legal',
      '<@U1> Approver',
      'rejected',
      'Fix this <!channel> & that'
    );
    const json = sentJson();
    expect(json).toContain('Title &lt;!here&gt;');
    expect(json).toContain('Client &lt;https://evil.example|click&gt;');
    expect(json).toContain('&lt;@U1&gt; Approver');
    expect(json).toContain('Fix this &lt;!channel&gt; &amp; that');
    expect(json).not.toContain('<!channel>');
    expect(json).not.toContain('<!here>');
    expect(json).not.toContain('<@U1>');
  });

  it('escapes the team message body but keeps the mentions it builds', async () => {
    await service.sendTeamMessage('ping <!channel>', ['U42']);
    const json = sentJson();
    expect(json).toContain('<@U42> ping &lt;!channel&gt;');
  });
});
