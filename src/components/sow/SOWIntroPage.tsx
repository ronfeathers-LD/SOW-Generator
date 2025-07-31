'use client';

import { useState, useEffect } from 'react';
import { getContentTemplate, processIntroContent } from '@/lib/sow-content';
import { textToHtml } from '@/lib/text-to-html';

interface SOWIntroPageProps {
  clientName: string;
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWIntroPage({ clientName, customContent, isEdited }: SOWIntroPageProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      if (customContent) {
        // Use custom content if provided (edited by user)
        // Convert text to HTML and replace the client name placeholder
        let processedContent = textToHtml(customContent);
        if (clientName) {
          processedContent = processedContent.replace(/PLACEHOLDER_STARTclientNamePLACEHOLDER_END/g, `<span class="font-bold">${clientName}</span>`);
        } else {
          // If no client name, replace with a placeholder
          processedContent = processedContent.replace(/PLACEHOLDER_STARTclientNamePLACEHOLDER_END/g, '<span class="font-bold">[Client Name]</span>');
        }
        setContent(processedContent);
        setLoading(false);
        return;
      }

      try {
        const template = await getContentTemplate('intro');
        if (template) {
          const processedContent = processIntroContent(template.default_content, clientName);
          setContent(processedContent);
        } else {
          // Fallback to hardcoded content if no template found
          const clientNameDisplay = clientName || '[Client Name]';
          const fallbackText = `THIS STATEMENT OF WORK ("SOW"), is entered into by {clientName}, ("Customer") and LeanData, Inc., ("LeanData") effective as of the date of the last signature above ("SOW Effective Date") and is hereby incorporated by reference into that certain Master Subscription and Professional Services Agreement or other agreement between the Customer and LeanData ("Agreement").  To the extent there are any inconsistencies between or among the Agreement and this SOW, including all Exhibits to this SOW, such inconsistencies shall be resolved in accordance with the following order of precedence: (i) this SOW, (ii) any Exhibits to this SOW, and (iii), the Agreement.

LeanData will perform the professional services described in this SOW, which may include consultation, configuration, integration, project management and training (collectively, the "Professional Services").  LeanData will not start performing such Professional Services under this SOW until both Parties sign this SOW and the Agreement.  This SOW and the Agreement constitute the Parties' complete agreement regarding the Professional Services and other matters addressed in this SOW.`;
          
          let processedContent = textToHtml(fallbackText);
          processedContent = processedContent.replace(/PLACEHOLDER_STARTclientNamePLACEHOLDER_END/g, `<span class="font-bold">${clientNameDisplay}</span>`);
          setContent(processedContent);
        }
      } catch (error) {
        console.error('Error loading intro content:', error);
        // Fallback content
        const clientNameDisplay = clientName || '[Client Name]';
        const fallbackText = `THIS STATEMENT OF WORK ("SOW"), is entered into by {clientName}, ("Customer") and LeanData, Inc., ("LeanData") effective as of the date of the last signature above ("SOW Effective Date") and is hereby incorporated by reference into that certain Master Subscription and Professional Services Agreement or other agreement between the Customer and LeanData ("Agreement").  To the extent there are any inconsistencies between or among the Agreement and this SOW, including all Exhibits to this SOW, such inconsistencies shall be resolved in accordance with the following order of precedence: (i) this SOW, (ii) any Exhibits to this SOW, and (iii), the Agreement.

LeanData will perform the professional services described in this SOW, which may include consultation, configuration, integration, project management and training (collectively, the "Professional Services").  LeanData will not start performing such Professional Services under this SOW until both Parties sign this SOW and the Agreement.  This SOW and the Agreement constitute the Parties' complete agreement regarding the Professional Services and other matters addressed in this SOW.`;
        
        let processedContent = textToHtml(fallbackText);
        processedContent = processedContent.replace(/PLACEHOLDER_STARTclientNamePLACEHOLDER_END/g, `<span class="font-bold">${clientNameDisplay}</span>`);
        setContent(processedContent);
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [clientName, customContent]);

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
      {/* Debug: Show raw content */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <summary>Debug: Raw Content (Length: {content.length})</summary>
          <pre className="whitespace-pre-wrap">{content}</pre>
          <hr className="my-2" />
          <div>Contains HTML tags: {content.includes('<') ? 'Yes' : 'No'}</div>
          <div>Contains markdown: {content.includes('#') || content.includes('*') ? 'Yes' : 'No'}</div>
        </details>
      )}
    </div>
  );
} 