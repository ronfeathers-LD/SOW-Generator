'use client';

import { useState } from 'react';

interface SimpleApprovalProps {
  sowId: string;
  sowTitle: string;
  clientName: string;
  onStatusChange: () => void;
}

export default function SimpleApproval({ sowId, sowTitle, clientName, onStatusChange }: SimpleApprovalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState('');

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !comments.trim()) {
      alert('Please provide comments when rejecting a SOW.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/sow/${sowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          updated_at: new Date().toISOString(),
          approval_comments: comments.trim() || null,
          approved_at: action === 'approve' ? new Date().toISOString() : null,
          rejected_at: action === 'reject' ? new Date().toISOString() : null
        }),
      });

      if (response.ok) {
        const actionText = action === 'approve' ? 'approved' : 'rejected';
        alert(`SOW ${actionText} successfully!`);
        onStatusChange();
      } else {
        const error = await response.text();
        alert(`Failed to ${action} SOW: ${error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing SOW:`, error);
      alert(`Failed to ${action} SOW`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">SOW Approval</h3>
      
      <div className="mb-4">
        <p className="text-gray-600 mb-2">
          <strong>SOW:</strong> {sowTitle}
        </p>
        <p className="text-gray-600 mb-2">
          <strong>Client:</strong> {clientName}
        </p>
        <p className="text-blue-600 text-sm">
          This SOW is currently under review and ready for approval.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Only Managers and Admins can approve or reject SOWs.
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
          Comments (required for rejection)
        </label>
        <textarea
          id="comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Add any comments about this SOW..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          rows={3}
        />
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => handleApproval('approve')}
          disabled={isSubmitting}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Approving...' : '✅ Approve SOW'}
        </button>
        
        <button
          onClick={() => handleApproval('reject')}
          disabled={isSubmitting || !comments.trim()}
          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Rejecting...' : '❌ Reject SOW'}
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        <p>• Approval will mark the SOW as approved and ready for client signature</p>
        <p>• Rejection requires comments and will return the SOW to draft status</p>
      </div>
    </div>
  );
}
