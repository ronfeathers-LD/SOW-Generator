import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createFeedbackIssue,
  isFeedbackConfigured,
  listOpenIssues,
  sanitizeAttachmentUrls,
  type FeedbackIssue,
  type FeedbackType,
} from '@/lib/github-issues';

const NOT_CONFIGURED_MESSAGE =
  'Feedback is not configured. Set GITHUB_BOT_TOKEN to enable filing GitHub issues.';

const FEEDBACK_TYPES: FeedbackType[] = ['bug', 'feature'];
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

// Module-level cache so repeat visits don't hammer the GitHub API.
const CACHE_TTL_MS = 60_000;
let issuesCache: { timestamp: number; data: FeedbackIssue[] } | null = null;

// GET - List open feedback issues (cached for 60s; ?fresh=1 bypasses)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isFeedbackConfigured()) {
      return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const fresh = new URL(request.url).searchParams.get('fresh') === '1';
    if (!fresh && issuesCache && Date.now() - issuesCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(issuesCache.data);
    }

    const issues = await listOpenIssues();
    issuesCache = { timestamp: Date.now(), data: issues };
    return NextResponse.json(issues);
  } catch (error) {
    console.error('Error listing feedback issues:', error);
    return NextResponse.json({ error: 'Failed to load feedback issues' }, { status: 500 });
  }
}

// POST - File a bug / feature request as a GitHub issue
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isFeedbackConfigured()) {
      return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    const type = body?.type as FeedbackType | undefined;
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    // Only URLs in our own Supabase public bucket survive this filter.
    const imageUrls = sanitizeAttachmentUrls(body?.imageUrls);

    if (!type || !FEEDBACK_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'bug' or 'feature'" },
        { status: 400 }
      );
    }
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    const issue = await createFeedbackIssue({
      type,
      title,
      description,
      submitterEmail: session.user.email || 'unknown',
      submitterName: session.user.name,
      imageUrls,
    });

    // The list has changed; drop the cache so the next GET reflects it.
    issuesCache = null;

    return NextResponse.json({ number: issue.number, html_url: issue.html_url });
  } catch (error) {
    console.error('Error creating feedback issue:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
