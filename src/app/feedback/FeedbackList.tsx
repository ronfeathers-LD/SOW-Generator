'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface IssueLabel {
  name: string;
  color: string;
}

interface FeedbackIssue {
  number: number;
  title: string;
  labels: IssueLabel[];
  state: string;
  created_at: string;
  html_url: string;
  comments: number;
  user: string | null;
  submitter: string | null;
}

type Filter = 'all' | 'bug' | 'feature';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bug', label: 'Bugs' },
  { key: 'feature', label: 'Feature Requests' },
];

// Consistent chip colors for the labels we file with; anything else gets gray.
function labelChipClasses(name: string): string {
  switch (name) {
    case 'bug':
      return 'bg-red-100 text-red-800';
    case 'enhancement':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function relativeDate(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function hasLabel(issue: FeedbackIssue, name: string): boolean {
  return issue.labels.some((label) => label.name === name);
}

export default function FeedbackList() {
  const searchParams = useSearchParams();
  const [issues, setIssues] = useState<FeedbackIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  // Arriving right after a submit (?fresh=1) bypasses the server-side cache.
  const fresh = searchParams.get('fresh') === '1';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/feedback${fresh ? '?fresh=1' : ''}`);
        if (!response.ok) {
          if (response.status === 503) {
            if (!cancelled) setNotConfigured(true);
            return;
          }
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || 'Failed to load feedback issues');
        }
        const data: FeedbackIssue[] = await response.json();
        if (!cancelled) setIssues(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load feedback issues');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [fresh]);

  const filtered = issues.filter((issue) => {
    if (filter === 'bug') return hasLabel(issue, 'bug');
    if (filter === 'feature') return hasLabel(issue, 'enhancement');
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Feedback &amp; Issues</h1>
          <Link
            href="/feedback/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            New request
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-4">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                filter === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-md p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
                <div className="h-3 bg-gray-100 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : notConfigured ? (
          <div className="bg-white border border-gray-200 rounded-md p-8 text-center">
            <p className="text-gray-900 font-medium mb-1">Feedback is not configured</p>
            <p className="text-sm text-gray-600">
              An administrator needs to set the <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">GITHUB_BOT_TOKEN</code>{' '}
              environment variable to enable filing GitHub issues from the app.
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-md p-8 text-center">
            <p className="text-gray-900 font-medium mb-1">
              {issues.length === 0 ? 'No open feedback yet' : 'Nothing matches this filter'}
            </p>
            <p className="text-sm text-gray-600">
              Found a bug or have an idea?{' '}
              <Link href="/feedback/new" className="text-indigo-600 hover:text-indigo-800 font-medium">
                File a request
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((issue) => (
              <li key={issue.number} className="bg-white border border-gray-200 rounded-md p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    #{issue.number}
                  </a>
                  <span className="text-sm font-medium text-gray-900">{issue.title}</span>
                  {issue.labels.map((label) => (
                    <span
                      key={label.name}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${labelChipClasses(label.name)}`}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-gray-500">
                  {issue.submitter || issue.user || 'unknown'} · {relativeDate(issue.created_at)}
                  {issue.comments > 0 && (
                    <>
                      {' '}· {issue.comments} comment{issue.comments === 1 ? '' : 's'}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
