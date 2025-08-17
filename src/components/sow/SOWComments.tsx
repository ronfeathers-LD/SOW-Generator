'use client';

import { useState, useEffect, useCallback } from 'react';

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">
              {comment.user.name || comment.user.email}
            </span>
            {comment.is_internal && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                Internal
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {formatDate(comment.created_at)}
          </span>
        </div>
        
        <div className="text-gray-700 mb-3">
          {comment.comment}
        </div>

        {!isReply && (
          <button
            onClick={() => setReplyTo(comment.id)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Reply
          </button>
        )}

        {replyTo === comment.id && (
          <div className="mt-3 p-3 bg-gray-50 rounded border">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => handleSubmitReply(comment.id)}
                disabled={isSubmitting || !replyText.trim()}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Reply'}
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

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Comments & Discussion</h3>
      
      {/* Add new comment */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="mb-3">
          <label htmlFor="newComment" className="block text-sm font-medium text-gray-700 mb-2">
            Add a comment
          </label>
          <textarea
            id="newComment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts, questions, or feedback about this SOW..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            required
          />
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
