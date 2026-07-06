'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SOWData } from '@/types/sow';
import { getContentTemplate } from '@/lib/sow-content';
import { createAllContentHandlers } from '@/lib/utils/contentHandlers';
import TipTapEditor from '../TipTapEditor';

interface ContentEditingTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
}

const ContentEditingTab = React.memo(function ContentEditingTab({ formData, setFormData }: ContentEditingTabProps) {

  // Original templates from database (never change)
  const [originalIntroTemplate, setOriginalIntroTemplate] = useState<string>('');
  const [originalScopeTemplate, setOriginalScopeTemplate] = useState<string>('');
  const [originalOutOfScopeTemplate, setOriginalOutOfScopeTemplate] = useState<string>('');
  const [originalObjectivesDisclosureTemplate, setOriginalObjectivesDisclosureTemplate] = useState<string>('');
  const [originalAssumptionsTemplate, setOriginalAssumptionsTemplate] = useState<string>('');
  const [originalProjectPhasesTemplate, setOriginalProjectPhasesTemplate] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [activeSection, setActiveSection] = useState('intro');
  const [initializedSections, setInitializedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadTemplates() {
      try {
        // Load templates for reference and reset functionality only
        const intro = await getContentTemplate('intro');
        if (intro) {
          setOriginalIntroTemplate(intro.default_content);
        }

        const scope = await getContentTemplate('scope');
        if (scope) {
          setOriginalScopeTemplate(scope.default_content);
        }

        const outOfScope = await getContentTemplate('out-of-scope');
        if (outOfScope) {
          setOriginalOutOfScopeTemplate(outOfScope.default_content);
        }

        const objectivesDisclosure = await getContentTemplate('objectives-disclosure');
        if (objectivesDisclosure) {
          setOriginalObjectivesDisclosureTemplate(objectivesDisclosure.default_content);
        }

        const assumptions = await getContentTemplate('assumptions');
        if (assumptions) {
          setOriginalAssumptionsTemplate(assumptions.default_content);
        }

        const projectPhases = await getContentTemplate('project-phases');
        if (projectPhases) {
          setOriginalProjectPhasesTemplate(projectPhases.default_content);
        }

      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    }

    loadTemplates();
  }, []); // Only run once when component mounts

  // Mark section as initialized when it becomes active
  useEffect(() => {
    if (!loading && !initializing && activeSection) {
      setInitializedSections(prev => {
        const newSet = new Set(prev);
        newSet.add(activeSection);
        return newSet;
      });
    }
  }, [activeSection, loading, initializing]);

  // Function to normalize content for comparison (removes HTML tags and normalizes whitespace)
  const normalizeContent = (content: string): string => {
    if (!content) return '';
    // Remove HTML tags and normalize whitespace
    return content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  };

  // Memoize the initialization logic to prevent unnecessary recalculations
  const initializationUpdates = useMemo(() => {
    if (!loading && !initializing && formData.id) {
      const updates: Partial<SOWData> = {};

      if (!formData.custom_intro_content && originalIntroTemplate) {
        updates.custom_intro_content = originalIntroTemplate;
      }

      if (!formData.custom_scope_content && originalScopeTemplate) {
        updates.custom_scope_content = originalScopeTemplate;
      }

      if (!formData.custom_out_of_scope_content && originalOutOfScopeTemplate) {
        updates.custom_out_of_scope_content = originalOutOfScopeTemplate;
      }

      if (!formData.custom_objectives_disclosure_content && originalObjectivesDisclosureTemplate) {
        updates.custom_objectives_disclosure_content = originalObjectivesDisclosureTemplate;
      }

      if (!formData.custom_assumptions_content && originalAssumptionsTemplate) {
        updates.custom_assumptions_content = originalAssumptionsTemplate;
      }

      if (!formData.custom_project_phases_content && originalProjectPhasesTemplate) {
        updates.custom_project_phases_content = originalProjectPhasesTemplate;
      }


      return updates;
    }
    return {};
  }, [loading, initializing, formData.id, formData.custom_intro_content, formData.custom_scope_content, formData.custom_out_of_scope_content, formData.custom_objectives_disclosure_content, formData.custom_assumptions_content, formData.custom_project_phases_content, originalIntroTemplate, originalScopeTemplate, originalOutOfScopeTemplate, originalObjectivesDisclosureTemplate, originalAssumptionsTemplate, originalProjectPhasesTemplate]);

  // Initialize form fields with default templates if no custom content exists
  useEffect(() => {
    if (Object.keys(initializationUpdates).length > 0) {
      console.log('Initializing form fields with default templates:', initializationUpdates);
      setFormData({ ...formData, ...initializationUpdates });
    }
  }, [initializationUpdates, setFormData, formData]);

  // Create all content handlers using the factory. All mutations (edits and
  // resets) go through `setFormData` only, which the parent wires to
  // `updateFormData` — that marks the form dirty and the global autosave
  // loop in SOWForm persists it. There is no per-section save here anymore.
  const templates = {
    originalIntroTemplate,
    originalScopeTemplate,
    originalOutOfScopeTemplate,
    originalObjectivesDisclosureTemplate,
    originalAssumptionsTemplate,
    originalProjectPhasesTemplate,
  };

  const context = {
    initializing,
    initializedSections,
    templates,
    formData,
    setFormData,
    normalizeContent,
  };

  const { handlers, resetHandlers } = createAllContentHandlers(context);

  // Destructure the handlers for easy access
  const {
    handleIntroContentChange,
    handleScopeContentChange,
    handleObjectivesDisclosureContentChange,
    handleAssumptionsContentChange,
    handleProjectPhasesContentChange,
    handleOutOfScopeContentChange
  } = handlers;

  const {
    resetIntroContent,
    resetScopeContent,
    resetObjectivesDisclosureContent,
    resetAssumptionsContent,
    resetProjectPhasesContent,
    resetOutOfScopeContent
  } = resetHandlers;

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

  const sections = [
    { id: 'intro', name: 'Introduction', icon: '📝' },
    { id: 'objectives-disclosure', name: 'Objectives', icon: '📋' },
    { id: 'scope', name: 'Scope', icon: '🎯' },
    { id: 'out-of-scope', name: 'Out of Scope', icon: '🚫' },
    { id: 'project-phases', name: 'Project Phases', icon: '📅' },
    { id: 'assumptions', name: 'Assumptions', icon: '⚠️' },
  ];

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'intro':
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Introduction</h3>
              <div className="flex items-center space-x-2">
                {formData.intro_content_edited && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    Customized
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetIntroContent}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reset to Default
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="mt-2 text-sm text-gray-500">
                NOTE: the variable {'{clientName}'} will be replaced with the actual client name.
              </p>
              <TipTapEditor
                value={formData.custom_intro_content || ''}
                onChange={handleIntroContentChange}
                placeholder="Enter the introduction content for this SOW..."
                initializing={initializing}
              />
            </div>

            {formData.intro_content_edited && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This content has been customized from the default template and will be flagged during approval.
                </p>
              </div>
            )}
          </div>
        );

      case 'scope':
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Scope</h3>
              <div className="flex items-center space-x-2">
                {formData.scope_content_edited && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    Customized
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetScopeContent}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reset to Default
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Customize the scope content for this SOW. This will override the default template.
              </p>
            </div>

            <div className="mb-4">
              <p className="mt-2 text-sm text-gray-500">
                NOTE: {'{deliverables}'} is a placeholder which will be replaced with the actual deliverables list.
              </p>
              <TipTapEditor
                value={formData.custom_scope_content || ''}
                onChange={handleScopeContentChange}
                placeholder="Enter the scope content for this SOW..."
                initializing={initializing}
              />
            </div>

            {formData.scope_content_edited && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This content has been customized from the default template and will be flagged during approval.
                </p>
              </div>
            )}
          </div>
        );

      case 'out-of-scope':
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Out of Scope</h3>
              <div className="flex items-center space-x-2">
                {formData.out_of_scope_content_edited && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    Customized
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetOutOfScopeContent}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reset to Default
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Customize the out of scope content for this SOW. This will override the default template.
              </p>
            </div>

            <TipTapEditor
              value={formData.custom_out_of_scope_content || ''}
              onChange={handleOutOfScopeContentChange}
              placeholder="Enter the out of scope content for this SOW..."
              initializing={initializing}
            />

            {formData.out_of_scope_content_edited && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This content has been customized from the default template and will be flagged during approval.
                </p>
              </div>
            )}
          </div>
        );

      case 'objectives-disclosure':
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Objectives</h3>
              <div className="flex items-center space-x-2">
                {formData.objectives_disclosure_content_edited && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    Customized
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetObjectivesDisclosureContent}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reset to Default
                </button>
              </div>
            </div>

            <div className="mb-4">
              <TipTapEditor
                value={formData.custom_objectives_disclosure_content || ''}
                onChange={handleObjectivesDisclosureContentChange}
                placeholder="Enter the objectives disclosure content for this SOW..."
                initializing={initializing}
              />
              <p className="mt-2 text-sm text-gray-500">
                This content outlines the objectives and disclosure information for the project.
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
        );

      case 'assumptions':
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Assumptions</h3>
              <div className="flex items-center space-x-2">
                {formData.assumptions_content_edited && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    Customized
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetAssumptionsContent}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reset to Default
                </button>
              </div>
            </div>

            <div className="mb-4">
              <TipTapEditor
                value={formData.custom_assumptions_content || ''}
                onChange={handleAssumptionsContentChange}
                placeholder="Enter the assumptions content for this SOW..."
                initializing={initializing}
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
        );

      case 'project-phases':
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Project Phases</h3>
              <div className="flex items-center space-x-2">
                {formData.project_phases_content_edited && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    Customized
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetProjectPhasesContent}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reset to Default
                </button>
              </div>
            </div>

            <div className="mb-4">
              <TipTapEditor
                value={formData.custom_project_phases_content || ''}
                onChange={handleProjectPhasesContentChange}
                placeholder="Enter the project phases content for this SOW..."
                initializing={initializing}
              />
              <p className="mt-2 text-sm text-yellow-800">
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
        );


      default:
        return <div>Section not found</div>;
    }
  };

  return (
    <div className="flex gap-6">
      {/* Left Navigation */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Content Sections</h3>
          <div className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveSection(section.id);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <span className="mr-2">{section.icon}</span>
                    <span>{section.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {formData[`${section.id.replace(/-/g, '_')}_content_edited` as keyof SOWData] && (
                      <span className="text-yellow-600 text-xs" title="Content has been edited">
                        ✏️
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {renderSection(activeSection)}

        {/* Information Panel */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">About Content Editing</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Default content is loaded from admin-managed templates</li>
            <li>• Any changes to the default content will be flagged during approval</li>
            <li>• Use placeholders like {'{clientName}'} and {'{deliverables}'} for dynamic content</li>
            <li>• You can reset to the default template at any time</li>
            <li>• Changes are saved automatically as you type</li>
          </ul>
        </div>
      </div>
    </div>
  );
});

export default ContentEditingTab;
