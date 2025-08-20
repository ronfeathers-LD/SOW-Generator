'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SOWData } from '@/types/sow';
import { getContentTemplate } from '@/lib/sow-content';
import { createAllContentHandlers } from '@/lib/utils/contentHandlers';
import TipTapEditor from '../TipTapEditor';
import LoadingModal from '../ui/LoadingModal';

interface ContentEditingTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  onUnsavedChanges?: (hasUnsavedChanges: boolean) => void;
}

export default function ContentEditingTab({ formData, setFormData, onUnsavedChanges }: ContentEditingTabProps) {

  // Original templates from database (never change)
  const [originalIntroTemplate, setOriginalIntroTemplate] = useState<string>('');
  const [originalScopeTemplate, setOriginalScopeTemplate] = useState<string>('');
  const [originalOutOfScopeTemplate, setOriginalOutOfScopeTemplate] = useState<string>('');
  const [originalObjectivesDisclosureTemplate, setOriginalObjectivesDisclosureTemplate] = useState<string>('');
  const [originalAssumptionsTemplate, setOriginalAssumptionsTemplate] = useState<string>('');
  const [originalProjectPhasesTemplate, setOriginalProjectPhasesTemplate] = useState<string>('');
  const [originalRolesTemplate, setOriginalRolesTemplate] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [activeSection, setActiveSection] = useState('intro');
  const [saving, setSaving] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<Record<string, 'success' | 'error' | null>>({});
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>({});
  const [initializedSections, setInitializedSections] = useState<Set<string>>(new Set());
  
  // Ref to track when we need to notify parent after save
  const shouldNotifyParent = useRef(false);

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

        const roles = await getContentTemplate('roles');
        if (roles) {
          setOriginalRolesTemplate(roles.default_content);
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

  // Function to clear all unsaved changes and notify parent
  const clearAllUnsavedChanges = useCallback(() => {
    setUnsavedChanges({});
    if (onUnsavedChanges) {
      onUnsavedChanges(false);
    }
  }, [onUnsavedChanges]);

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

  // Clear unsaved changes when initialization is complete
  useEffect(() => {
    if (!loading && !initializing) {
      // Clear any existing unsaved changes to start with a clean state
      clearAllUnsavedChanges();
    }
  }, [loading, initializing, clearAllUnsavedChanges]);

  // Function to normalize content for comparison (removes HTML tags and normalizes whitespace)
  const normalizeContent = (content: string): string => {
    if (!content) return '';
    // Remove HTML tags and normalize whitespace
    return content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  };

  // Function to check if a section has unsaved changes
  const checkUnsavedChanges = (sectionName: string, currentContent: string, templateContent: string) => {
    const normalizedCurrent = normalizeContent(currentContent);
    const normalizedTemplate = normalizeContent(templateContent);
    const hasChanges = normalizedCurrent !== normalizedTemplate && normalizedCurrent !== '';
    setUnsavedChanges(prev => ({ ...prev, [sectionName]: hasChanges }));
  };

  // Effect to notify parent about unsaved changes after state updates
  useEffect(() => {
    if (onUnsavedChanges && !loading && !initializing) {
      const anyUnsavedChanges = Object.values(unsavedChanges).some(Boolean);
      onUnsavedChanges(anyUnsavedChanges);
    }
  }, [unsavedChanges, onUnsavedChanges, loading, initializing]);

  // Effect to notify parent after successful save
  useEffect(() => {
    if (shouldNotifyParent.current && onUnsavedChanges) {
      onUnsavedChanges(false); // No unsaved changes after successful save
      shouldNotifyParent.current = false;
    }
  }, [unsavedChanges, onUnsavedChanges]);

  // Initialize form fields with default templates if no custom content exists
  useEffect(() => {
    if (!loading && !initializing && formData.id) {
      // Only initialize if we have templates and no existing custom content
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
      
      if (!formData.custom_roles_content && originalRolesTemplate) {
        updates.custom_roles_content = originalRolesTemplate;
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        console.log('Initializing form fields with default templates:', updates);
        setFormData({ ...formData, ...updates });
      }
    }
  }, [loading, initializing, formData, originalIntroTemplate, originalScopeTemplate, originalOutOfScopeTemplate, originalObjectivesDisclosureTemplate, originalAssumptionsTemplate, originalProjectPhasesTemplate, originalRolesTemplate, setFormData]);

  // Create all content handlers using the factory
  const templates = {
    originalIntroTemplate,
    originalScopeTemplate,
    originalOutOfScopeTemplate,
    originalObjectivesDisclosureTemplate,
    originalAssumptionsTemplate,
    originalProjectPhasesTemplate,
    originalRolesTemplate
  };

  const context = {
    initializing,
    initializedSections,
    templates,
    formData,
    setFormData,
    normalizeContent,
    checkUnsavedChanges
  };

  const { handlers, resetHandlers } = createAllContentHandlers(context);

  // Destructure the handlers for easy access
  const {
    handleIntroContentChange,
    handleScopeContentChange,
    handleObjectivesDisclosureContentChange,
    handleAssumptionsContentChange,
    handleProjectPhasesContentChange,
    handleRolesContentChange,
    handleOutOfScopeContentChange
  } = handlers;

  const {
    resetIntroContent,
    resetScopeContent,
    resetObjectivesDisclosureContent,
    resetAssumptionsContent,
    resetProjectPhasesContent,
    resetRolesContent,
    resetOutOfScopeContent
  } = resetHandlers;

  const saveSection = async (sectionName: string) => {
    if (!formData.id) {
      setSaveStatus({ ...saveStatus, [sectionName]: 'error' });
      return;
    }

    setSaving(sectionName);
    try {
      const requestData = {
        tab: 'Content Editing',
        data: {
          custom_intro_content: formData.custom_intro_content,
          custom_scope_content: formData.custom_scope_content,
          custom_objectives_disclosure_content: formData.custom_objectives_disclosure_content,
          custom_assumptions_content: formData.custom_assumptions_content,
          custom_project_phases_content: formData.custom_project_phases_content,
          custom_roles_content: formData.custom_roles_content,
          custom_out_of_scope_content: formData.custom_out_of_scope_content,
          intro_content_edited: formData.intro_content_edited,
          scope_content_edited: formData.scope_content_edited,
          objectives_disclosure_content_edited: formData.objectives_disclosure_content_edited,
          assumptions_content_edited: formData.assumptions_content_edited,
          project_phases_content_edited: formData.project_phases_content_edited,
          roles_content_edited: formData.roles_content_edited,
          out_of_scope_content_edited: formData.out_of_scope_content_edited,
        }
      };
      
      const response = await fetch(`/api/sow/${formData.id}/tab-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        setSaveStatus({ ...saveStatus, [sectionName]: 'success' });
        // Clear unsaved changes for this section
        setUnsavedChanges(prev => {
          const newState = { ...prev, [sectionName]: false };
          return newState;
        });
        
        // Mark that we need to notify parent after state update
        shouldNotifyParent.current = true;
        setTimeout(() => {
          setSaveStatus({ ...saveStatus, [sectionName]: null });
        }, 3000);
      } else {
        setSaveStatus({ ...saveStatus, [sectionName]: 'error' });
      }
    } catch (error) {
      console.error(`Error saving ${sectionName} content:`, error);
      setSaveStatus({ ...saveStatus, [sectionName]: 'error' });
    } finally {
      setSaving(null);
    }
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

  const sections = [
    { id: 'intro', name: 'Introduction', icon: '📝' },
    { id: 'objectives-disclosure', name: 'Objectives', icon: '📋' },
    { id: 'scope', name: 'Scope', icon: '🎯' },
    { id: 'out-of-scope', name: 'Out of Scope', icon: '🚫' },
    { id: 'project-phases', name: 'Project Phases', icon: '📅' },
    { id: 'roles', name: 'Roles & Responsibilities', icon: '👥' },
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
                {unsavedChanges.intro && (
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                    Unsaved Changes
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => saveSection('intro')}
                  disabled={saving === 'intro'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving === 'intro' ? 'Saving...' : 'Save'}
                </button>
                {saveStatus.intro === 'success' && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Saved!</span>
                )}
                {saveStatus.intro === 'error' && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Error</span>
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
                {unsavedChanges.scope && (
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                    Unsaved Changes
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => saveSection('scope')}
                  disabled={saving === 'scope'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving === 'scope' ? 'Saving...' : 'Save'}
                </button>
                {saveStatus.scope === 'success' && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Saved!</span>
                )}
                {saveStatus.scope === 'error' && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Error</span>
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
                {unsavedChanges['out-of-scope'] && (
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                    Unsaved Changes
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => saveSection('out-of-scope')}
                  disabled={saving === 'out-of-scope'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving === 'out-of-scope' ? 'Saving...' : 'Save'}
                </button>
                {saveStatus['out-of-scope'] === 'success' && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Saved!</span>
                )}
                {saveStatus['out-of-scope'] === 'error' && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Error</span>
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
                {unsavedChanges['objectives-disclosure'] && (
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                    Unsaved Changes
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => saveSection('objectives-disclosure')}
                  disabled={saving === 'objectives-disclosure'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving === 'objectives-disclosure' ? 'Saving...' : 'Save'}
                </button>
                {saveStatus['objectives-disclosure'] === 'success' && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Saved!</span>
                )}
                {saveStatus['objectives-disclosure'] === 'error' && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Error</span>
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
                {unsavedChanges.assumptions && (
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                    Unsaved Changes
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => saveSection('assumptions')}
                  disabled={saving === 'assumptions'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving === 'assumptions' ? 'Saving...' : 'Save'}
                </button>
                {saveStatus.assumptions === 'success' && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Saved!</span>
                )}
                {saveStatus.assumptions === 'error' && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Error</span>
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
                {unsavedChanges['project-phases'] && (
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                    Unsaved Changes
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => saveSection('project-phases')}
                  disabled={saving === 'project-phases'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving === 'project-phases' ? 'Saving...' : 'Save'}
                </button>
                {saveStatus['project-phases'] === 'success' && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Saved!</span>
                )}
                {saveStatus['project-phases'] === 'error' && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Error</span>
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

      case 'roles':
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Roles and Responsibilities</h3>
              <div className="flex items-center space-x-2">
                {formData.roles_content_edited && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    Customized
                  </span>
                )}
                {unsavedChanges.roles && (
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                    Unsaved Changes
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => saveSection('roles')}
                  disabled={saving === 'roles'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving === 'roles' ? 'Saving...' : 'Save'}
                </button>
                {saveStatus.roles === 'success' && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Saved!</span>
                )}
                {saveStatus.roles === 'error' && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Error</span>
                )}
                <button
                  type="button"
                  onClick={resetRolesContent}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reset to Default
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <TipTapEditor
                value={formData.custom_roles_content || ''}
                onChange={handleRolesContentChange}
                placeholder="Enter the roles and responsibilities content for this SOW..."
                initializing={initializing}
              />
              <p className="mt-2 text-sm text-gray-500">
                This content outlines the roles and responsibilities for both Customer and LeanData teams.
              </p>
            </div>

            {formData.roles_content_edited && (
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
                    {unsavedChanges[section.id] && (
                      <span className="text-red-600 text-xs" title="Unsaved changes">
                        ●
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
            <li>• <strong>Save each section individually using the Save button in each section header</strong></li>
          </ul>
        </div>
      </div>
      
      {/* Loading Modal for Content Saving */}
      <LoadingModal 
        isOpen={saving !== null} 
        operation="saving"
        message={`Saving ${saving ? sections.find(s => s.id === saving)?.name || 'content' : 'content'}...`}
      />
    </div>
  );
}
           