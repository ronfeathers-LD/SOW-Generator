'use client';

import { useState, useEffect, useCallback } from 'react';

interface ApprovalStage {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  requires_comment: boolean;
  auto_approve: boolean;
  created_at: string;
  updated_at: string;
}

interface SOWApproval {
  id: string;
  sow_id: string;
  stage_id: string;
  approver_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  comments?: string;
  approved_at?: string;
  rejected_at?: string;
  skipped_at?: string;
  version: number;
  created_at: string;
  updated_at: string;
  stage?: ApprovalStage;
  approver?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ApprovalComment {
  id: string;
  sow_id: string;
  user_id: string;
  comment: string;
  is_internal: boolean;
  parent_id?: string; // For threaded comments
  version: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  replies?: ApprovalComment[]; // Nested replies
}

interface ApprovalWorkflow {
  sow_id: string;
  current_stage?: ApprovalStage;
  approvals: SOWApproval[];
  comments: ApprovalComment[];
  can_approve: boolean;
  can_reject: boolean;
  can_skip: boolean;
  next_stage?: ApprovalStage;
  is_complete: boolean;
}

interface ApprovalWorkflowProps {
  sowId: string;
  sowAmount?: number;
  onStatusChange?: () => void;
  showApprovalActions?: boolean;
}

// Recursive component for rendering threaded comments
function CommentThread({ 
  comment, 
  onReply, 
  replyingTo, 
  setReplyingTo, 
  replyText, 
  setReplyText, 
  onSubmitReply, 
  submitting,
  isReply = false
}: {
  comment: ApprovalComment;
  onReply: (commentId: string) => void;
  replyingTo: string | null;
  setReplyingTo: (commentId: string | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  onSubmitReply: (parentId: string) => void;
  submitting: boolean;
  isReply?: boolean;
}) {
  // Debug logging
  console.log('CommentThread render:', { 
    commentId: comment.id, 
    isReply, 
    hasReplies: comment.replies?.length || 0,
    replies: comment.replies 
  });

    return (
    <div className="bg-white rounded-lg mb-2 w-full">
      <div className="p-2">
        <div className={`${isReply ? 'ml-6' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-xs">{comment.user?.name}</span>
          </div>
          <div className="text-xs text-gray-500">
            {new Date(comment.created_at).toLocaleDateString()}
          </div>
        </div>
        <p className="text-xs mb-2">{comment.comment}</p>
        <div className="flex justify-end">
          <button
            onClick={() => onReply(comment.id)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Reply
          </button>
        </div>
      
      {/* Reply form */}
      {replyingTo === comment.id && (
        <div className="mt-2 p-2 bg-gray-50 rounded">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="w-full p-1 border border-gray-300 rounded-md text-xs mb-2"
            rows={2}
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setReplyingTo(null)}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmitReply(comment.id)}
              disabled={submitting || !replyText.trim()}
              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-xs"
            >
              {submitting ? 'Posting...' : 'Reply'}
            </button>
          </div>
        </div>
      )}
      
      {/* Nested replies - all look the same */}
      {comment.replies && comment.replies.length > 0 && (
        <>
          {comment.replies
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyText={replyText}
              setReplyText={setReplyText}
              onSubmitReply={onSubmitReply}
              submitting={submitting}
              isReply={true}
            />
          ))}
        </>
      )}
        </div>
      </div>
    </div>
  );
}

export default function ApprovalWorkflow({ sowId, sowAmount, onStatusChange, showApprovalActions = true }: ApprovalWorkflowProps) {
  const [workflow, setWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');

  const [approvalComments, setApprovalComments] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Debug logging
  useEffect(() => {
    if (workflow?.comments) {
      console.log('Workflow comments:', workflow.comments);
    }
  }, [workflow?.comments]);

  const fetchWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sow/${sowId}/approvals`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch approval workflow');
      }
      
      const data = await response.json();
      setWorkflow(data);
    } catch (err) {
      console.error('Error fetching workflow:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch workflow');
    } finally {
      setLoading(false);
    }
  }, [sowId]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  const handleSubmitForApproval = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/sow/${sowId}/approvals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sow_amount: sowAmount }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit for approval');
      }

      await fetchWorkflow();
      onStatusChange?.();
    } catch (err) {
      console.error('Error submitting for approval:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovalAction = async (approvalId: string, action: 'approve' | 'reject' | 'skip') => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/sow/${sowId}/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action,
          comments: approvalComments 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} approval`);
      }

      setApprovalComments('');
      await fetchWorkflow();
      onStatusChange?.();
    } catch (err) {
      console.error(`Error ${action}ing approval:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${action} approval`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/sow/${sowId}/approval-comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          comment: newComment.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setNewComment('');
      await fetchWorkflow();
    } catch (err) {
      console.error('Error adding comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    try {
      setSubmitting(true);
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

      if (!response.ok) {
        throw new Error('Failed to add reply');
      }

      setReplyText('');
      setReplyingTo(null);
      await fetchWorkflow();
    } catch (err) {
      console.error('Error adding reply:', err);
      setError(err instanceof Error ? err.message : 'Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'skipped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'skipped': return '⏭️';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchWorkflow}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Approval Workflow</h3>
        <p className="text-gray-600 mb-4">No approval workflow found for this SOW.</p>
        <button
          onClick={handleSubmitForApproval}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit for Approval'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Approval Workflow</h3>
        {workflow.is_complete && (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            ✅ Complete
          </span>
        )}
      </div>

      {/* Current Stage */}
      {workflow.current_stage && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2 text-sm">Current Stage: {workflow.current_stage.name}</h4>
          {workflow.current_stage.description && (
            <p className="text-blue-700 text-xs mb-2">{workflow.current_stage.description}</p>
          )}
          
          {workflow.can_approve && showApprovalActions && (
            <div className="space-y-3">
              {workflow.current_stage.requires_comment && (
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Comments required for this stage..."
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  rows={3}
                />
              )}
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    const approvalId = workflow.approvals.find(a => a.stage_id === workflow.current_stage?.id)?.id;
                    if (approvalId) {
                      handleApprovalAction(approvalId, 'approve');
                    }
                  }}
                  disabled={submitting || (workflow.current_stage?.requires_comment && !approvalComments.trim())}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs"
                >
                  {submitting ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => {
                    const approvalId = workflow.approvals.find(a => a.stage_id === workflow.current_stage?.id)?.id;
                    if (approvalId) {
                      handleApprovalAction(approvalId, 'reject');
                    }
                  }}
                  disabled={submitting || (workflow.current_stage?.requires_comment && !approvalComments.trim())}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs"
                >
                  {submitting ? 'Processing...' : 'Reject'}
                </button>
                {workflow.can_skip && (
                  <button
                    onClick={() => {
                      const approvalId = workflow.approvals.find(a => a.stage_id === workflow.current_stage?.id)?.id;
                      if (approvalId) {
                        handleApprovalAction(approvalId, 'skip');
                      }
                    }}
                    disabled={submitting}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-xs"
                  >
                    {submitting ? 'Processing...' : 'Skip'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approval Stages */}
      <div className="mb-4">
        <h4 className="font-medium mb-2 text-sm">Approval Stages</h4>
        <div className="space-y-2">
                      {workflow.approvals.map((approval) => (
              <div
                key={approval.id}
                className={`p-2 border rounded-lg ${
                  approval.stage_id === workflow.current_stage?.id
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getStatusIcon(approval.status)}</span>
                    <div>
                      <h5 className="font-medium text-sm">{approval.stage?.name}</h5>
                      {approval.stage?.description && (
                        <p className="text-xs text-gray-600">{approval.stage.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className={`px-1 py-0.5 rounded-full text-xs font-medium ${getStatusColor(approval.status)}`}>
                      {approval.status}
                    </span>
                    {approval.approver && (
                      <span className="text-xs text-gray-500">
                        by {approval.approver.name}
                      </span>
                    )}
                  </div>
                </div>
              
              {approval.comments && (
                <div className="mt-1 p-1 bg-gray-50 rounded text-xs">
                  <strong>Comments:</strong> {approval.comments}
                </div>
              )}
              
              {approval.approved_at && (
                <div className="mt-1 text-xs text-gray-500">
                  Approved: {new Date(approval.approved_at).toLocaleDateString()}
                </div>
              )}
              {approval.rejected_at && (
                <div className="mt-1 text-xs text-gray-500">
                  Rejected: {new Date(approval.rejected_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Comments Section */}
      <div className="mb-4">
        <h4 className="font-medium mb-2 text-sm">Comments</h4>
        
        {/* Add Comment */}
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full p-1 border border-gray-300 rounded-md text-xs mb-2"
            rows={2}
          />
          <div className="flex justify-end">
            <button
              onClick={handleAddComment}
              disabled={submitting || !newComment.trim()}
              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-xs"
            >
              {submitting ? 'Adding...' : 'Add Comment'}
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-2">
          {workflow.comments
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              onReply={(commentId) => setReplyingTo(commentId)}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyText={replyText}
              setReplyText={setReplyText}
              onSubmitReply={handleAddReply}
              submitting={submitting}
            />
          ))}
          
          {workflow.comments.length === 0 && (
            <p className="text-gray-500 text-xs italic">No comments yet.</p>
          )}
        </div>
      </div>
    </div>
  );
} 