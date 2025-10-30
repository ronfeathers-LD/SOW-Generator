'use client';

import { useState } from 'react';
import { SOWApproval } from '@/types/sow';
import MentionAutocomplete from '@/components/ui/MentionAutocomplete';

interface StageApprovalCardProps {
  sowId: string;
  stageApproval: SOWApproval;
  sowTitle: string;
  clientName: string;
  onApproval: () => void;
}

export default function StageApprovalCard({
  sowId,
  stageApproval,
  sowTitle,
  clientName,
  onApproval
}: StageApprovalCardProps) {
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/sow/${sowId}/approvals/${stageApproval.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'approve',
            comments: comments.trim() || null
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Stage approved successfully!');
        onApproval();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to approve stage');
      }
    } catch (error) {
      console.error('Error approving stage:', error);
      setError('Failed to approve stage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      setError('Comments are required when rejecting');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/sow/${sowId}/approvals/${stageApproval.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'reject',
            comments: comments.trim()
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Stage rejected. SOW returned to draft.');
        onApproval();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reject stage');
      }
    } catch (error) {
      console.error('Error rejecting stage:', error);
      setError('Failed to reject stage');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 border-2 border-blue-500">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900">
          {stageApproval.stage?.name || 'Stage Approval'}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {stageApproval.stage?.description}
        </p>
      </div>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700 mb-2">
          <strong>SOW:</strong> {sowTitle}
        </p>
        <p className="text-sm text-gray-700">
          <strong>Client:</strong> {clientName}
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
          Comments {stageApproval.status === 'pending' && <span className="text-gray-500">(optional)</span>}
        </label>
        <MentionAutocomplete
          value={comments}
          onChange={setComments}
          placeholder="Add any comments about this SOW... Use @username to mention team members"
          className="w-full"
          rows={3}
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={handleApprove}
          disabled={isSubmitting}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Processing...' : '✓ Approve Stage'}
        </button>
        
        <button
          onClick={handleReject}
          disabled={isSubmitting}
          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Processing...' : '✗ Reject Stage'}
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>• Approval will move the SOW to the next stage</p>
        <p>• Rejection will return the SOW to draft for revisions</p>
      </div>
    </div>
  );
}

