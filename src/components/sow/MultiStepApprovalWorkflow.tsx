'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ApprovalWorkflowDisplay from './ApprovalWorkflowDisplay';
import StageApprovalCard from './StageApprovalCard';
import SimpleApproval from './SimpleApproval';
import { ApprovalWorkflowStatus } from '@/types/sow';
import { canApproveStage } from '@/lib/utils/approval-permissions';

interface MultiStepApprovalWorkflowProps {
  sowId: string;
  sowTitle: string;
  clientName: string;
  showApproval: boolean;
  canApprove: boolean;
}

export default function MultiStepApprovalWorkflow({
  sowId,
  sowTitle,
  clientName,
  showApproval,
  canApprove
}: MultiStepApprovalWorkflowProps) {
  const [workflow, setWorkflow] = useState<ApprovalWorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  const fetchWorkflowStatus = async () => {
    try {
      const response = await fetch(`/api/sow/${sowId}/approvals`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if workflow is empty (no stages)
        if (!data || !data.all_stages || data.all_stages.length === 0) {
          // Empty workflow - try to initialize it
          try {
            const initResponse = await fetch(`/api/sow/${sowId}/approvals/initiate`, {
              method: 'POST'
            });
            if (initResponse.ok) {
              // Fetch again to get the new workflow
              const retryResponse = await fetch(`/api/sow/${sowId}/approvals`);
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                setWorkflow(retryData);
              }
            } else {
              console.error('Failed to initialize workflow:', await initResponse.text());
              setWorkflow(data); // Set the empty workflow as fallback
            }
          } catch (initError) {
            console.error('Error initializing workflow:', initError);
            setWorkflow(data); // Set the empty workflow as fallback
          }
        } else {
          setWorkflow(data);
        }
      } else if (response.status === 404) {
        // 404 - No workflow exists - try to initialize it
        try {
          const initResponse = await fetch(`/api/sow/${sowId}/approvals/initiate`, {
            method: 'POST'
          });
          if (initResponse.ok) {
            // Fetch again to get the new workflow
            const retryResponse = await fetch(`/api/sow/${sowId}/approvals`);
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              setWorkflow(retryData);
            }
          } else {
            console.error('Failed to initialize workflow:', await initResponse.text());
          }
        } catch (initError) {
          console.error('Error initializing workflow:', initError);
        }
      }
    } catch (error) {
      console.error('Error fetching workflow status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflowStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sowId]);

  const handleApproval = () => {
    // Refresh the workflow status after approval/rejection
    fetchWorkflowStatus();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-blue-600">This SOW is currently under review.</p>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // If no workflow exists, show simple approval as fallback
  if (!workflow) {
    return (
      <div className="space-y-4">
        <p className="text-blue-600">This SOW is currently under review.</p>
        {showApproval && canApprove && (
          <SimpleApproval
            sowId={sowId}
            sowTitle={sowTitle}
            clientName={clientName}
            onStatusChange={() => window.location.reload()}
          />
        )}
      </div>
    );
  }

  const userRole = session?.user?.role;

  // For parallel approval: find all pending stages that the current user can approve
  const pendingStagesUserCanApprove = workflow.all_stages.filter((stage) => {
    if (stage.status !== 'pending') return false;
    return canApproveStage(stage.stage?.name || '', userRole || '');
  });

  // Find pending stages user cannot approve (for display)
  const pendingStagesUserCannotApprove = workflow.all_stages.filter((stage) => {
    if (stage.status !== 'pending') return false;
    return !canApproveStage(stage.stage?.name || '', userRole || '');
  });

  return (
    <div className="space-y-6">
      <p className="text-blue-600">
        This SOW is currently under review. All required approvals can be completed in any order.
      </p>

      {/* Show workflow display for everyone */}
      <ApprovalWorkflowDisplay sowId={sowId} />

      {/* Show approval cards for all pending stages the user can approve (parallel approval) */}
      {pendingStagesUserCanApprove.length > 0 && (
        <div className="space-y-4">
          {pendingStagesUserCanApprove.map((stageApproval) => (
            <StageApprovalCard
              key={stageApproval.id}
              sowId={sowId}
              stageApproval={stageApproval}
              sowTitle={sowTitle}
              clientName={clientName}
              onApproval={handleApproval}
            />
          ))}
        </div>
      )}

      {/* Show waiting message for pending stages user cannot approve */}
      {pendingStagesUserCannotApprove.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 mb-2">
            <strong>Waiting for approval:</strong> The following stages are pending approval by others:
          </p>
          <ul className="list-disc list-inside space-y-1">
            {pendingStagesUserCannotApprove.map((stage) => (
              <li key={stage.id} className="text-xs text-yellow-700">
                {stage.stage?.name || 'Unknown stage'} - Required role: {getRequiredRoleForStage(stage.stage?.name || '')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Show message if no pending stages but user can't approve any */}
      {pendingStagesUserCanApprove.length === 0 && 
       pendingStagesUserCannotApprove.length === 0 && 
       workflow.completion_percentage < 100 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Review in progress:</strong> All required approvals are being processed.
          </p>
        </div>
      )}

      {/* Show info if all stages complete */}
      {workflow.completion_percentage === 100 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <strong>✓ All stages approved!</strong> This SOW is ready for client signature.
          </p>
        </div>
      )}
    </div>
  );
}

function getRequiredRoleForStage(stageName: string): string {
  switch (stageName) {
    case 'Professional Services':
      return 'PS Manager or Admin';
    case 'Project Management':
      return 'PMO or Admin';
    case 'Sr. Leadership':
      return 'Sr. Leadership or Admin';
    default:
      return 'Appropriate role';
  }
}

