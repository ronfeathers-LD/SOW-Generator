/**
 * GitHub Issues client for the in-app feedback feature (server-only).
 *
 * Files user-submitted bugs / feature requests as issues on the repo named in
 * GITHUB_ISSUES_REPO using a bot PAT (GITHUB_BOT_TOKEN), and lists open issues
 * for the /feedback page. Uses native fetch — no octokit dependency.
 */

const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_REPO = 'ronfeathers-LD/SOW-Generator';

/** Origin label distinguishing issues filed from the app. */
export const FEEDBACK_ORIGIN_LABEL = 'user-feedback';

/** HTML-comment marker embedded in issue bodies so app-filed issues can be
 * attributed to the real requester instead of the bot account. */
const SUBMITTER_MARKER_RE = /<!--\s*sow-feedback:submitter=([^\s]+)\s*-->/;

export type FeedbackType = 'bug' | 'feature';

export interface GitHubIssueLabel {
  name: string;
  color: string;
}

export interface FeedbackIssue {
  number: number;
  title: string;
  labels: GitHubIssueLabel[];
  state: string;
  created_at: string;
  html_url: string;
  comments: number;
  /** GitHub login of the issue author (the bot for app-filed issues). */
  user: string | null;
  /** Email parsed from the sow-feedback submitter marker, when present. */
  submitter: string | null;
}

export interface CreatedIssue {
  number: number;
  html_url: string;
}

export function isFeedbackConfigured(): boolean {
  return Boolean(process.env.GITHUB_BOT_TOKEN);
}

function issuesRepo(): string {
  return process.env.GITHUB_ISSUES_REPO || DEFAULT_REPO;
}

/** Labels applied to an app-filed issue: GH's stock type label + the origin label. */
export function labelsForFeedbackType(type: FeedbackType): string[] {
  return [type === 'bug' ? 'bug' : 'enhancement', FEEDBACK_ORIGIN_LABEL];
}

/** Builds the issue body with the submitter marker + attribution quote. */
export function buildIssueBody(params: {
  description?: string | null;
  submitterEmail: string;
  submitterName?: string | null;
  imageUrls?: string[] | null;
}): string {
  const { description, submitterEmail } = params;
  const name = params.submitterName?.trim() || submitterEmail;
  const header =
    `<!-- sow-feedback:submitter=${submitterEmail} -->\n` +
    `> Submitted by: ${name} (${submitterEmail}) via the SOW Generator app`;
  const body = description?.trim();
  const images = (params.imageUrls ?? []).filter(Boolean);

  // Assemble the present sections and join with a single blank line, so an
  // absent description never leaves a dangling gap before the screenshots.
  const sections = [header];
  if (body) sections.push(body);
  if (images.length > 0) {
    sections.push(
      '## Screenshots\n\n' +
        images.map((url, i) => `![screenshot ${i + 1}](${url})`).join('\n\n')
    );
  }
  return sections.join('\n\n');
}

/** Cap on the number of screenshots attached to a single feedback issue. */
export const MAX_ATTACHMENTS = 10;

/**
 * True only for image URLs that live in our own Supabase `rte-images` public
 * bucket. User-submitted URLs are otherwise untrusted — this prevents arbitrary
 * or off-site content from being embedded into a GitHub issue on our repo.
 */
export function isAllowedAttachmentUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  let parsed: URL;
  let baseHost: string;
  try {
    parsed = new URL(url);
    baseHost = new URL(base).host;
  } catch {
    return false;
  }
  return (
    parsed.protocol === 'https:' &&
    parsed.host === baseHost &&
    parsed.pathname.startsWith('/storage/v1/object/public/rte-images/')
  );
}

/**
 * Filters a client-supplied list down to distinct, allowed image URLs, capped
 * at MAX_ATTACHMENTS. Accepts unknown input and never throws.
 */
export function sanitizeAttachmentUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  const out: string[] = [];
  for (const u of urls) {
    if (out.length >= MAX_ATTACHMENTS) break;
    if (typeof u === 'string' && isAllowedAttachmentUrl(u) && !out.includes(u)) {
      out.push(u);
    }
  }
  return out;
}

/** Parses the submitter email out of an issue body, if the marker is present. */
export function parseSubmitterFromBody(body: string | null | undefined): string | null {
  if (!body) return null;
  const match = body.match(SUBMITTER_MARKER_RE);
  return match ? match[1] : null;
}

/** Raw shape of the GitHub /issues list items we care about. */
interface RawGitHubIssue {
  number: number;
  title: string;
  state: string;
  created_at: string;
  html_url: string;
  comments?: number;
  body?: string | null;
  user?: { login?: string } | null;
  labels?: Array<{ name?: string; color?: string } | string>;
  /** Present when the "issue" is actually a pull request. */
  pull_request?: unknown;
}

/**
 * Filters out pull requests (GitHub returns PRs from /issues) and maps the
 * remainder to the lean FeedbackIssue shape.
 */
export function mapIssueList(items: RawGitHubIssue[]): FeedbackIssue[] {
  return items
    .filter((item) => !('pull_request' in item))
    .map((item) => ({
      number: item.number,
      title: item.title,
      state: item.state,
      created_at: item.created_at,
      html_url: item.html_url,
      comments: item.comments ?? 0,
      user: item.user?.login ?? null,
      submitter: parseSubmitterFromBody(item.body),
      labels: (item.labels ?? []).map((label) =>
        typeof label === 'string'
          ? { name: label, color: '' }
          : { name: label.name ?? '', color: label.color ?? '' }
      ),
    }));
}

async function githubFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = process.env.GITHUB_BOT_TOKEN;
  if (!token) {
    throw new Error('GITHUB_BOT_TOKEN is not configured');
  }

  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  if (!response.ok) {
    // Surface GitHub's message + status, but never the token.
    let message = response.statusText;
    try {
      const data = await response.json();
      if (data && typeof data.message === 'string') {
        message = data.message;
      }
    } catch {
      // Non-JSON error body; keep statusText.
    }
    throw new Error(`GitHub API error ${response.status}: ${message}`);
  }

  return response;
}

/** Files a feedback issue on the configured repo. */
export async function createFeedbackIssue(params: {
  type: FeedbackType;
  title: string;
  description?: string | null;
  submitterEmail: string;
  submitterName?: string | null;
  imageUrls?: string[] | null;
}): Promise<CreatedIssue> {
  const response = await githubFetch(`/repos/${issuesRepo()}/issues`, {
    method: 'POST',
    body: JSON.stringify({
      title: params.title,
      body: buildIssueBody(params),
      labels: labelsForFeedbackType(params.type),
    }),
  });

  const issue = (await response.json()) as { number: number; html_url: string };
  return { number: issue.number, html_url: issue.html_url };
}

/**
 * Lists open issues (PRs excluded), newest first. Follows pagination up to
 * 3 pages of 100 — far more than this internal tool should ever accumulate.
 */
export async function listOpenIssues(): Promise<FeedbackIssue[]> {
  const repo = issuesRepo();
  const all: FeedbackIssue[] = [];

  for (let page = 1; page <= 3; page++) {
    const response = await githubFetch(
      `/repos/${repo}/issues?state=open&per_page=100&page=${page}`
    );
    const items = (await response.json()) as RawGitHubIssue[];
    all.push(...mapIssueList(items));
    if (items.length < 100) break;
  }

  return all.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
