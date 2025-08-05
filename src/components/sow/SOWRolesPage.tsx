'use client';

import { useState, useEffect } from 'react';
import { getContentTemplate } from '@/lib/sow-content';
import { textToHtml } from '@/lib/text-to-html';

interface SOWRolesPageProps {
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWRolesPage({ customContent, isEdited }: SOWRolesPageProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      if (customContent) {
        // Use custom content if provided (edited by user)
        const processedContent = textToHtml(customContent);
        setContent(processedContent);
        setLoading(false);
        return;
      }

      try {
        const template = await getContentTemplate('roles');
        if (template) {
          setContent(template.default_content);
        } else {
          // Fallback to generic message if no template found
          const fallbackText = `<div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <p class="text-yellow-800 font-medium">⚠️ NOTE: This is fallback content</p>
            <p class="text-yellow-700 text-sm mt-1">The Roles and Responsibilities section template could not be loaded. Please configure the content template in the admin panel.</p>
          </div>`;
          
          setContent(fallbackText);
        }
      } catch (error) {
        console.error('Error loading roles content:', error);
        // Fallback to generic message if error occurs
        const fallbackText = `<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p class="text-red-800 font-medium">⚠️ NOTE: This is fallback content</p>
          <p class="text-red-700 text-sm mt-1">An error occurred while loading the Roles and Responsibilities section template. Please check the configuration and try again.</p>
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