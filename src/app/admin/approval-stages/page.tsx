'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
}

interface ApprovalStage {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  requires_comment: boolean;
  assigned_user_id?: string;
  assigned_user?: User;
}

export default function ApprovalStagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stages, setStages] = useState<ApprovalStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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

      // Fetch users
      const usersResponse = await fetch('/api/admin/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStageAssignment = async (stageId: string, assignedUserId: string | null) => {
    try {
      setUpdating(stageId);
      
      const response = await fetch('/api/admin/approval-stages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stageId,
          assignedUserId
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
          <p className="mt-2 text-gray-600">Assign users to approval stages</p>
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
                        <span className="text-sm text-gray-500">Assigned to:</span>
                        <select
                          value={stage.assigned_user_id || ''}
                          onChange={(e) => updateStageAssignment(stage.id, e.target.value || null)}
                          disabled={updating === stage.id}
                          className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">No assignment</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>
                        {updating === stage.id && (
                          <span className="text-sm text-gray-500">Updating...</span>
                        )}
                      </div>
                      {stage.assigned_user && (
                        <div className="text-sm text-gray-600">
                          Currently: {stage.assigned_user.name}
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
