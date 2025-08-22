'use client';

import { useState, useEffect, useCallback } from 'react';
import { hasMentions, formatCommentWithMentions } from '@/lib/mention-utils';
import MentionAutocomplete from '@/components/ui/MentionAutocomplete';

interface Comment {
  id: string;
  comment: string;
  is_internal: boolean;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  replies?: Comment[];
}

interface SOWCommentsProps {
  sowId: string;
}

export default function SOWComments({ sowId }: SOWCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
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

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <div key={comment.id} className={`border rounded-lg p-4 ${isReply ? 'ml-8 bg-gray-50' : 'bg-white'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900">
            {comment.user.name || comment.user.email}
          </span>
          <span className="text-sm text-gray-500">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
          {hasMentions(comment.comment) && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              @mentions
            </span>
          )}
        </div>
      </div>
      
      <div 
        className="text-gray-700 mb-3"
        dangerouslySetInnerHTML={{ 
          __html: formatCommentWithMentions(comment.comment) 
        }}
      />
      
      {!isReply && (
        <button
          onClick={() => setReplyTo(comment.id)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reply
        </button>
      )}

      {replyTo === comment.id && (
        <div className="mt-3">
          <MentionAutocomplete
            value={replyText}
            onChange={setReplyText}
            onMentionSelect={handleMentionSelect}
            placeholder="Write a reply..."
            rows={2}
          />
          <div className="mt-2 space-x-2">
            <button
              onClick={() => handleSubmitReply(comment.id)}
              disabled={isSubmitting || !replyText.trim()}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post Reply'}
            </button>
            <button
              onClick={() => {
                setReplyTo(null);
                setReplyText('');
              }}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-2">
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

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
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          comments.map((comment) => renderComment(comment, false))
        )}
      </div>
    </div>
  );
}
