'use client';

import { useState, useEffect, useCallback } from 'react';
import { PMHoursRequirementDisableRequest, PMHoursComment } from '@/types/sow';
import { useSession } from 'next-auth/react';

interface PMHoursRequirementDisableApprovalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  onStatusChange: () => void;
}

export default function PMHoursRequirementDisableApprovalOverlay({
  isOpen,
  onClose,
  requestId,
  onStatusChange
}: PMHoursRequirementDisableApprovalOverlayProps) {
  const { data: session } = useSession();
  const [request, setRequest] = useState<PMHoursRequirementDisableRequest | null>(null);
  const [comments, setComments] = useState<PMHoursComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRequest = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pm-hours-removal/${requestId}`);
      const data = await response.json();

      if (response.ok) {
        setRequest(data.request);
        setComments(data.comments || []);
      } else {
        setError(data.error || 'Failed to fetch request');
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      setError('Failed to fetch request');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (isOpen && requestId) {
      fetchRequest();
    }
  }, [isOpen, requestId, fetchRequest]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/pm-hours-removal/${requestId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: newComment.trim(),
          isInternal: false
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments([...comments, data.comment]);
        setNewComment('');
        // Refresh the request to get updated data
        fetchRequest();
      } else {
        setError('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!request) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/pm-hours-removal/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          comments: approvalComments.trim() || null
        }),
      });

      if (response.ok) {
        onStatusChange();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      setError('Failed to approve request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!request || !rejectionReason.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/pm-hours-removal/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject',
          reason: rejectionReason.trim()
        }),
      });

      if (response.ok) {
        onStatusChange();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      setError('Failed to reject request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading request...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <div className="text-center">
          <svg className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error || 'Request not found'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

          const hoursToRemove = request.hours_to_remove;
  const financialImpact = hoursToRemove * 250; // Assuming $250/hour PM rate

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              PM Hours Requirement Disable Request Review
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Request ID: {request.id.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Request Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Request Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current PM Hours:</span>
                  <span className="font-medium">{request.current_pm_hours} hours</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Hours to Remove:</span>
                  <span className="font-medium text-blue-600">{hoursToRemove} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Financial Impact:</span>
                  <span className="font-medium text-green-600">${financialImpact.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Request Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Created: {new Date(request.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Requester: {session?.user?.email}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span>Status: <span className="font-medium capitalize">{request.status}</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Reason for Disabling PM Hours Requirement</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">{request.reason}</p>
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Discussion ({comments.length} comments)
            </h3>
            
            {/* Comments List */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm text-gray-900">
                        {comment.user?.name || comment.user?.email || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{comment.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment or ask a question..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Approval/Rejection Actions */}
          {request.status === 'pending' && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-medium text-gray-900 mb-4">Decision</h3>
              
              {/* Approval Section */}
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="approvalComments" className="block text-sm font-medium text-gray-700 mb-2">
                    Approval Comments (optional)
                  </label>
                  <textarea
                    id="approvalComments"
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Add any comments about this approval..."
                  />
                </div>
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isSubmitting ? 'Approving...' : 'Approve Request'}
                </button>
              </div>

              {/* Rejection Section */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Please explain why this request is being rejected..."
                    required
                  />
                </div>
                <button
                  onClick={handleReject}
                  disabled={isSubmitting || !rejectionReason.trim()}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isSubmitting ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
