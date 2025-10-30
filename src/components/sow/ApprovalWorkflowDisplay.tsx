'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApprovalWorkflowStatus, SOWApproval } from '@/types/sow';

interface ApprovalWorkflowDisplayProps {
  sowId: string;
}

export default function ApprovalWorkflowDisplay({ sowId }: ApprovalWorkflowDisplayProps) {
  const [workflow, setWorkflow] = useState<ApprovalWorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflowStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/sow/${sowId}/approvals`);
      if (response.ok) {
        const data = await response.json();
        setWorkflow(data);
      } else {
        setError('Failed to load approval workflow');
      }
    } catch (error) {
      console.error('Error fetching workflow:', error);
      setError('Failed to load approval workflow');
    } finally {
      setLoading(false);
    }
  }, [sowId]);

  useEffect(() => {
    fetchWorkflowStatus();
  }, [fetchWorkflowStatus]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!workflow) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Approval Workflow</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Progress:</span>
          <span className="text-sm font-medium text-blue-600">
            {workflow.completion_percentage}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{workflow.completed_stages} of {workflow.total_stages} stages completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${workflow.completion_percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Stages List */}
      <div className="space-y-4">
        {workflow.all_stages.map((stageApproval, index) => (
          <StageItem
            key={stageApproval.id}
            stageApproval={stageApproval}
            index={index}
            isCurrent={stageApproval.id === workflow.current_stage?.id}
          />
        ))}
      </div>

      {/* Conditional PMO Note */}
      {!workflow.requires_pm_approval && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This SOW does not include PM hours, so PMO review is not required.
          </p>
        </div>
      )}
    </div>
  );
}

interface StageItemProps {
  stageApproval: SOWApproval;
  index: number;
  isCurrent: boolean;
}

function StageItem({ stageApproval, index, isCurrent }: StageItemProps) {
  const { stage, status, approver, approved_at, comments } = stageApproval;

  const getStatusBadge = () => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            ✓ Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            ✗ Rejected
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 animate-pulse">
            ⏳ Pending
          </span>
        );
      case 'not_started':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
            Not Started
          </span>
        );
      default:
        return null;
    }
  };

  const isHighlighted = isCurrent && status === 'pending';

  return (
    <div
      className={`border rounded-lg p-4 ${
        isHighlighted ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
            <div>
              <h4 className="font-semibold text-gray-900">{stage?.name || 'Unknown Stage'}</h4>
              {stage?.description && (
                <p className="text-sm text-gray-600">{stage.description}</p>
              )}
            </div>
          </div>

          {status === 'approved' && approver && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Approved by:</span> {approver.name}
              {approved_at && (
                <span className="ml-2">
                  on {new Date(approved_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {status === 'rejected' && (
            <div className="mt-2 text-sm text-red-600">
              <span className="font-medium">Rejected</span>
              {comments && (
                <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded">
                  {comments}
                </div>
              )}
            </div>
          )}

          {status === 'pending' && isCurrent && (
            <div className="mt-2 text-sm text-blue-600">
              <span className="font-medium">Awaiting your approval</span>
            </div>
          )}
        </div>

        <div className="ml-4">{getStatusBadge()}</div>
      </div>
    </div>
  );
}

