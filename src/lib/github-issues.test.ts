import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildIssueBody,
  createFeedbackIssue,
  isAllowedAttachmentUrl,
  labelsForFeedbackType,
  listOpenIssues,
  mapIssueList,
  parseSubmitterFromBody,
  sanitizeAttachmentUrls,
} from './github-issues';

const ISSUE_BASE = {
  number: 1,
  title: 'An issue',
  state: 'open',
  created_at: '2026-06-01T00:00:00Z',
  html_url: 'https://github.com/ronfeathers-LD/SOW-Generator/issues/1',
  comments: 0,
  body: null,
  user: { login: 'sow-bot' },
  labels: [],
};

describe('labelsForFeedbackType', () => {
  it('maps bug → bug + user-feedback', () => {
    expect(labelsForFeedbackType('bug')).toEqual(['bug', 'user-feedback']);
  });

  it('maps feature → enhancement + user-feedback', () => {
    expect(labelsForFeedbackType('feature')).toEqual(['enhancement', 'user-feedback']);
  });
});

describe('buildIssueBody', () => {
  it('builds marker, attribution quote, and description', () => {
    const body = buildIssueBody({
      description: 'It broke.',
      submitterEmail: 'ron@leandata.com',
      submitterName: 'Ron Feathers',
    });
    expect(body).toBe(
      '<!-- sow-feedback:submitter=ron@leandata.com -->\n' +
        '> Submitted by: Ron Feathers (ron@leandata.com) via the SOW Generator app\n' +
        '\n' +
        'It broke.'
    );
  });

  it('falls back to the email when no name is provided', () => {
    const body = buildIssueBody({ submitterEmail: 'ron@leandata.com', submitterName: null });
    expect(body).toContain('> Submitted by: ron@leandata.com (ron@leandata.com)');
  });

  it('omits the trailing description block when description is empty', () => {
    const body = buildIssueBody({ description: '  ', submitterEmail: 'ron@leandata.com' });
    expect(body.endsWith('via the SOW Generator app')).toBe(true);
  });

  it('appends a Screenshots section with markdown images when imageUrls are provided', () => {
    const body = buildIssueBody({
      description: 'It broke.',
      submitterEmail: 'ron@leandata.com',
      submitterName: 'Ron Feathers',
      imageUrls: ['https://x/a.png', 'https://x/b.png'],
    });
    expect(body).toBe(
      '<!-- sow-feedback:submitter=ron@leandata.com -->\n' +
        '> Submitted by: Ron Feathers (ron@leandata.com) via the SOW Generator app\n' +
        '\n' +
        'It broke.\n' +
        '\n' +
        '## Screenshots\n' +
        '\n' +
        '![screenshot 1](https://x/a.png)\n' +
        '\n' +
        '![screenshot 2](https://x/b.png)'
    );
  });

  it('adds screenshots even when there is no description', () => {
    const body = buildIssueBody({
      submitterEmail: 'ron@leandata.com',
      imageUrls: ['https://x/a.png'],
    });
    expect(body).toContain('## Screenshots');
    expect(body).toContain('![screenshot 1](https://x/a.png)');
    // The empty description must not leave a dangling blank block before it.
    expect(body).not.toContain('app\n\n\n');
  });

  it('ignores an empty imageUrls array', () => {
    const body = buildIssueBody({ description: 'hi', submitterEmail: 'ron@leandata.com', imageUrls: [] });
    expect(body).not.toContain('Screenshots');
  });
});

describe('isAllowedAttachmentUrl', () => {
  const SUPA = 'https://proj.supabase.co';
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPA);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts a public rte-images URL on our Supabase host', () => {
    expect(
      isAllowedAttachmentUrl(`${SUPA}/storage/v1/object/public/rte-images/123-abc.png`)
    ).toBe(true);
  });

  it('rejects a different host', () => {
    expect(
      isAllowedAttachmentUrl('https://evil.example.com/storage/v1/object/public/rte-images/x.png')
    ).toBe(false);
  });

  it('rejects a non-rte-images path on our host', () => {
    expect(isAllowedAttachmentUrl(`${SUPA}/storage/v1/object/public/other/x.png`)).toBe(false);
  });

  it('rejects non-https and malformed URLs', () => {
    expect(
      isAllowedAttachmentUrl(`http://proj.supabase.co/storage/v1/object/public/rte-images/x.png`)
    ).toBe(false);
    expect(isAllowedAttachmentUrl('not a url')).toBe(false);
  });
});

describe('sanitizeAttachmentUrls', () => {
  const SUPA = 'https://proj.supabase.co';
  const ok = (n: string) => `${SUPA}/storage/v1/object/public/rte-images/${n}`;
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPA);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps only allowed URLs and drops the rest', () => {
    expect(
      sanitizeAttachmentUrls([ok('a.png'), 'https://evil.com/x.png', ok('b.png')])
    ).toEqual([ok('a.png'), ok('b.png')]);
  });

  it('de-duplicates and caps at 10', () => {
    const many = Array.from({ length: 15 }, (_, i) => ok(`${i}.png`));
    expect(sanitizeAttachmentUrls([ok('a.png'), ok('a.png'), ...many]).length).toBe(10);
  });

  it('returns [] for non-array input', () => {
    expect(sanitizeAttachmentUrls('nope')).toEqual([]);
    expect(sanitizeAttachmentUrls(undefined)).toEqual([]);
    expect(sanitizeAttachmentUrls([123, null, {}])).toEqual([]);
  });
});

