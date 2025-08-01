'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import WYSIWYGEditor from '@/components/WYSIWYGEditor';

interface AIPrompt {
  id: string;
  name: string;
  description: string;
  prompt_content: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function AIPromptsAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt_content: '',
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    if (session?.user?.role !== 'admin') {
      router.push('/admin');
      return;
    }
    fetchPrompts();
  }, [session, router]);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/admin/ai-prompts');
      if (response.ok) {
        const data = await response.json();
        setPrompts(data);
      } else {
        setError('Failed to fetch AI prompts');
      }
    } catch (err) {
      setError('Error fetching AI prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPrompt 
        ? `/api/admin/ai-prompts/${editingPrompt.id}`
        : '/api/admin/ai-prompts';
      
      const method = editingPrompt ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsModalOpen(false);
        setEditingPrompt(null);
        setFormData({ name: '', description: '', prompt_content: '', is_active: true, sort_order: 0 });
        fetchPrompts();
      } else {
        setError('Failed to save AI prompt');
      }
    } catch (err) {
      setError('Error saving AI prompt');
    }
  };

  const handleEdit = (prompt: AIPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      description: prompt.description,
      prompt_content: prompt.prompt_content,
      is_active: prompt.is_active,
      sort_order: prompt.sort_order
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI prompt?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/ai-prompts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPrompts();
      } else {
        setError('Failed to delete AI prompt');
      }
    } catch (err) {
      setError('Error deleting AI prompt');
    }
  };

  const openNewPromptModal = () => {
    setEditingPrompt(null);
    setFormData({ name: '', description: '', prompt_content: '', is_active: true, sort_order: 0 });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Prompts Management</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage the AI prompts used for generating SOW content
            </p>
          </div>
          <button
            onClick={openNewPromptModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add AI Prompt
          </button>
        </div>

        {/* AI Prompts Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sort Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prompts.map((prompt) => (
                <tr key={prompt.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {prompt.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {prompt.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {prompt.sort_order}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      prompt.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {prompt.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(prompt)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(prompt.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingPrompt ? 'Edit AI Prompt' : 'Add New AI Prompt'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prompt Content
                    </label>
                    <div className="border border-gray-300 rounded-md">
                      <WYSIWYGEditor
                        value={formData.prompt_content}
                        onChange={(value) => setFormData({ ...formData, prompt_content: value })}
                        placeholder="Enter the AI prompt content here. Use {customerName} and {transcription} as placeholders..."
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Use {'{customerName}'} and {'{transcription}'} as placeholders in your prompt.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {editingPrompt ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 