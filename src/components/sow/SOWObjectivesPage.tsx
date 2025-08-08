'use client';

import { useState, useEffect } from 'react';
import { getContentTemplate } from '@/lib/sow-content';
import { processContent } from '@/lib/text-to-html';

interface SOWObjectivesPageProps {
  deliverables: string[]; 
  keyObjectives: string[];
  projectDescription?: string;
  customContent?: string;
  customKeyObjectivesContent?: string;
  customDeliverablesContent?: string;
  deliverablesEdited?: boolean;
  keyObjectivesEdited?: boolean;
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
    orchestration_units?: string;
    bookit_forms_units?: string;
    bookit_links_units?: string;
    bookit_handoff_units?: string;
  };
}

export default function SOWObjectivesPage({ 
  keyObjectives, 
  projectDescription,
  customContent,
  customKeyObjectivesContent,
  projectDetails 
}: SOWObjectivesPageProps) {
  const [objectivesDisclosureContent, setObjectivesDisclosureContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadObjectivesDisclosureContent() {
      try {
        if (customContent) {
          // Use custom content if provided (edited by user)
          const processedContent = processContent(customContent);
          setObjectivesDisclosureContent(processedContent);
          setLoading(false);
          return;
        }

        // Fallback to template content
        const template = await getContentTemplate('objectives-disclosure');
        if (template) {
          const processedContent = processContent(template.default_content);
          setObjectivesDisclosureContent(processedContent);
        } else {
          // Fallback to generic message if no template found
          const fallbackText = `<div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <p class="text-yellow-800 font-medium">⚠️ NOTE: This is fallback content</p>
            <p class="text-yellow-700 text-sm mt-1">The Objectives Disclosure section template could not be loaded. Please configure the content template in the admin panel.</p>
          </div>`;
          
          setObjectivesDisclosureContent(fallbackText);
        }
      } catch (error) {
        console.error('Error loading objectives disclosure content:', error);
        // Fallback to generic message if error occurs
        const fallbackText = `<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p class="text-red-800 font-medium">⚠️ NOTE: This is fallback content</p>
          <p class="text-red-700 text-sm mt-1">An error occurred while loading the Objectives Disclosure section template. Please check the configuration and try again.</p>
        </div>`;
        
        setObjectivesDisclosureContent(fallbackText);
      } finally {
        setLoading(false);
      }
    }

    loadObjectivesDisclosureContent();
  }, [customContent]);

  return (
    <div className="max-w-none text-left">
      {/* Project Description */}
      {projectDescription && projectDescription.trim() && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Objective:</h3>
          <div 
            className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: projectDescription }}
          />
        </div>
      )}

      {/* Key Objectives */}
      {(customKeyObjectivesContent || (keyObjectives && keyObjectives.length > 0)) && (
        <div className="mb-6">
          <p>The Key Objectives for the program include:
          </p>
          {customKeyObjectivesContent ? (
            <div 
              className="text-base leading-relaxed text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: customKeyObjectivesContent }}
            />
          ) : (
            <div className="space-y-4 text-gray-700">
              {keyObjectives.map((objective, index) => {
                const trimmedObjective = objective.trim();
                
                // Skip empty lines
                if (trimmedObjective.length === 0) {
                  return null;
                }
                
                // Check if this is a product header (ends with :)
                if (trimmedObjective.endsWith(':')) {
                  return (
                    <div key={index}>
                      <h4 className="font-semibold text-gray-900 mt-4 mb-2">
                        {trimmedObjective.slice(0, -1)} {/* Remove the trailing colon */}
                      </h4>
                    </div>
                  );
                }
                
                // Check if this is a bullet point (starts with •)
                if (trimmedObjective.startsWith('• ')) {
                  return (
                    <div key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2 mt-1">•</span>
                      <span className="flex-1">{trimmedObjective.substring(2)}</span>
                    </div>
                  );
                }
                
                // Regular item (fallback)
                return (
                  <div key={index} className="flex items-start">
                    <span className="text-gray-400 mr-2 mt-1">•</span>
                    <span className="flex-1">{trimmedObjective}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Project Details Section */}
      {projectDetails && (
        <div className="mb-6">
          <p className="mb-4">
            The following are the high-level details as part of the implementation:
          </p>
          <ul className="list-disc pl-6 prose prose-md max-w-none">
            <li>
              Products: {projectDetails.products?.join(', ') || 'N/A'}
            </li>
            <li>
              Number of Units (Legacy): {projectDetails.number_of_units || 'N/A'}
            </li>
            <li>
              Regions/Business Units: {projectDetails.regions || 'N/A'}
            </li>
            <li>
              Salesforce Tenants: {projectDetails.salesforce_tenants || 'N/A'}
            </li>
            <li>
              Timeline: {projectDetails.timeline_weeks || 'N/A'} weeks
            </li>
            <li>
              Start and End date: The start date of this SOW is one week after subscription start date and ends based on the number of weeks
            </li>
            <li>
              Units consumption: {projectDetails.units_consumption || 'N/A'}
            </li>
          </ul>
          
          {/* BookIt Family Units */}
          {(projectDetails.orchestration_units || projectDetails.bookit_forms_units || projectDetails.bookit_links_units || projectDetails.bookit_handoff_units) && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold mb-2">BookIt Family Units:</h4>
              <ul className="list-disc pl-6 prose prose-md max-w-none">
                {projectDetails.orchestration_units && projectDetails.orchestration_units.trim() !== '' && (
                  <li>Orchestration Units: {projectDetails.orchestration_units}</li>
                )}
                {projectDetails.bookit_forms_units && projectDetails.bookit_forms_units.trim() !== '' && (
                  <li>BookIt for Forms Units: {projectDetails.bookit_forms_units}</li>
                )}
                {projectDetails.bookit_links_units && projectDetails.bookit_links_units.trim() !== '' && (
                  <li>BookIt Links Units: {projectDetails.bookit_links_units}</li>
                )}
                {projectDetails.bookit_handoff_units && projectDetails.bookit_handoff_units.trim() !== '' && (
                  <li>BookIt Handoff Units: {projectDetails.bookit_handoff_units}</li>
                )}
              </ul>
            </div>
          )}
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