describe('parseSubmitterFromBody', () => {
  it('extracts the email from the marker', () => {
    expect(
      parseSubmitterFromBody('<!-- sow-feedback:submitter=ron@leandata.com -->\nhello')
    ).toBe('ron@leandata.com');
  });

  it('tolerates extra whitespace inside the comment', () => {
    expect(
      parseSubmitterFromBody('<!--  sow-feedback:submitter=a@b.com   -->')
    ).toBe('a@b.com');
  });

  it('returns null when the marker is absent or body is empty', () => {
    expect(parseSubmitterFromBody('just a normal issue body')).toBeNull();
    expect(parseSubmitterFromBody(null)).toBeNull();
    expect(parseSubmitterFromBody(undefined)).toBeNull();
    expect(parseSubmitterFromBody('')).toBeNull();
  });
});

describe('mapIssueList', () => {
  it('filters out pull requests', () => {
    const mapped = mapIssueList([
      { ...ISSUE_BASE, number: 1 },
      { ...ISSUE_BASE, number: 2, pull_request: { url: 'x' } },
    ]);
    expect(mapped.map((i) => i.number)).toEqual([1]);
  });

  it('maps to the lean shape with labels and parsed submitter', () => {
    const [issue] = mapIssueList([
      {
        ...ISSUE_BASE,
        number: 7,
        title: 'Broken thing',
        comments: 3,
        body: '<!-- sow-feedback:submitter=ron@leandata.com -->\n> Submitted by…',
        labels: [
          { name: 'bug', color: 'd73a4a' },
          { name: 'user-feedback', color: 'ededed' },
        ],
      },
    ]);
    expect(issue).toEqual({
      number: 7,
      title: 'Broken thing',
      state: 'open',
      created_at: '2026-06-01T00:00:00Z',
      html_url: 'https://github.com/ronfeathers-LD/SOW-Generator/issues/1',
      comments: 3,
      user: 'sow-bot',
      submitter: 'ron@leandata.com',
      labels: [
        { name: 'bug', color: 'd73a4a' },
        { name: 'user-feedback', color: 'ededed' },
      ],
    });
  });

  it('handles string labels, missing user, and missing comment count', () => {
    const [issue] = mapIssueList([
      { ...ISSUE_BASE, comments: undefined, user: null, labels: ['bug'] },
    ]);
    expect(issue.labels).toEqual([{ name: 'bug', color: '' }]);
    expect(issue.user).toBeNull();
    expect(issue.submitter).toBeNull();
    expect(issue.comments).toBe(0);
  });
});

describe('network functions (mocked fetch)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('GITHUB_BOT_TOKEN', 'test-token');
    vi.stubEnv('GITHUB_ISSUES_REPO', 'acme/widgets');
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status });
  }

  it('createFeedbackIssue POSTs title/body/labels with auth headers', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ number: 42, html_url: 'https://github.com/acme/widgets/issues/42' }, 201)
    );

    const created = await createFeedbackIssue({
      type: 'feature',
      title: 'Add dark mode',
      description: 'Please',
      submitterEmail: 'ron@leandata.com',
      submitterName: 'Ron',
    });

    expect(created).toEqual({ number: 42, html_url: 'https://github.com/acme/widgets/issues/42' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/acme/widgets/issues');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(init.headers.Accept).toBe('application/vnd.github+json');
    expect(init.headers['X-GitHub-Api-Version']).toBe('2022-11-28');
    const payload = JSON.parse(init.body);
    expect(payload.title).toBe('Add dark mode');
    expect(payload.labels).toEqual(['enhancement', 'user-feedback']);
    expect(payload.body).toContain('sow-feedback:submitter=ron@leandata.com');
  });

  it('listOpenIssues fetches one page when fewer than 100 items, sorted newest first', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { ...ISSUE_BASE, number: 1, created_at: '2026-06-01T00:00:00Z' },
        { ...ISSUE_BASE, number: 2, created_at: '2026-06-05T00:00:00Z' },
        { ...ISSUE_BASE, number: 3, pull_request: {} },
      ])
    );

    const issues = await listOpenIssues();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.github.com/repos/acme/widgets/issues?state=open&per_page=100&page=1'
    );
    expect(issues.map((i) => i.number)).toEqual([2, 1]);
  });

  it('listOpenIssues follows pagination but stops at 3 pages', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ ...ISSUE_BASE, number: i + 1 }));
    fetchMock
      .mockResolvedValueOnce(jsonResponse(fullPage))
      .mockResolvedValueOnce(jsonResponse(fullPage))
      .mockResolvedValueOnce(jsonResponse(fullPage));

    const issues = await listOpenIssues();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(issues).toHaveLength(300);
  });

  it('throws with status and GitHub message on error, without leaking the token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Bad credentials' }, 401));

    const error = await listOpenIssues().then(
      () => {
        throw new Error('expected listOpenIssues to reject');
      },
      (e) => e as Error
    );
    expect(error.message).toMatch(/GitHub API error 401: Bad credentials/);
    expect(error.message).not.toContain('test-token');
  });

  it('throws when GITHUB_BOT_TOKEN is unset, without calling fetch', async () => {
    vi.stubEnv('GITHUB_BOT_TOKEN', '');
    await expect(listOpenIssues()).rejects.toThrowError(/GITHUB_BOT_TOKEN/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
