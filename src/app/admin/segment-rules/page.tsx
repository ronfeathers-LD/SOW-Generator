'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { SegmentRuleRow } from '@/lib/segment-rules';

interface DraftFields {
  display_name: string;
  pm_removal_self_serve: boolean;
  extra_hours: number;
}

export default function SegmentRulesAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [rules, setRules] = useState<SegmentRuleRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftFields>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.role !== 'admin') {
      router.push('/admin');
      return;
    }
    fetchRules();
  }, [session, router]);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/admin/segment-rules');
      if (response.ok) {
        const data: SegmentRuleRow[] = await response.json();
        setRules(data);
        const nextDrafts: Record<string, DraftFields> = {};
        for (const row of data) {
          nextDrafts[row.id] = {
            display_name: row.display_name,
            pm_removal_self_serve: row.pm_removal_self_serve,
            extra_hours: row.extra_hours,
          };
        }
        setDrafts(nextDrafts);
      } else {
        setError('Failed to fetch segment rules');
      }
    } catch {
      setError('Error fetching segment rules');
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (id: string, changes: Partial<DraftFields>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...changes },
    }));
  };

  const handleSave = async (row: SegmentRuleRow) => {
    const draft = drafts[row.id];
    if (!draft) return;
    setSavingId(row.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/segment-rules/${row.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: draft.display_name,
          pm_removal_self_serve: draft.pm_removal_self_serve,
          extra_hours: draft.extra_hours,
        }),
      });

      if (response.ok) {
        await fetchRules();
      } else {
        const errorText = await response.text();
        setError(`Failed to save segment rule: ${errorText}`);
      }
    } catch {
      setError('Error saving segment rule');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading segment rules...</p>
        </div>
      </div>
    );
  }

  if (!session?.user?.role || session.user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Segment Rules</h1>
              <p className="mt-2 text-gray-600">
                Manage segment-specific behavior for SOW pricing and PM-hours removal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Explainer */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 text-sm text-blue-700">
              These rules drive segment-specific behavior: self-serve PM-hours removal (vs PMO approval)
              and bonus project hours. Changes take effect the next time a SOW form loads — no deploy needed.
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rules Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Segment Rules ({rules.length})</h3>
          </div>

          {rules.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No segment rules configured
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Self-serve PM Removal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Extra Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rules.map((row) => {
                    const draft = drafts[row.id] ?? {
                      display_name: row.display_name,
                      pm_removal_self_serve: row.pm_removal_self_serve,
                      extra_hours: row.extra_hours,
                    };
                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{row.segment}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={draft.display_name}
                            onChange={(e) => updateDraft(row.id, { display_name: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={draft.pm_removal_self_serve}
                            onChange={(e) => updateDraft(row.id, { pm_removal_self_serve: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={draft.extra_hours}
                            onChange={(e) => updateDraft(row.id, { extra_hours: parseInt(e.target.value, 10) || 0 })}
                            className="block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleSave(row)}
                            disabled={savingId === row.id}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {savingId === row.id ? 'Saving…' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
