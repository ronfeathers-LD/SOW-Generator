'use client';

import { useState, useEffect } from 'react';
import { getContentTemplate, processScopeContent } from '@/lib/sow-content';
import { processContent } from '@/lib/text-to-html';

interface SOWScopePageProps {
  deliverables: string[];
  projectDescription: string;
  customContent?: string;
  customDeliverablesContent?: string;
  isEdited?: boolean;
}

export default function SOWScopePage({ 
  deliverables, 
  projectDescription, 
  customContent, 
  customDeliverablesContent,
  isEdited 
}: SOWScopePageProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      // If we have custom deliverables content, use it directly
      if (customDeliverablesContent) {
        const processedContent = processContent(customDeliverablesContent);
        setContent(processedContent);
        setLoading(false);
        return;
      }

      // If we have custom scope content, process it and replace deliverables placeholder
      if (customContent) {
        let processedContent = processContent(customContent);
        const deliverablesHtml = deliverables
          .map((deliverable, index) => `<div class="mb-4"><div>${deliverable}</div></div>`)
          .join('\n');
        processedContent = processedContent.replace(/{deliverables}/g, deliverablesHtml);
        setContent(processedContent);
        setLoading(false);
        return;
      }

      try {
        const template = await getContentTemplate('scope');
        if (template) {
          const processedContent = processScopeContent(template.default_content, deliverables);
          setContent(processedContent);
        } else {
          // Fallback to generic message if no template found
          const fallbackContent = `<div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <p class="text-yellow-800 font-medium">⚠️ NOTE: This is fallback content</p>
            <p class="text-yellow-700 text-sm mt-1">The Scope section template could not be loaded. Please configure the content template in the admin panel.</p>
          </div>`;
          
          setContent(fallbackContent);
        }
      } catch (error) {
        console.error('Error loading scope content:', error);
        // Fallback to generic message if error occurs
        const fallbackContent = `<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p class="text-red-800 font-medium">⚠️ NOTE: This is fallback content</p>
          <p class="text-red-700 text-sm mt-1">An error occurred while loading the Scope section template. Please check the configuration and try again.</p>
        </div>`;
        
        setContent(fallbackContent);
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [deliverables, customContent, customDeliverablesContent]);

  if (loading) {
    return (
      <div className="prose max-w-none text-left">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-none text-left">
      {/* Project Description */}
      {projectDescription && (
        <div className="mb-6">
          <p className="text-gray-700">{projectDescription}</p>
        </div>
      )}
      
      {isEdited && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This content has been customized from the default template.
          </p>
        </div>
      )}
      
      <div 
        className="text-base leading-relaxed"
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    </div>
  );
} 