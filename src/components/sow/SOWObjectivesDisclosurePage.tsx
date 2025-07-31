'use client';

import { useState, useEffect } from 'react';
import { getContentTemplate } from '@/lib/sow-content';
import { textToHtml } from '@/lib/text-to-html';

interface SOWObjectivesDisclosurePageProps {
  customContent?: string;
  isEdited?: boolean;
}

export default function SOWObjectivesDisclosurePage({ 
  customContent, 
  isEdited = false 
}: SOWObjectivesDisclosurePageProps) {
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
        const template = await getContentTemplate('objectives-disclosure');
        if (template) {
          let processedContent = textToHtml(template.default_content);
          setContent(processedContent);
        } else {
          // Fallback to hardcoded content if no template found
          const fallbackText = `Customers and LeanData's responsibilities for the project are described in this SOW. Where LeanData is designated to have the primary responsibility for certain activities, successful and timely completion depends on participation by, and key content from, Customer's subject matter experts, as well as decisions and approvals from Customer's leadership team and other assumptions set forth in this SOW. Likewise, where Customer has the primary responsibility for certain activities, LeanData will provide appropriate cooperation and input. Where the Parties are jointly responsible for certain activities, the Parties will collaborate in good faith to resolve issues in accordance with the relevant mutually agreed priorities and the other terms of this SOW.

A summary of scope assumptions, Customer's relevant use cases, and the Parties' respective responsibilities under this SOW appears below. LeanData has relied on this information in estimating the applicable fees, timeline, level of effort and resources required for the Professional Services under this SOW. This SOW is based on current assumptions and information currently known as of the SOW Effective Date. During the "Discovery" phase of the implementation, LeanData will gather additional detailed information about Customer's requirements and use cases, based upon which the scope of the implementation may change, resulting in a Post-Discovery Change Order mutually agreed by the Parties.`;
          
          let processedContent = textToHtml(fallbackText);
          setContent(processedContent);
        }
      } catch (error) {
        console.error('Error loading objectives disclosure content:', error);
        // Fallback content
        const fallbackText = `Customers and LeanData's responsibilities for the project are described in this SOW. Where LeanData is designated to have the primary responsibility for certain activities, successful and timely completion depends on participation by, and key content from, Customer's subject matter experts, as well as decisions and approvals from Customer's leadership team and other assumptions set forth in this SOW. Likewise, where Customer has the primary responsibility for certain activities, LeanData will provide appropriate cooperation and input. Where the Parties are jointly responsible for certain activities, the Parties will collaborate in good faith to resolve issues in accordance with the relevant mutually agreed priorities and the other terms of this SOW.

A summary of scope assumptions, Customer's relevant use cases, and the Parties' respective responsibilities under this SOW appears below. LeanData has relied on this information in estimating the applicable fees, timeline, level of effort and resources required for the Professional Services under this SOW. This SOW is based on current assumptions and information currently known as of the SOW Effective Date. During the "Discovery" phase of the implementation, LeanData will gather additional detailed information about Customer's requirements and use cases, based upon which the scope of the implementation may change, resulting in a Post-Discovery Change Order mutually agreed by the Parties.`;
        
        let processedContent = textToHtml(fallbackText);
        setContent(processedContent);
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
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="text-base leading-relaxed">
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
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 text-xs text-gray-600 rounded">
          <strong>Debug:</strong> Content length: {content.length} | 
          Has HTML: {content.includes('<') ? 'Yes' : 'No'} | 
          Custom content: {customContent ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  );
} 