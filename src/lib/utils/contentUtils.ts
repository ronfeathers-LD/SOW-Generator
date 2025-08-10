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
  const normalizedCurrent = normalizeContent(currentContent);
  const normalizedTemplate = normalizeContent(templateContent);
  const hasChanges = normalizedCurrent !== normalizedTemplate && normalizedCurrent !== '';
  
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
