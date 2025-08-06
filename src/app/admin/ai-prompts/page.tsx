'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TipTapEditor from '@/components/TipTapEditor';

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Prompts Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            View and edit the AI prompt used for generating SOW content
          </p>
        </div>

        {/* Current AI Prompt Display */}
        {prompts.length > 0 ? (
          <div className="space-y-6">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{prompt.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{prompt.description}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        prompt.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {prompt.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-sm text-gray-500">Sort Order: {prompt.sort_order}</span>
                      <button
                        onClick={() => handleEdit(prompt)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Current Prompt Content:</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <div 
                      className="wysiwyg-content prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: prompt.prompt_content }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Use {'{customerName}'} and {'{transcription}'} as placeholders in your prompt.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-6 py-4">
              <p className="text-gray-500 text-center">No AI prompts found. Please create one to get started.</p>
            </div>
          </div>
        )}

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
                      <TipTapEditor
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