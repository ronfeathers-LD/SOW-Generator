'use client';

import { useState, useEffect } from 'react';
import { getContentTemplate, processScopeContent } from '@/lib/sow-content';
import { textToHtml } from '@/lib/text-to-html';

interface SOWScopePageProps {
  deliverables: string[];
  projectDescription: string;
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWScopePage({ deliverables, projectDescription, customContent, isEdited }: SOWScopePageProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      if (customContent) {
        // Use custom content if provided (edited by user)
        // Convert text to HTML and replace the deliverables placeholder
        let processedContent = textToHtml(customContent);
        const deliverablesHtml = deliverables
          .map((deliverable, index) => `<div class="mb-4"><div>${deliverable}</div></div>`)
          .join('\n');
        processedContent = processedContent.replace(/PLACEHOLDER_STARTdeliverablesPLACEHOLDER_END/g, deliverablesHtml);
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
          // Fallback to hardcoded content if no template found
          const fallbackContent = `<p class="mb-4">The customer has implemented LeanData and seeks to augment their team with LeanData expertise through Expert Services provided by the LeanData Professional Services team. As part of Expert Services, LeanData personnel as requested in the table below will assist the customer with one or more of the following:</p>

{deliverables}

<p>Customer is designated to have the primary responsibility for activities, successful and timely completion depends on participation by, and key content from, Customer's subject matter experts, as well as decisions and approvals from Customer's leadership team.</p>`;
          
          const processedContent = processScopeContent(fallbackContent, deliverables);
          setContent(processedContent);
        }
      } catch (error) {
        console.error('Error loading scope content:', error);
        // Fallback content
        const fallbackContent = `<p class="mb-4">The customer has implemented LeanData and seeks to augment their team with LeanData expertise through Expert Services provided by the LeanData Professional Services team. As part of Expert Services, LeanData personnel as requested in the table below will assist the customer with one or more of the following:</p>

{deliverables}

<p>Customer is designated to have the primary responsibility for activities, successful and timely completion depends on participation by, and key content from, Customer's subject matter experts, as well as decisions and approvals from Customer's leadership team.</p>`;
        
        const processedContent = processScopeContent(fallbackContent, deliverables);
        setContent(processedContent);
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [deliverables, customContent]);

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