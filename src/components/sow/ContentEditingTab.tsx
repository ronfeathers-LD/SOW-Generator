'use client';

import { useState, useEffect } from 'react';
import { SOWData } from '@/types/sow';
import { getContentTemplate, processIntroContent, processScopeContent } from '@/lib/sow-content';
import RichTextEditor from '../RichTextEditor';

interface ContentEditingTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
}

export default function ContentEditingTab({ formData, setFormData }: ContentEditingTabProps) {
  const [introTemplate, setIntroTemplate] = useState<string>('');
  const [scopeTemplate, setScopeTemplate] = useState<string>('');
  const [objectivesDisclosureTemplate, setObjectivesDisclosureTemplate] = useState<string>('');
  const [assumptionsTemplate, setAssumptionsTemplate] = useState<string>('');
  const [projectPhasesTemplate, setProjectPhasesTemplate] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTemplates() {
      try {
        // Load templates for reference and reset functionality only
        const intro = await getContentTemplate('intro');
        if (intro) {
          setIntroTemplate(intro.default_content);
        }

        const scope = await getContentTemplate('scope');
        if (scope) {
          setScopeTemplate(scope.default_content);
        }

        const objectivesDisclosure = await getContentTemplate('objectives-disclosure');
        if (objectivesDisclosure) {
          setObjectivesDisclosureTemplate(objectivesDisclosure.default_content);
        }

        const assumptions = await getContentTemplate('assumptions');
        if (assumptions) {
          setAssumptionsTemplate(assumptions.default_content);
        }

        const projectPhases = await getContentTemplate('project-phases');
        if (projectPhases) {
          setProjectPhasesTemplate(projectPhases.default_content);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []); // Only run once when component mounts

  const handleIntroContentChange = (content: string) => {
    // Check if content has been edited from the original template
    const isEdited = content !== introTemplate && content.trim() !== '';
    setFormData({
      ...formData,
      custom_intro_content: content,
      intro_content_edited: isEdited
    });
  };

  const handleScopeContentChange = (content: string) => {
    // Check if content has been edited from the original template
    const isEdited = content !== scopeTemplate && content.trim() !== '';
    setFormData({
      ...formData,
      custom_scope_content: content,
      scope_content_edited: isEdited
    });
  };

  const handleObjectivesDisclosureContentChange = (content: string) => {
    // Check if content has been edited from the original template
    const isEdited = content !== objectivesDisclosureTemplate && content.trim() !== '';
    setFormData({
      ...formData,
      custom_objectives_disclosure_content: content,
      objectives_disclosure_content_edited: isEdited
    });
  };

  const resetIntroContent = () => {
    setFormData({
      ...formData,
      custom_intro_content: introTemplate,
      intro_content_edited: false
    });
  };

  const resetScopeContent = () => {
    setFormData({
      ...formData,
      custom_scope_content: scopeTemplate,
      scope_content_edited: false
    });
  };

  const resetObjectivesDisclosureContent = () => {
    setFormData({
      ...formData,
      custom_objectives_disclosure_content: objectivesDisclosureTemplate,
      objectives_disclosure_content_edited: false
    });
  };

  const handleAssumptionsContentChange = (content: string) => {
    // Check if content has been edited from the original template
    const isEdited = content !== assumptionsTemplate && content.trim() !== '';
    setFormData({
      ...formData,
      custom_assumptions_content: content,
      assumptions_content_edited: isEdited
    });
  };

  const resetAssumptionsContent = () => {
    setFormData({
      ...formData,
      custom_assumptions_content: assumptionsTemplate,
      assumptions_content_edited: false
    });
  };

  const handleProjectPhasesContentChange = (content: string) => {
    // Check if content has been edited from the original template
    const isEdited = content !== projectPhasesTemplate && content.trim() !== '';
    setFormData({
      ...formData,
      custom_project_phases_content: content,
      project_phases_content_edited: isEdited
    });
  };

  const resetProjectPhasesContent = () => {
    setFormData({
      ...formData,
      custom_project_phases_content: projectPhasesTemplate,
      project_phases_content_edited: false
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Introduction Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Introduction Section</h3>
          {formData.intro_content_edited && (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                Customized
              </span>
              <button
                type="button"
                onClick={resetIntroContent}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Reset to Default
              </button>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Introduction Content
          </label>
          <RichTextEditor
            value={formData.custom_intro_content || ''}
            onChange={handleIntroContentChange}
            placeholder="Enter the introduction content for this SOW..."
          />
          <p className="mt-2 text-sm text-gray-500">
            Use {'{clientName}'} as a placeholder that will be replaced with the actual client name.
          </p>
        </div>

        {formData.intro_content_edited && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This content has been customized from the default template and will be flagged during approval.
            </p>
          </div>
        )}
      </div>

      {/* Scope Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Scope Section</h3>
          {formData.scope_content_edited && (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                Customized
              </span>
              <button
                type="button"
                onClick={resetScopeContent}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Reset to Default
              </button>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scope Content
          </label>
          <RichTextEditor
            value={formData.custom_scope_content || ''}
            onChange={handleScopeContentChange}
            placeholder="Enter the scope content for this SOW..."
          />
          <p className="mt-2 text-sm text-gray-500">
            Use {'{deliverables}'} as a placeholder that will be replaced with the actual deliverables list.
          </p>
        </div>

        {formData.scope_content_edited && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This content has been customized from the default template and will be flagged during approval.
            </p>
          </div>
        )}
      </div>

      {/* Objectives Disclosure Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Objectives Disclosure Section</h3>
          {formData.objectives_disclosure_content_edited && (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                Customized
              </span>
              <button
                type="button"
                onClick={resetObjectivesDisclosureContent}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Reset to Default
              </button>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Objectives Disclosure Content
          </label>
          <RichTextEditor
            value={formData.custom_objectives_disclosure_content || ''}
            onChange={handleObjectivesDisclosureContentChange}
            placeholder="Enter the objectives disclosure content for this SOW..."
          />
          <p className="mt-2 text-sm text-gray-500">
            This content explains responsibilities and assumptions for the project.
          </p>
        </div>

        {formData.objectives_disclosure_content_edited && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This content has been customized from the default template and will be flagged during approval.
            </p>
          </div>
        )}
      </div>

      {/* Assumptions Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Assumptions Section</h3>
          {formData.assumptions_content_edited && (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                Customized
              </span>
              <button
                type="button"
                onClick={resetAssumptionsContent}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Reset to Default
              </button>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assumptions Content
          </label>
          <RichTextEditor
            value={formData.custom_assumptions_content || ''}
            onChange={handleAssumptionsContentChange}
            placeholder="Enter the assumptions content for this SOW..."
          />
          <p className="mt-2 text-sm text-gray-500">
            This content outlines the assumptions and requirements for the project.
          </p>
        </div>

        {formData.assumptions_content_edited && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This content has been customized from the default template and will be flagged during approval.
            </p>
          </div>
        )}
      </div>

      {/* Project Phases Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Project Phases Section</h3>
          {formData.project_phases_content_edited && (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                Customized
              </span>
              <button
                type="button"
                onClick={resetProjectPhasesContent}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Reset to Default
              </button>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Phases Content
          </label>
          <RichTextEditor
            value={formData.custom_project_phases_content || ''}
            onChange={handleProjectPhasesContentChange}
            placeholder="Enter the project phases content for this SOW..."
          />
          <p className="mt-2 text-sm text-gray-500">
            This content displays the project phases, activities, and artifacts table.
          </p>
        </div>

        {formData.project_phases_content_edited && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This content has been customized from the default template and will be flagged during approval.
            </p>
          </div>
        )}
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">About Content Editing</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Default content is loaded from admin-managed templates</li>
          <li>• Any changes to the default content will be flagged during approval</li>
          <li>• Use placeholders like {'{clientName}'} and {'{deliverables}'} for dynamic content</li>
          <li>• You can reset to the default template at any time</li>
        </ul>
      </div>
    </div>
  );
} 