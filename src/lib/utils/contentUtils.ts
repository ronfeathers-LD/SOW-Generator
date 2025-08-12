/**
 * Normalize content for comparison (removes HTML tags and normalizes whitespace)
 */
export const normalizeContent = (content: string): string => {
  if (!content) return '';
  // Remove HTML tags and normalize whitespace
  return content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

/**
 * Check if a section has unsaved changes
 */
export const checkUnsavedChanges = (
  sectionName: string, 
  currentContent: string, 
  templateContent: string,
  setUnsavedChanges: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  onUnsavedChanges?: (hasUnsavedChanges: boolean) => void
) => {
  // Don't check if current content is null/undefined (not yet initialized)
  if (currentContent === null || currentContent === undefined) {
    return;
  }
  
  // Don't check if template content is not loaded yet
  if (!templateContent || templateContent.trim() === '') {
    return;
  }
  
  const normalizedCurrent = normalizeContent(currentContent);
  const normalizedTemplate = normalizeContent(templateContent);
  
  // Only consider it as having unsaved changes if:
  // 1. Current content is not empty AND
  // 2. Current content is different from template
  const hasChanges = normalizedCurrent !== '' && normalizedCurrent !== normalizedTemplate;
  
  // Defer state updates to avoid setState during render
  setTimeout(() => {
    setUnsavedChanges(prev => {
      const newState = { ...prev, [sectionName]: hasChanges };
      
      // Notify parent component about unsaved changes
      if (onUnsavedChanges) {
        const anyUnsavedChanges = Object.values(newState).some(Boolean);
        onUnsavedChanges(anyUnsavedChanges);
      }
      
      return newState;
    });
  }, 0);
};
