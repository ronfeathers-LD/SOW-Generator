'use client';

import { useEffect, useRef, useState } from 'react';
import CommentThread, {
  quotedTextPreview,
  type ApprovalComment,
} from '@/components/sow/CommentThread';

/**
 * Popover opened by clicking an anchored-comment highlight (#350): shows the
 * quoted text chip, the full thread (same renderer as the Comments tab), a
 * reply box, and Resolve/Unresolve.
 *
 * Positioned near the click point with the same viewport-clamping approach as
 * AnchoredCommentComposer. Closes on Escape and outside-click. Resolution
 * permissions are checked server-side; `canResolve` only hides the button
 * client-side (comment author, SOW author, or admin/manager/pmo).
 */

interface AnchoredCommentThreadProps {
  sowId: string;
  comment: ApprovalComment;
  /** Click point in viewport coordinates (position: fixed). */
  rect: DOMRect;
  canResolve: boolean;
  onClose: () => void;
  /** A reply was posted or resolution toggled — parent should refetch. */
  onThreadChanged: () => void;
}

const PANEL_WIDTH = 384; // w-96
const PANEL_MAX_HEIGHT = 480;
const GAP = 8;

export default function AnchoredCommentThread({
  sowId,
  comment,
  rect,
  canResolve,
  onClose,
  onThreadChanged,
}: AnchoredCommentThreadProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isResolved = !!comment.resolved_at;

  // Escape / outside-click dismissal.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onMouseDown = (event: MouseEvent) => {
      if (
        panelRef.current &&
        event.target instanceof Node &&
        !panelRef.current.contains(event.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [onClose]);

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await fetch(`/api/sow/${sowId}/approval-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: replyText.trim(), parent_id: parentId }),
      });
      if (response.ok) {
        setReplyText('');
        setReplyTo(null);
        onThreadChanged();
      } else {
        setError('Failed to post the reply. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting reply:', err);
      setError('Failed to post the reply. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleResolved = async () => {
    if (isResolving) return;
    try {
      setIsResolving(true);
      setError(null);
      const response = await fetch(
        `/api/sow/${sowId}/approval-comments/${comment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolved: !isResolved }),
        }
      );
      if (response.ok) {
        onThreadChanged();
        if (!isResolved) {
          // Resolving: the highlight is no longer painted — close the popover.
          onClose();
        }
      } else {
        setError(
          response.status === 403
            ? 'You do not have permission to resolve this comment.'
            : 'Failed to update the comment. Please try again.'
        );
      }
    } catch (err) {
      console.error('Error toggling comment resolution:', err);
      setError('Failed to update the comment. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  // Position below the click point; flip above when clipped (same approach
  // as AnchoredCommentComposer), then clamp into the viewport.
  let top = rect.bottom + GAP;
  if (top + PANEL_MAX_HEIGHT > window.innerHeight - GAP) {
    top = Math.max(GAP, rect.top - PANEL_MAX_HEIGHT - GAP);
  }
  const left = Math.min(
    Math.max(GAP, rect.left),
    window.innerWidth - PANEL_WIDTH - GAP
  );

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top,
        left,
        width: PANEL_WIDTH,
        maxHeight: PANEL_MAX_HEIGHT,
        zIndex: 50,
      }}
      className="flex flex-col bg-white border border-gray-200 rounded-lg shadow-xl"
      role="dialog"
      aria-label="Comment thread for highlighted text"
    >
      <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">Comment thread</span>
        <div className="flex items-center space-x-2">
          {canResolve && (
            <button
              type="button"
              onClick={handleToggleResolved}
              disabled={isResolving}
              className={`px-2.5 py-1 text-xs font-medium rounded border disabled:opacity-50 ${
                isResolved
                  ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  : 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100'
              }`}
            >
              {isResolving ? 'Saving…' : isResolved ? 'Unresolve' : 'Resolve'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close thread"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="overflow-y-auto px-4 py-3">
        {comment.quoted_text && (
          <blockquote className="mb-3 border-l-4 border-yellow-300 bg-yellow-50 rounded-r px-3 py-1.5 text-sm text-gray-700 italic break-words">
            {quotedTextPreview(comment.quoted_text)}
          </blockquote>
        )}

        <CommentThread
          comment={comment}
          replyTo={replyTo}
          replyText={replyText}
          isSubmitting={isSubmitting}
          onStartReply={setReplyTo}
          onCancelReply={() => {
            setReplyTo(null);
            setReplyText('');
          }}
          onReplyTextChange={setReplyText}
          onSubmitReply={handleSubmitReply}
          showQuotedText={false}
        />

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
