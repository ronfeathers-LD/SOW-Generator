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
          // Fallback to hardcoded content if no template found
          const fallbackText = `The following are the assumptions as part of the SOW:

• LeanData Professional Services will require access to the customer's SFDC's sandbox and production tenants for the configuration of LeanData; and, the customer will be responsible to ensure appropriate access is granted for the duration of the project. Customer will share all Salesforce details pertaining to configurations, including but not limited to: User IDs, fields/values, Queue IDs, Assignment rule IDs, etc.

• For additional requests outside this SOW, LeanData shall work with Customer to determine if an additional SOW is required or determine alternate methods to remedy the request.

• If the Customer requires LeanData to travel to Customer locations, then travel expenses shall be billed separately and not included in the estimate above. All expenses shall be pre-approved by Customer prior to LeanData booking travel itineraries.

• All services described in this SOW, including any training, will be performed remotely from a LeanData office location during normal business hours: Monday through Friday from 9 am to 5 pm PDT.

• Customer will conduct all required testing and communicate to LeanData anything that needs further investigation and/or additional changes to configurations.`;
          
          let processedContent = textToHtml(fallbackText);
          setContent(processedContent);
        }
      } catch (error) {
        console.error('Error loading assumptions content:', error);
        // Set fallback content on error
        const fallbackText = `The following are the assumptions as part of the SOW:

• LeanData Professional Services will require access to the customer's SFDC's sandbox and production tenants for the configuration of LeanData; and, the customer will be responsible to ensure appropriate access is granted for the duration of the project. Customer will share all Salesforce details pertaining to configurations, including but not limited to: User IDs, fields/values, Queue IDs, Assignment rule IDs, etc.

• For additional requests outside this SOW, LeanData shall work with Customer to determine if an additional SOW is required or determine alternate methods to remedy the request.

• If the Customer requires LeanData to travel to Customer locations, then travel expenses shall be billed separately and not included in the estimate above. All expenses shall be pre-approved by Customer prior to LeanData booking travel itineraries.

• All services described in this SOW, including any training, will be performed remotely from a LeanData office location during normal business hours: Monday through Friday from 9 am to 5 pm PDT.

• Customer will conduct all required testing and communicate to LeanData anything that needs further investigation and/or additional changes to configurations.`;
        
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