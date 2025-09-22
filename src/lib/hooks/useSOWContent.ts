import { useState, useEffect, useMemo } from 'react';
import { getContentTemplate } from '@/lib/sow-content';
import { processContent } from '@/lib/text-to-html';

interface UseSOWContentOptions {
  sectionName: string;
  customContent?: string;
  processor?: (content: string) => string;
  dependencies?: unknown[];
}

export const useSOWContent = ({ 
  sectionName, 
  customContent, 
  processor,
  dependencies = []
}: UseSOWContentOptions) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Memoize the dependencies to prevent unnecessary re-runs
  const memoizedDependencies = useMemo(() => dependencies, [dependencies]);

  useEffect(() => {
    async function loadContent() {
      if (customContent && customContent.trim() !== '') {
        const processedContent = processor ? processor(customContent) : processContent(customContent);
        setContent(processedContent);
        setLoading(false);
        return;
      }

      try {
        const template = await getContentTemplate(sectionName);
        if (template) {
          const processedContent = processor ? processor(template.default_content) : processContent(template.default_content);
          setContent(processedContent);
        } else {
          setContent(getFallbackContent(sectionName, 'template'));
        }
      } catch (error) {
        console.error(`Error loading ${sectionName} content:`, error);
        setContent(getFallbackContent(sectionName, 'error'));
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [sectionName, customContent, processor, memoizedDependencies]);

  return { content, loading };
};

export const getFallbackContent = (sectionName: string, type: 'template' | 'error'): string => {
  const isError = type === 'error';
  const bgColor = isError ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
  const textColor = isError ? 'text-red-800 text-red-700' : 'text-yellow-800 text-yellow-700';
  const message = isError 
    ? `An error occurred while loading the ${sectionName} section template.`
    : `The ${sectionName} section template could not be loaded.`;
  
  return `<div class="${bgColor} border rounded-md p-4 mb-4">
    <p class="${textColor.split(' ')[0]} font-medium">⚠️ NOTE: This is fallback content</p>
    <p class="${textColor.split(' ')[1]} text-sm mt-1">${message} Please configure the content template in the admin panel.</p>
  </div>`;
};
