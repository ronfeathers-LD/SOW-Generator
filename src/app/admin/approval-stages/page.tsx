'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';



interface ApprovalStage {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  requires_comment: boolean;
  assigned_role?: string;
}

export default function ApprovalStagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stages, setStages] = useState<ApprovalStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/api/auth/signin');
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch approval stages
      const stagesResponse = await fetch('/api/admin/approval-stages');
      if (stagesResponse.ok) {
        const stagesData = await stagesResponse.json();
        setStages(stagesData);
      }


    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStageAssignment = async (stageId: string, assignedRole: string | null) => {
    try {
      setUpdating(stageId);
      
      const response = await fetch('/api/admin/approval-stages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stageId,
          assignedRole
        }),
      });

      if (response.ok) {
        await fetchData(); // Refresh data
      } else {
        console.error('Failed to update stage assignment');
      }
    } catch (error) {
      console.error('Error updating stage assignment:', error);
    } finally {
      setUpdating(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Approval Stage Assignments</h1>
          <p className="mt-2 text-gray-600">Assign users to approval stages. Only users with Manager, Director, VP, or Admin roles can be assigned.</p>
        </div>

        {/* Role Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Approval Workflow</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Manager Approval:</strong> First level approval (required)</li>
                  <li><strong>Director Approval:</strong> Final approval (required after Manager)</li>
                  <li><strong>VP Approval:</strong> Optional approval (bypasses all others if approved)</li>
                </ul>
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800">
                    <strong>Flow:</strong> Manager → Director (required) OR VP (bypasses all)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-6">
              {stages.map((stage) => (
                <div key={stage.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{stage.name}</h3>
                      <p className="text-sm text-gray-500">{stage.description}</p>
                      {stage.requires_comment && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                          Comments Required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Assigned Role:</span>
                        <select
                          value={stage.assigned_role || ''}
                          onChange={(e) => updateStageAssignment(stage.id, e.target.value || null)}
                          disabled={updating === stage.id}
                          className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">No assignment</option>
                          <option value="manager">Manager</option>
                          <option value="director">Director</option>
                          <option value="vp">VP</option>
                        </select>
                        {updating === stage.id && (
                          <span className="text-sm text-gray-500">Updating...</span>
                        )}
                      </div>
                      {stage.assigned_role && (
                        <div className="text-sm text-gray-600">
                          Currently: {stage.assigned_role.charAt(0).toUpperCase() + stage.assigned_role.slice(1)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
