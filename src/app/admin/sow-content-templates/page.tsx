'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SOWContentTemplate } from '@/types/sow';
import TipTapEditor from '@/components/TipTapEditor';

export default function SOWContentTemplatesPage() {
  const [templates, setTemplates] = useState<SOWContentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('intro');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Define the desired order of sections with metadata - memoized to prevent recreation
  const sections = useMemo(() => [
    { id: 'intro', name: 'Introduction', description: 'Opening content for the SOW' },
    { id: 'objectives-disclosure', name: 'Objectives', description: 'Disclosure about objectives' },
    { id: 'scope', name: 'Scope', description: 'Project scope and deliverables' },
    { id: 'out-of-scope', name: 'Out of Scope', description: 'What is not included in the project' },
    { id: 'project-phases', name: 'Project Phases', description: 'Detailed project phases and activities' },
    { id: 'roles', name: 'Roles and Responsibilities', description: 'Team roles and responsibilities' },
    { id: 'assumptions', name: 'Assumptions', description: 'Project assumptions and constraints' }
  ], []);

  const sectionOrder = useMemo(() => sections.map(s => s.id), [sections]);

  const sortTemplates = useCallback((templates: SOWContentTemplate[]) => {
    return templates.sort((a, b) => {
      const aIndex = sectionOrder.indexOf(a.section_name);
      const bIndex = sectionOrder.indexOf(b.section_name);
      
      // If both sections are in our defined order, sort by that
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one is in our defined order, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // If neither is in our defined order, sort alphabetically
      return a.section_name.localeCompare(b.section_name);
    });
  }, [sectionOrder]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sow-content-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(sortTemplates(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [sortTemplates]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSave = async (template: Partial<SOWContentTemplate>) => {
    setSaving(true);
    setError(null);
    
    try {
      const url = template.id 
        ? `/api/admin/sow-content-templates/${template.id}`
        : '/api/admin/sow-content-templates';
      
      const method = template.id ? 'PUT' : 'POST';
      
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

      const savedTemplate = await response.json();

      // Update local state immediately instead of refetching
      setTemplates(prevTemplates => {
        const existingIndex = prevTemplates.findIndex(t => t.id === savedTemplate.id);
        
        if (existingIndex >= 0) {
          // Update existing template
          const updated = [...prevTemplates];
          updated[existingIndex] = savedTemplate;
          return sortTemplates(updated);
        } else {
          // Add new template
          return sortTemplates([...prevTemplates, savedTemplate]);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const getCurrentTemplate = () => {
    return templates.find(t => t.section_name === activeSection);
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

      {/* Subnav */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {section.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Editor */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {sections.find(s => s.id === activeSection)?.name}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {sections.find(s => s.id === activeSection)?.description}
          </p>
        </div>
        
        <div className="p-6">
          <SectionEditor
            section={sections.find(s => s.id === activeSection)!}
            template={getCurrentTemplate()}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      </div>
    </div>
  );
}

interface SectionEditorProps {
  section: { id: string; name: string; description: string };
  template?: SOWContentTemplate;
  onSave: (template: Partial<SOWContentTemplate>) => void;
  saving: boolean;
}

function SectionEditor({ section, template, onSave, saving }: SectionEditorProps) {
  const [formData, setFormData] = useState<Partial<SOWContentTemplate>>({
    id: template?.id,
    section_name: section.id,
    section_title: section.name,
    description: section.description,
    default_content: template?.default_content || '',
    sort_order: template?.sort_order || 0,
    is_active: true,
  });

  // Update form data when template changes, but not during save
  useEffect(() => {
    if (!saving && template) {
      setFormData({
        id: template.id,
        section_name: section.id,
        section_title: section.name,
        description: section.description,
        default_content: template.default_content || '',
        sort_order: template.sort_order || 0,
        is_active: template.is_active ?? true,
      });
    }
  }, [template, section.id, section.name, section.description, saving]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content
        </label>
        <div className="mt-1">
          <TipTapEditor
            value={formData.default_content || ''}
            onChange={(value) => setFormData({ ...formData, default_content: value })}
            placeholder={`Enter the default content for ${section.name.toLowerCase()}...`}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          You can use the toolbar above to format your content with headers, bold text, lists, tables, and more.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {'{clientName}'} is resolved in the Introduction  and {'{deliverables}'} is for the Scope section.
        </p>
      </div>



      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : (template ? 'Update' : 'Create')} Template
        </button>
      </div>
    </form>
  );
} 