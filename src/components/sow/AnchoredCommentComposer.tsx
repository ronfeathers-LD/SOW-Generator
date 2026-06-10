'use client';

import { useState } from 'react';
import MentionAutocomplete from '@/components/ui/MentionAutocomplete';
import { hasMentions } from '@/lib/mention-utils';
import type { SelectionAnchor } from '@/lib/selection-anchor';
import type { SOWSectionKey } from '@/lib/sow-content';

/**
 * Popover composer for anchored comments (#349). Shows the quoted selection
 * as a blockquote chip, takes the comment text (with @mention autocomplete,
 * same as SOWComments), and POSTs it with the anchor.
 *
 * 422 from the API means the quoted text isn't part of the section's STORED
 * rendered content (e.g. the section displays default-template content that
 * never hit the DB) — offer to post the comment as a general (unanchored)
 * comment instead.
 */

interface AnchoredCommentComposerProps {
  sowId: string;
  sectionKey: SOWSectionKey;
  anchor: SelectionAnchor;
  /** Selection bounding box in viewport coordinates (position: fixed). */
  rect: DOMRect;
  onClose: () => void;
  /** Called after a comment (anchored or fallback) is successfully posted. */
  onPosted: () => void;
}

const PANEL_WIDTH = 384; // w-96
const GAP = 8;

function quotedPreview(text: string): string {
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

export default function AnchoredCommentComposer({
  sowId,
  sectionKey,
  anchor,
  rect,
  onClose,
  onPosted,
}: AnchoredCommentComposerProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'anchor_rejected' | 'error' | 'success'>('idle');

  const postComment = async (withAnchor: boolean) => {
    if (!comment.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/sow/${sowId}/approval-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: comment.trim(),
          parent_id: null,
          ...(withAnchor
            ? { anchor: { section_key: sectionKey, ...anchor } }
            : {}),
        }),
      });

      if (response.ok) {
        setStatus('success');
        onPosted();
        setTimeout(onClose, 1600);
      } else if (response.status === 422) {
        setStatus('anchor_rejected');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Error posting anchored comment:', error);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Position the panel below the selection; flip above when clipped.
  const panelMaxHeight = 320;
  let top = rect.bottom + GAP;
  if (top + panelMaxHeight > window.innerHeight - GAP) {
    top = Math.max(GAP, rect.top - panelMaxHeight - GAP);
  }
  const left = Math.min(
    Math.max(GAP, rect.left),
    window.innerWidth - PANEL_WIDTH - GAP
  );

  return (
    <div
      style={{ position: 'fixed', top, left, width: PANEL_WIDTH, zIndex: 50 }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl p-4"
      role="dialog"
      aria-label="Comment on selected text"
    >
      <blockquote className="mb-3 border-l-4 border-indigo-300 bg-indigo-50 rounded-r px-3 py-2 text-sm text-gray-700 italic break-words">
        {quotedPreview(anchor.quoted_text)}
      </blockquote>

      {status === 'success' ? (
        <div className="flex items-center text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Comment posted — see the Comments tab.
        </div>
      ) : (
        <>
          <MentionAutocomplete
            value={comment}
            onChange={setComment}
            placeholder="Comment on the selected text… Use @username to mention team members"
            rows={3}
            disabled={isSubmitting}
          />
          {hasMentions(comment) && (
            <div className="mt-1 text-xs text-blue-600">
              Mentions detected — team members will be notified via Slack.
            </div>
          )}

          {status === 'anchor_rejected' && (
            <div className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <p className="mb-2">
                The selected text isn&apos;t part of this SOW&apos;s stored
                content, so it can&apos;t be anchored.
              </p>
              <button
                type="button"
                onClick={() => postComment(false)}
                disabled={isSubmitting || !comment.trim()}
                className="px-2.5 py-1 text-xs font-medium rounded border border-amber-300 bg-white text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                {isSubmitting ? 'Posting…' : 'Post as general comment'}
              </button>
            </div>
          )}

          {status === 'error' && (
            <p className="mt-2 text-sm text-red-600">
              Failed to post the comment. Please try again.
            </p>
          )}

          <div className="mt-3 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => postComment(true)}
              disabled={isSubmitting || !comment.trim() || status === 'anchor_rejected'}
              className="btn-secondary-cta px-3 py-1.5 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
