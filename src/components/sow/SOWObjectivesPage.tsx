'use client';

import { useState, useEffect } from 'react';
import { getContentTemplate } from '@/lib/sow-content';
import { textToHtml } from '@/lib/text-to-html';

interface SOWObjectivesPageProps {
  deliverables: string[]; 
  keyObjectives: string[];
  customContent?: string;
  isEdited?: boolean;
  projectDetails?: {
    products?: string[];
    number_of_units?: string;
    regions?: string;
    salesforce_tenants?: string;
    timeline_weeks?: string;
    start_date?: Date | null;
    end_date?: Date | null;
    units_consumption?: string;
  };
}

export default function SOWObjectivesPage({ 
  deliverables, 
  keyObjectives, 
  customContent,
  isEdited = false,
  projectDetails 
}: SOWObjectivesPageProps) {
  const [objectivesDisclosureContent, setObjectivesDisclosureContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadObjectivesDisclosureContent() {
      try {
        if (customContent) {
          // Use custom content if provided (edited by user)
          let processedContent = textToHtml(customContent);
          setObjectivesDisclosureContent(processedContent);
          setLoading(false);
          return;
        }

        // Fallback to template content
        const template = await getContentTemplate('objectives-disclosure');
        if (template) {
          let processedContent = textToHtml(template.default_content);
          setObjectivesDisclosureContent(processedContent);
        } else {
          // Fallback to hardcoded content if no template found
          const fallbackText = `Customers and LeanData's responsibilities for the project are described in this SOW. Where LeanData is designated to have the primary responsibility for certain activities, successful and timely completion depends on participation by, and key content from, Customer's subject matter experts, as well as decisions and approvals from Customer's leadership team and other assumptions set forth in this SOW. Likewise, where Customer has the primary responsibility for certain activities, LeanData will provide appropriate cooperation and input. Where the Parties are jointly responsible for certain activities, the Parties will collaborate in good faith to resolve issues in accordance with the relevant mutually agreed priorities and the other terms of this SOW.

A summary of scope assumptions, Customer's relevant use cases, and the Parties' respective responsibilities under this SOW appears below. LeanData has relied on this information in estimating the applicable fees, timeline, level of effort and resources required for the Professional Services under this SOW. This SOW is based on current assumptions and information currently known as of the SOW Effective Date. During the "Discovery" phase of the implementation, LeanData will gather additional detailed information about Customer's requirements and use cases, based upon which the scope of the implementation may change, resulting in a Post-Discovery Change Order mutually agreed by the Parties.`;
          
          let processedContent = textToHtml(fallbackText);
          setObjectivesDisclosureContent(processedContent);
        }
      } catch (error) {
        console.error('Error loading objectives disclosure content:', error);
        // Fallback content
        const fallbackText = `Customers and LeanData's responsibilities for the project are described in this SOW. Where LeanData is designated to have the primary responsibility for certain activities, successful and timely completion depends on participation by, and key content from, Customer's subject matter experts, as well as decisions and approvals from Customer's leadership team and other assumptions set forth in this SOW. Likewise, where Customer has the primary responsibility for certain activities, LeanData will provide appropriate cooperation and input. Where the Parties are jointly responsible for certain activities, the Parties will collaborate in good faith to resolve issues in accordance with the relevant mutually agreed priorities and the other terms of this SOW.

A summary of scope assumptions, Customer's relevant use cases, and the Parties' respective responsibilities under this SOW appears below. LeanData has relied on this information in estimating the applicable fees, timeline, level of effort and resources required for the Professional Services under this SOW. This SOW is based on current assumptions and information currently known as of the SOW Effective Date. During the "Discovery" phase of the implementation, LeanData will gather additional detailed information about Customer's requirements and use cases, based upon which the scope of the implementation may change, resulting in a Post-Discovery Change Order mutually agreed by the Parties.`;
        
        let processedContent = textToHtml(fallbackText);
        setObjectivesDisclosureContent(processedContent);
      } finally {
        setLoading(false);
      }
    }

    loadObjectivesDisclosureContent();
  }, [customContent]);

  return (
    <div className="prose max-w-none text-left">
      {/* Key Objectives from table */}
      {keyObjectives && keyObjectives.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Key Objectives:</h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            {keyObjectives.map((objective, index) => (
              <li key={index}>{objective}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Project Details Section */}
      {projectDetails && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Project Details:</h3>
          <p className="mb-4 text-gray-700">
            The following are the high-level details as part of the implementation:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>
              <strong>Products:</strong> {projectDetails.products?.join(', ') || 'N/A'}
            </li>
            <li>
              <strong>Number of Units:</strong> {projectDetails.number_of_units || 'N/A'}
            </li>
            <li>
              <strong>Regions/Business Units:</strong> {projectDetails.regions || 'N/A'}
            </li>
            <li>
              <strong>Salesforce Tenants:</strong> {projectDetails.salesforce_tenants || 'N/A'}
            </li>
            <li>
              <strong>Timeline:</strong> {projectDetails.timeline_weeks || 'N/A'} weeks
            </li>
            <li>
              <strong>Start and End date:</strong> The start date of this SOW is one week after subscription start date and ends based on the number of weeks
            </li>
            <li>
              <strong>Units consumption:</strong> {projectDetails.units_consumption || 'N/A'}
            </li>
          </ul>
        </div>
      )}

      {/* Scope from table */}
      <div className="mb-6">
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          {deliverables.map((deliverable, index) => (
            <li key={index}>{deliverable}</li>
          ))}
        </ul>
      </div>

      {/* Objectives Disclosure Content */}
      {isEdited && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This content has been customized from the default template.
          </p>
        </div>
      )}
      
      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      ) : (
        <div 
          className="text-base leading-relaxed"
          dangerouslySetInnerHTML={{ __html: objectivesDisclosureContent }}
        />
      )}
    </div>
  );
} 