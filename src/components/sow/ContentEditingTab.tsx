'use client';

import { useState, useEffect } from 'react';
import { SOWData } from '@/types/sow';
import { getContentTemplate } from '@/lib/sow-content';
import TipTapEditor from '../TipTapEditor';

interface ContentEditingTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  onUnsavedChanges?: (hasUnsavedChanges: boolean) => void;
}

export default function ContentEditingTab({ formData, setFormData, onUnsavedChanges }: ContentEditingTabProps) {
  // Original templates from database (never change)
  const [originalIntroTemplate, setOriginalIntroTemplate] = useState<string>('');
  const [originalScopeTemplate, setOriginalScopeTemplate] = useState<string>('');
  const [originalObjectivesDisclosureTemplate, setOriginalObjectivesDisclosureTemplate] = useState<string>('');
  const [originalAssumptionsTemplate, setOriginalAssumptionsTemplate] = useState<string>('');
  const [originalProjectPhasesTemplate, setOriginalProjectPhasesTemplate] = useState<string>('');
  const [originalRolesTemplate, setOriginalRolesTemplate] = useState<string>('');
  
  // Current templates (can be updated after saving)
  const [introTemplate, setIntroTemplate] = useState<string>('');
  const [scopeTemplate, setScopeTemplate] = useState<string>('');
  const [objectivesDisclosureTemplate, setObjectivesDisclosureTemplate] = useState<string>('');
  const [assumptionsTemplate, setAssumptionsTemplate] = useState<string>('');
  const [projectPhasesTemplate, setProjectPhasesTemplate] = useState<string>('');
  const [rolesTemplate, setRolesTemplate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [activeSection, setActiveSection] = useState('intro');
  const [saving, setSaving] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: 'success' | 'error' | null }>({});
  const [unsavedChanges, setUnsavedChanges] = useState<{ [key: string]: boolean }>({});
  const [initializedSections, setInitializedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadTemplates() {
      try {


        // Load templates for reference and reset functionality only
        const intro = await getContentTemplate('intro');
        if (intro) {
          setOriginalIntroTemplate(intro.default_content);
          setIntroTemplate(intro.default_content);
        }

        const scope = await getContentTemplate('scope');
        if (scope) {
          setOriginalScopeTemplate(scope.default_content);
          setScopeTemplate(scope.default_content);
        }

        const objectivesDisclosure = await getContentTemplate('objectives-disclosure');
        if (objectivesDisclosure) {
          setOriginalObjectivesDisclosureTemplate(objectivesDisclosure.default_content);
          setObjectivesDisclosureTemplate(objectivesDisclosure.default_content);
        }

        const assumptions = await getContentTemplate('assumptions');
        if (assumptions) {
          setOriginalAssumptionsTemplate(assumptions.default_content);
          setAssumptionsTemplate(assumptions.default_content);
        }

        const projectPhases = await getContentTemplate('project-phases');
        if (projectPhases) {
          setOriginalProjectPhasesTemplate(projectPhases.default_content);
          setProjectPhasesTemplate(projectPhases.default_content);
        }

        const roles = await getContentTemplate('roles');
        if (roles) {
          setOriginalRolesTemplate(roles.default_content);
          setRolesTemplate(roles.default_content);
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

  // Function to check if a section has unsaved changes
  const checkUnsavedChanges = (sectionName: string, currentContent: string, templateContent: string) => {
    const normalizedCurrent = normalizeContent(currentContent);
    const normalizedTemplate = normalizeContent(templateContent);
    const hasUnsavedChanges = normalizedCurrent !== normalizedTemplate && normalizedCurrent !== '';
    setUnsavedChanges(prev => ({
      ...prev,
      [sectionName]: hasUnsavedChanges
    }));
    
    // Notify parent component about overall unsaved changes
    if (onUnsavedChanges) {
      const anyUnsavedChanges = Object.values({ ...unsavedChanges, [sectionName]: hasUnsavedChanges }).some(Boolean);
      onUnsavedChanges(anyUnsavedChanges);
    }
  };

  const handleIntroContentChange = (content: string) => {
    // Don't process changes during initialization or if section hasn't been initialized yet
    if (initializing || !initializedSections.has('intro')) {
      return;
    }
    
    // Check if content has been edited from the original template
    const normalizedCurrent = normalizeContent(content);
    const normalizedTemplate = normalizeContent(originalIntroTemplate);
    const isEdited = normalizedCurrent !== normalizedTemplate && normalizedCurrent !== '';
    setFormData({
      ...formData,
      custom_intro_content: content,
      intro_content_edited: isEdited
    });
    checkUnsavedChanges('intro', content, originalIntroTemplate);
  };

  const handleScopeContentChange = (content: string) => {
    // Don't process changes during initialization or if section hasn't been initialized yet
    if (initializing || !initializedSections.has('scope')) {
      return;
    }
    
    // Check if content has been edited from the original template
    const normalizedCurrent = normalizeContent(content);
    const normalizedTemplate = normalizeContent(originalScopeTemplate);
    const isEdited = normalizedCurrent !== normalizedTemplate && normalizedCurrent !== '';
    setFormData({
      ...formData,
      custom_scope_content: content,
      scope_content_edited: isEdited
    });
    checkUnsavedChanges('scope', content, originalScopeTemplate);
  };

  const handleObjectivesDisclosureContentChange = (content: string) => {
    // Don't process changes during initialization or if section hasn't been initialized yet
    if (initializing || !initializedSections.has('objectives-disclosure')) {
      return;
    }
    
    // Check if content has been edited from the original template
    const normalizedCurrent = normalizeContent(content);
    const normalizedTemplate = normalizeContent(originalObjectivesDisclosureTemplate);
    const isEdited = normalizedCurrent !== normalizedTemplate && normalizedCurrent !== '';
    setFormData({
      ...formData,
      custom_objectives_disclosure_content: content,
      objectives_disclosure_content_edited: isEdited
    });
    checkUnsavedChanges('objectives-disclosure', content, originalObjectivesDisclosureTemplate);
  };

  const resetIntroContent = () => {
    setFormData({
      ...formData,
      custom_intro_content: originalIntroTemplate,
      intro_content_edited: false
    });
    setUnsavedChanges(prev => ({ ...prev, intro: false }));
  };

  const resetScopeContent = () => {
    setFormData({
      ...formData,
      custom_scope_content: originalScopeTemplate,
      scope_content_edited: false
    });
    setUnsavedChanges(prev => ({ ...prev, scope: false }));
  };

  const resetObjectivesDisclosureContent = () => {
    setFormData({
      ...formData,
      custom_objectives_disclosure_content: originalObjectivesDisclosureTemplate,
      objectives_disclosure_content_edited: false
    });
    setUnsavedChanges(prev => ({ ...prev, 'objectives-disclosure': false }));
  };

  const handleAssumptionsContentChange = (content: string) => {
    // Don't process changes during initialization or if section hasn't been initialized yet
    if (initializing || !initializedSections.has('assumptions')) {
      return;
    }
    
    // Check if content has been edited from the original template
    const normalizedCurrent = normalizeContent(content);
    const normalizedTemplate = normalizeContent(originalAssumptionsTemplate);
    const isEdited = normalizedCurrent !== normalizedTemplate && normalizedCurrent !== '';
    setFormData({
      ...formData,
      custom_assumptions_content: content,
      assumptions_content_edited: isEdited
    });
    checkUnsavedChanges('assumptions', content, originalAssumptionsTemplate);
  };

  const resetAssumptionsContent = () => {
    setFormData({
      ...formData,
      custom_assumptions_content: originalAssumptionsTemplate,
      assumptions_content_edited: false
    });
    setUnsavedChanges(prev => ({ ...prev, assumptions: false }));
  };

  const handleProjectPhasesContentChange = (content: string) => {
    // Don't process changes during initialization or if section hasn't been initialized yet
    if (initializing || !initializedSections.has('project-phases')) {
      return;
    }
    
    // Check if content has been edited from the original template
    const normalizedCurrent = normalizeContent(content);
    const normalizedTemplate = normalizeContent(originalProjectPhasesTemplate);
    const isEdited = normalizedCurrent !== normalizedTemplate && normalizedCurrent !== '';
    setFormData({
      ...formData,
      custom_project_phases_content: content,
      project_phases_content_edited: isEdited
    });
    checkUnsavedChanges('project-phases', content, originalProjectPhasesTemplate);
  };

  const resetProjectPhasesContent = () => {
    setFormData({
      ...formData,
      custom_project_phases_content: originalProjectPhasesTemplate,
      project_phases_content_edited: false
    });
    setUnsavedChanges(prev => ({ ...prev, 'project-phases': false }));
  };

  const handleRolesContentChange = (content: string) => {
    // Don't process changes during initialization or if section hasn't been initialized yet
    if (initializing || !initializedSections.has('roles')) {
      return;
    }
    
    // Check if content has been edited from the original template
    const normalizedCurrent = normalizeContent(content);
    const normalizedTemplate = normalizeContent(originalRolesTemplate);
    const isEdited = normalizedCurrent !== normalizedTemplate && normalizedCurrent !== '';
    setFormData({
      ...formData,
      custom_roles_content: content,
      roles_content_edited: isEdited
    });
    checkUnsavedChanges('roles', content, originalRolesTemplate);
  };

  const resetRolesContent = () => {
    setFormData({
      ...formData,
      custom_roles_content: originalRolesTemplate,
      roles_content_edited: false
    });
    setUnsavedChanges(prev => ({ ...prev, roles: false }));
  };

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
          intro_content_edited: formData.intro_content_edited,
          scope_content_edited: formData.scope_content_edited,
          objectives_disclosure_content_edited: formData.objectives_disclosure_content_edited,
          assumptions_content_edited: formData.assumptions_content_edited,
          project_phases_content_edited: formData.project_phases_content_edited,
          roles_content_edited: formData.roles_content_edited,
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
        setUnsavedChanges(prev => ({
          ...prev,
          [sectionName]: false
        }));
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Introduction Content
              </label>
              <TipTapEditor
                value={formData.custom_intro_content || ''}
                onChange={handleIntroContentChange}
                placeholder="Enter the introduction content for this SOW..."
                initializing={initializing}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scope Content
              </label>
              <TipTapEditor
                value={formData.custom_scope_content || ''}
                onChange={handleScopeContentChange}
                placeholder="Enter the scope content for this SOW..."
                initializing={initializing}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objectives Disclosure Content
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assumptions Content
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Phases Content
              </label>
              <TipTapEditor
                value={formData.custom_project_phases_content || ''}
                onChange={handleProjectPhasesContentChange}
                placeholder="Enter the project phases content for this SOW..."
                initializing={initializing}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Roles and Responsibilities Content
              </label>
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
                <div className="flex items-center">
                  <span className="mr-2">{section.icon}</span>
                  <span>{section.name}</span>
                  {formData[`${section.id.replace('-', '_')}_content_edited` as keyof SOWData] && (
                    <span className="ml-auto px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Edited
                    </span>
                  )}
                  {unsavedChanges[section.id] && (
                    <span className="ml-auto px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                      Unsaved
                    </span>
                  )}
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
    </div>
  );
}
           