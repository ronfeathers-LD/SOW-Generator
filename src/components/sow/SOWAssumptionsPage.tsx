'use client';

import { useState, useEffect } from 'react';
import { getContentTemplate } from '@/lib/sow-content';
import { textToHtml } from '@/lib/text-to-html';

interface SOWAssumptionsPageProps {
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWAssumptionsPage({ 
  customContent, 
  isEdited = false 
}: SOWAssumptionsPageProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        if (customContent) {
          // Use custom content if provided (edited by user)
          // Convert text to HTML
          let processedContent = textToHtml(customContent);
          setContent(processedContent);
          setLoading(false);
          return;
        }

        // Fallback to template content
        const template = await getContentTemplate('assumptions');
        if (template) {
          let processedContent = textToHtml(template.default_content);
          setContent(processedContent);
        } else {
          // Fallback to generic message if no template found
          const fallbackText = `<div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <p class="text-yellow-800 font-medium">⚠️ NOTE: This is fallback content</p>
            <p class="text-yellow-700 text-sm mt-1">The Assumptions section template could not be loaded. Please configure the content template in the admin panel.</p>
          </div>`;
          
          setContent(fallbackText);
        }
      } catch (error) {
        console.error('Error loading assumptions content:', error);
        // Fallback to generic message if error occurs
        const fallbackText = `<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p class="text-red-800 font-medium">⚠️ NOTE: This is fallback content</p>
          <p class="text-red-700 text-sm mt-1">An error occurred while loading the Assumptions section template. Please check the configuration and try again.</p>
        </div>`;
        
        setContent(fallbackText);
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [customContent]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="prose max-w-none">
      <div 
        className="text-gray-700"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      {isEdited && (
        <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> This content has been customized for this SOW.
          </p>
        </div>
      )}
    </div>
  );
} 