'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SOW {
  id: string;
  client_name: string;
  sow_title: string;
  start_date: string | Date | null;
  status: string;
  created_at: string | Date;
  updated_at: string | Date;
}

export default function SOWListPage() {
  const [sows, setSows] = useState<SOW[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSOWs = async () => {
      try {
        console.log('Fetching SOWs...');
        const response = await fetch('/api/sow');
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Response error text:', errorText);
          throw new Error(`Failed to fetch SOWs: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('SOWs data received:', data);
        console.log('Data length:', data.length);
        setSows(data);
      } catch (err) {
        console.error('Error fetching SOWs:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    fetchSOWs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SOW? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/sow/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete SOW');
      }

      // Remove the deleted SOW from the list
      setSows(sows.filter(sow => sow.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete SOW');
    } finally {
      setDeletingId(null);
    }
  };

  console.log('Component render - loading:', loading, 'error:', error, 'sows length:', sows?.length);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Statements of Work</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all Statements of Work in the system.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              href="/sow/new"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              Create New SOW
            </Link>
          </div>
        </div>
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Client Name
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Project Name
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Start Date
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Created
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {sows && sows.length > 0 ? (
                      sows.map((sow) => (
                        <tr key={sow.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {sow.client_name || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {sow.sow_title || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {(() => {
                              try {
                                if (sow.start_date && sow.start_date !== '1970-01-01T00:00:00.000Z') {
                                  return new Date(sow.start_date).toLocaleDateString();
                                }
                                return 'N/A';
                              } catch (error) {
                                console.error('Error parsing start_date:', error, sow.start_date);
                                return 'N/A';
                              }
                            })()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {sow.status}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {(() => {
                              try {
                                if (sow.created_at) {
                                  const date = new Date(sow.created_at);
                                  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                                }
                                return 'N/A';
                              } catch (error) {
                                console.error('Error parsing created_at:', error, sow.created_at);
                                return 'N/A';
                              }
                            })()}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex justify-end space-x-2">
                              <Link
                                href={`/sow/${sow.id}`}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View
                              </Link>
                              <Link
                                href={`/sow/${sow.id}/edit`}
                                className="text-green-600 hover:text-green-900"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => handleDelete(sow.id)}
                                disabled={deletingId === sow.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {deletingId === sow.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                          No SOWs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 