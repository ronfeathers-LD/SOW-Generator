import { SOWData } from '@/types/sow';

interface ContentHandlerConfig {
  sectionName: string;
  templateKey: string;
  contentKey: keyof SOWData;
  editedKey: keyof SOWData;
}

interface ContentHandlerContext {
  initializing: boolean;
  initializedSections: Set<string>;
  templates: Record<string, string>;
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  normalizeContent: (content: string) => string;
  checkUnsavedChanges: (sectionName: string, currentContent: string, templateContent: string) => void;
  isReady?: React.MutableRefObject<boolean>;
}

export const createContentHandler = (
  config: ContentHandlerConfig,
  context: ContentHandlerContext
) => {
  return (content: string) => {
    const { sectionName, templateKey, contentKey, editedKey } = config;
    const { initializing, initializedSections, templates, formData, setFormData, normalizeContent, checkUnsavedChanges, isReady } = context;

    // Don't process changes during initialization or if section hasn't been initialized yet
    if (initializing || !initializedSections.has(sectionName)) {
      return;
    }
    
    // Don't process if component is not ready yet
    if (!isReady?.current) {
      return;
    }
    
    // Don't process if template is not loaded yet
    const templateContent = templates[templateKey];
    if (!templateContent || templateContent.trim() === '') {
      return;
    }
    
    // Don't process if content is null/undefined (not yet initialized)
    if (content === null || content === undefined) {
      return;
    }
    
    // Don't process during initial render when formData might not be fully initialized
    if (!formData.id) {
      return;
    }
    
    // Check if content has been edited from the original template
    const normalizedCurrent = normalizeContent(content);
    const normalizedTemplate = normalizeContent(templateContent);
    
    // Only consider it as edited if:
    // 1. Current content is not empty AND
    // 2. Current content is different from template
    const isEdited = normalizedCurrent !== '' && normalizedCurrent !== normalizedTemplate;
    
    // Use setTimeout to defer state updates and avoid setState during render
    setTimeout(() => {
      if (isReady?.current) {
        setFormData({
          ...formData,
          [contentKey]: content,
          [editedKey]: isEdited
        });
        
        // Defer the checkUnsavedChanges call
        setTimeout(() => {
          if (isReady?.current) {
            checkUnsavedChanges(sectionName, content, templateContent);
          }
        }, 0);
      }
    }, 0);
  };
};

export const createResetHandler = (
  config: ContentHandlerConfig,
  context: Pick<ContentHandlerContext, 'templates' | 'formData' | 'setFormData'>
) => {
  return () => {
    const { templateKey, contentKey, editedKey } = config;
    const { templates, formData, setFormData } = context;

    setFormData({
      ...formData,
      [contentKey]: templates[templateKey],
      [editedKey]: false
    });
  };
};

// Predefined configurations for all content sections
export const CONTENT_SECTIONS: ContentHandlerConfig[] = [
  {
    sectionName: 'intro',
    templateKey: 'originalIntroTemplate',
    contentKey: 'custom_intro_content',
    editedKey: 'intro_content_edited'
  },
  {
    sectionName: 'scope',
    templateKey: 'originalScopeTemplate',
    contentKey: 'custom_scope_content',
    editedKey: 'scope_content_edited'
  },
  {
    sectionName: 'objectives-disclosure',
    templateKey: 'originalObjectivesDisclosureTemplate',
    contentKey: 'custom_objectives_disclosure_content',
    editedKey: 'objectives_disclosure_content_edited'
  },
  {
    sectionName: 'assumptions',
    templateKey: 'originalAssumptionsTemplate',
    contentKey: 'custom_assumptions_content',
    editedKey: 'assumptions_content_edited'
  },
  {
    sectionName: 'project-phases',
    templateKey: 'originalProjectPhasesTemplate',
    contentKey: 'custom_project_phases_content',
    editedKey: 'project_phases_content_edited'
  },
  {
    sectionName: 'roles',
    templateKey: 'originalRolesTemplate',
    contentKey: 'custom_roles_content',
    editedKey: 'roles_content_edited'
  }
];

// Helper to create all handlers at once
export const createAllContentHandlers = (context: ContentHandlerContext) => {
  const handlers: Record<string, (content: string) => void> = {};
  const resetHandlers: Record<string, () => void> = {};

  CONTENT_SECTIONS.forEach(config => {
    const sectionName = config.sectionName;
    // Convert kebab-case to camelCase properly
    const camelCaseName = sectionName.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
    handlers[`handle${camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1)}ContentChange`] = 
      createContentHandler(config, context);
    resetHandlers[`reset${camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1)}Content`] = 
      createResetHandler(config, context);
  });

  return { handlers, resetHandlers };
};
