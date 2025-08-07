'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface LeanDataSignatory {
  id: string;
  name: string;
  email: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Database field names (snake_case)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function LeanDataSignatoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [signatories, setSignatories] = useState<LeanDataSignatory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    title: '',
    isActive: true
  });

  // Check admin access
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/api/auth/signin');
      return;
    }

    if (session.user?.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchSignatories();
  }, [session, status, router]);

  const fetchSignatories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/leandata-signatories');
      
      if (!response.ok) {
        throw new Error('Failed to fetch signatories');
      }

      const data = await response.json();
      setSignatories(data);
    } catch (error) {
      console.error('Error fetching signatories:', error);
      setError('Failed to load signatories');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      title: '',
      isActive: true
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.title.trim()) {
      setError('Name, email, and title are required');
      return;
    }

    try {
      setError(null);
      const url = editingId 
        ? `/api/admin/leandata-signatories/${editingId}`
        : '/api/admin/leandata-signatories';
      
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save signatory');
      }

      await fetchSignatories();
      resetForm();
    } catch (error) {
      console.error('Error saving signatory:', error);
      setError(error instanceof Error ? error.message : 'Failed to save signatory');
    }
  };

  const handleEdit = (signatory: LeanDataSignatory) => {
    setFormData({
      name: signatory.name,
      email: signatory.email,
      title: signatory.title,
              isActive: signatory.is_active
    });
    setEditingId(signatory.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this signatory?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/leandata-signatories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete signatory');
      }

      await fetchSignatories();
    } catch (error) {
      console.error('Error deleting signatory:', error);
      setError('Failed to delete signatory');
    }
  };

  const toggleActive = async (signatory: LeanDataSignatory) => {
    try {
      const response = await fetch(`/api/admin/leandata-signatories/${signatory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...signatory,
          isActive: !signatory.is_active
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update signatory');
      }

      await fetchSignatories();
    } catch (error) {
      console.error('Error updating signatory:', error);
      setError('Failed to update signatory');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">LeanData Signatories</h1>
          <p className="mt-2 text-gray-600">
            Manage who can sign contracts on behalf of LeanData
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* List Section */}
        <div className="bg-white shadow rounded-lg mb-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Current Signatories</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {signatories.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No signatories found. Add your first signatory using the form.
                  </div>
                ) : (
                  signatories.map((signatory) => (
                    <div key={signatory.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <h3 className="text-sm font-medium text-gray-900">
                                {signatory.name}
                              </h3>
                              <p className="text-sm text-gray-500">{signatory.email}</p>
                              <p className="text-sm text-gray-500">{signatory.title}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                signatory.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {signatory.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleActive(signatory)}
                            className={`px-3 py-1 text-xs rounded-md ${
                              signatory.is_active
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {signatory.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          
                          <button
                            onClick={() => handleEdit(signatory)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          
                          <button
                            onClick={() => handleDelete(signatory.id)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
        </div>

        {/* Form Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Signatory' : 'Add New Signatory'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="email@leandata.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g., VP Customer Success"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {editingId ? 'Update' : 'Add'} Signatory
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 