'use client';

import { useState, useEffect } from 'react';
import { SOWContentTemplate } from '@/types/sow';

export default function SOWContentTemplatesPage() {
  const [templates, setTemplates] = useState<SOWContentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<SOWContentTemplate | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/sow-content-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (template: Partial<SOWContentTemplate>) => {
    try {
      const url = editingTemplate 
        ? `/api/admin/sow-content-templates/${editingTemplate.id}`
        : '/api/admin/sow-content-templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      await fetchTemplates();
      setEditingTemplate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const toggleExpanded = (templateId: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
    }
    setExpandedTemplates(newExpanded);
  };





  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">SOW Content Templates</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Edit Form */}
      {editingTemplate && (
        <TemplateForm
          template={editingTemplate}
          onSave={handleSave}
          onCancel={() => {
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Templates List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Content Templates</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {templates.map((template) => (
            <div key={template.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {template.section_title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Section: {template.section_name}
                  </p>
                  {template.description && (
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  )}
                  
                  {/* Collapsible Content */}
                  <div className="mt-3">
                    <button
                      onClick={() => toggleExpanded(template.id)}
                      className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      <span>{expandedTemplates.has(template.id) ? 'Hide' : 'Show'} Full Content</span>
                      <svg
                        className={`ml-1 h-4 w-4 transform transition-transform ${
                          expandedTemplates.has(template.id) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {expandedTemplates.has(template.id) && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                          {template.default_content}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TemplateFormProps {
  template?: SOWContentTemplate | null;
  onSave: (template: Partial<SOWContentTemplate>) => void;
  onCancel: () => void;
}

function TemplateForm({ template, onSave, onCancel }: TemplateFormProps) {
  const [formData, setFormData] = useState({
    section_name: template?.section_name || '',
    section_title: template?.section_title || '',
    default_content: template?.default_content || '',
    description: template?.description || '',
    sort_order: template?.sort_order || 0,
    is_active: template?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {template ? 'Edit Template' : 'Create New Template'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Section Name
            </label>
            <input
              type="text"
              value={formData.section_name}
              onChange={(e) => setFormData({ ...formData, section_name: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., intro, scope"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Section Title
            </label>
            <input
              type="text"
              value={formData.section_title}
              onChange={(e) => setFormData({ ...formData, section_title: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Introduction Section"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Brief description of this template"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Default Content
          </label>
          <textarea
            value={formData.default_content}
            onChange={(e) => setFormData({ ...formData, default_content: e.target.value })}
            rows={8}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter the default content for this section..."
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Use {'{clientName}'} and {'{deliverables}'} as placeholders that will be replaced with actual values.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sort Order
            </label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            {template ? 'Update' : 'Create'} Template
          </button>
        </div>
      </form>
    </div>
  );
} 