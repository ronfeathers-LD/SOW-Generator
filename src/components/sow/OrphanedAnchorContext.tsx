'use client';

import { useState } from 'react';
import {
  computeOrphanContextSnippet,
  type OrphanContextSnippet,
} from '@/lib/orphan-context';

/**
 * "Show original context" for an ORPHANED anchored comment (#351): the text
 * the comment was anchored to no longer appears in the SOW, so on demand we
 * fetch the section's content snapshot from the submission the comment was
 * filed against (`snapshot_id`) and show the quote with its original
 * surroundings.
 *
 * Collapsed by default; fetches once on first expand. The API returns the
 * snapshot's anchor text (computed server-side — see the content-snapshots
 * route); locating the quote and slicing the window is pure string work
 * (src/lib/orphan-context.ts). When the quote isn't in the snapshot either
 * (comment filed against content newer than the last submission), we fall
 * back to showing the quote alone.
 */

interface OrphanedAnchorContextProps {
  sowId: string;
  snapshotId: string;
  anchor: {
    quoted_text: string;
    context_prefix?: string | null;
    context_suffix?: string | null;
    start_offset?: number | null;
  };
}

interface LoadedContext {
  snippet: OrphanContextSnippet | null;
  snapshotDate: string | null;
}

export default function OrphanedAnchorContext({
  sowId,
  snapshotId,
  anchor,
}: OrphanedAnchorContextProps) {
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedContext | null>(null);

  const handleToggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (loaded || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        `/api/sow/${sowId}/content-snapshots/${snapshotId}`
      );
      if (!response.ok) {
        setError('Could not load the original content.');
        return;
      }
      const data = (await response.json()) as {
        anchor_text?: string;
        created_at?: string;
      };
      const snippet = computeOrphanContextSnippet(data.anchor_text ?? '', {
        quoted_text: anchor.quoted_text,
        context_prefix: anchor.context_prefix ?? '',
        context_suffix: anchor.context_suffix ?? '',
        start_offset: anchor.start_offset ?? -1,
      });
      setLoaded({ snippet, snapshotDate: data.created_at ?? null });
    } catch (err) {
      console.error('Error loading content snapshot:', err);
      setError('Could not load the original content.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={handleToggle}
        className="text-xs text-amber-700 hover:text-amber-900 underline"
      >
        {expanded ? 'Hide original context' : 'Show original context'}
      </button>

      {expanded && (
        <div className="mt-1.5 border-l-4 border-amber-300 bg-amber-50 rounded-r px-3 py-2 text-sm">
          <p className="text-xs font-medium text-amber-800 mb-1">
            Original text (since edited):
            {loaded?.snapshotDate && (
              <span className="font-normal text-amber-700">
                {' '}
                — snapshot from{' '}
                {new Date(loaded.snapshotDate).toLocaleDateString()}
              </span>
            )}
          </p>

          {isLoading && <p className="text-gray-500 text-xs">Loading…</p>}
          {error && <p className="text-red-600 text-xs">{error}</p>}

          {loaded && !isLoading && !error && (
            loaded.snippet ? (
              <p className="text-gray-700 break-words">
                {loaded.snippet.truncatedStart && '… '}
                {loaded.snippet.prefix}
                <mark className="bg-amber-200 rounded px-0.5">
                  {loaded.snippet.quoted}
                </mark>
                {loaded.snippet.suffix}
                {loaded.snippet.truncatedEnd && ' …'}
              </p>
            ) : (
              <p className="text-gray-700 italic break-words">
                {anchor.quoted_text}
                <span className="block mt-1 text-xs text-amber-700 not-italic">
                  The surrounding original text is unavailable for this comment.
                </span>
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
