'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { hasMentions } from '@/lib/mention-utils';
import MentionAutocomplete from '@/components/ui/MentionAutocomplete';
import CommentThread, { type ApprovalComment } from '@/components/sow/CommentThread';
import {
  COMMENT_FILTERS,
  commentFilterCounts,
  matchesCommentFilter,
  type CommentFilter,
} from '@/lib/comment-filters';
import type { AnchorResolutionStatus } from '@/lib/anchored-highlights';

interface SOWCommentsProps {
  sowId: string;
  /**
   * Anchor resolution computed against the rendered content (#350): comment
   * id → 'resolved' | 'orphaned'. Absent ids (or an absent map) mean the
   * content containers haven't been mounted this session — status unknown,
   * no badge shown.
   */
  anchorStatus?: ReadonlyMap<string, AnchorResolutionStatus>;
  /**
   * SOW author id — for the inline Resolve permission check (mirrors the
   * PATCH route: comment author, SOW author, or admin/manager/pmo).
   */
  sowAuthorId?: string | null;
  /**
   * Jump-to-text (#351): provided by the host view (which owns the tab state
   * and the highlights hook). Called with an anchored top-level comment.
   */
  onJumpToComment?: (comment: ApprovalComment) => void;
  /**
   * The thread list changed (loaded, posted, resolved). The host uses this
   * for the Comments tab count — explicit callback, no event bus.
   */
  onCommentsChange?: (comments: ApprovalComment[]) => void;
}

const FILTER_LABELS: Record<CommentFilter, string> = {
  open: 'Open',
  resolved: 'Resolved',
  all: 'All',
};

export default function SOWComments({
  sowId,
  anchorStatus,
  sowAuthorId,
  onJumpToComment,
  onCommentsChange,
}: SOWCommentsProps) {
  const [comments, setComments] = useState<ApprovalComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<CommentFilter>('open');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const { data: session } = useSession();

  const loadComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/sow/${sowId}/approval-comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
        onCommentsChange?.(data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sowId, onCommentsChange]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/sow/${sowId}/approval-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: newComment.trim(),
          parent_id: null
        }),
      });

      if (response.ok) {
        setNewComment('');
        await loadComments();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/sow/${sowId}/approval-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: replyText.trim(),
          parent_id: parentId
        }),
      });

      if (response.ok) {
        setReplyText('');
        setReplyTo(null);
        await loadComments();
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Inline Resolve/Unresolve (#351) — mirrors AnchoredCommentThread's toggle.
  // The PATCH route allows this on ANY top-level comment, general or anchored.
  const handleToggleResolved = async (comment: ApprovalComment) => {
    if (resolvingId) return;
    try {
      setResolvingId(comment.id);
      setResolveError(null);
      const response = await fetch(
        `/api/sow/${sowId}/approval-comments/${comment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolved: !comment.resolved_at }),
        }
      );
      if (response.ok) {
        await loadComments();
      } else {
        setResolveError(
          response.status === 403
            ? 'You do not have permission to resolve this comment.'
            : 'Failed to update the comment. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error toggling comment resolution:', error);
      setResolveError('Failed to update the comment. Please try again.');
    } finally {
      setResolvingId(null);
    }
  };

  // Resolve permission, mirrored from the PATCH route (server still
  // enforces): comment author, SOW author, or admin/manager/pmo.
  const canResolveComment = useCallback(
    (comment: ApprovalComment): boolean => {
      const user = session?.user;
      if (!user) return false;
      return (
        comment.user?.id === user.id ||
        (!!sowAuthorId && sowAuthorId === user.id) ||
        ['admin', 'manager', 'pmo'].includes(user.role ?? '')
      );
    },
    [session?.user, sowAuthorId]
  );

  const counts = useMemo(() => commentFilterCounts(comments), [comments]);
  const visibleComments = useMemo(
    () => comments.filter((comment) => matchesCommentFilter(comment, filter)),
    [comments, filter]
  );

  const handleMentionSelect = () => {
    // You can add additional logic here if needed
  };

  return (
    <div className="bg-white ">
      <h3 className="text-lg font-semibold mb-4">Comments & Discussion</h3>
      {/* Add new comment */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="mb-3">
          <label htmlFor="newComment" className="block text-sm font-medium text-gray-700 mb-2">
            Add a comment
          </label>
          <MentionAutocomplete
            value={newComment}
            onChange={setNewComment}
            onMentionSelect={handleMentionSelect}
            placeholder="Share your thoughts, questions, or feedback about this SOW... Use &quot;@username&quot; to mention team members"
            rows={3}
          />
          {hasMentions(newComment) && (
            <div className="mt-2 text-sm text-blue-600">
              ✨ Mentions detected! Team members will be notified via Slack.
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !newComment.trim()}
          className="btn-secondary-cta px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>

      {/* Filter: Open (default) / Resolved / All, with counts (#351). */}
      <div className="mb-4 flex items-center space-x-2" role="group" aria-label="Filter comments">
        {COMMENT_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              filter === value
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {FILTER_LABELS[value]} ({counts[value]})
          </button>
        ))}
      </div>

      {resolveError && (
        <p className="mb-3 text-sm text-red-600">{resolveError}</p>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="text-gray-500">Loading comments...</div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No comments yet. Be the first to add a comment!</p>
          </div>
        ) : visibleComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No {filter} comments.</p>
          </div>
        ) : (
          visibleComments.map((comment) => (
            <CommentThread
              key={comment.id}
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
              anchorStatus={anchorStatus?.get(comment.id)}
              sowId={sowId}
              onJumpToText={
                onJumpToComment ? () => onJumpToComment(comment) : undefined
              }
              canResolve={canResolveComment(comment)}
              onToggleResolved={() => handleToggleResolved(comment)}
              isResolving={resolvingId === comment.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
