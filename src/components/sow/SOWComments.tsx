'use client';

import { useState, useEffect, useCallback } from 'react';
import { hasMentions } from '@/lib/mention-utils';
import MentionAutocomplete from '@/components/ui/MentionAutocomplete';
import CommentThread, { type ApprovalComment } from '@/components/sow/CommentThread';
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
}

export default function SOWComments({ sowId, anchorStatus }: SOWCommentsProps) {
  const [comments, setComments] = useState<ApprovalComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/sow/${sowId}/approval-comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sowId]);

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
        ) : (
          comments.map((comment) => (
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
            />
          ))
        )}
      </div>
    </div>
  );
}
