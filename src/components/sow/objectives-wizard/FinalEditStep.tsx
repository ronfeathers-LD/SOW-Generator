import React, { useState, useCallback } from 'react';
import { SOWData } from '@/types/sow';
import { SalesforceAccount } from '@/lib/salesforce';
import TipTapEditor from '../../TipTapEditor';
import { WizardStepData } from '../ObjectivesWizard';

interface FinalEditStepProps {
  wizardData: WizardStepData;
  updateWizardData: (updates: Partial<WizardStepData>) => void;
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  selectedAccount?: SalesforceAccount | null;
  selectedOpportunity?: {
    id: string;
    name: string;
    amount?: number;
    stageName?: string;
    closeDate?: string;
    description?: string;
  } | null;
  onNext: () => void;
  onPrev: () => void;
  onGoToStep: (step: number) => void;
}

const FinalEditStep: React.FC<FinalEditStepProps> = ({
  wizardData,
  updateWizardData,
  formData,
  setFormData,
  onPrev,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleObjectiveOverviewChange = useCallback((content: string) => {
    const updatedObjectives = {
      ...wizardData.generatedObjectives,
      overview: content,
    };
    updateWizardData({ generatedObjectives: updatedObjectives });
  }, [wizardData.generatedObjectives, updateWizardData]);

  const handleKeyObjectivesChange = useCallback((content: string) => {
    // Store the HTML content directly instead of converting to array
    // This preserves the formatting structure
    const updatedObjectives = {
      ...wizardData.generatedObjectives,
      keyObjectivesHtml: content,
    };
    updateWizardData({ generatedObjectives: updatedObjectives });
  }, [wizardData.generatedObjectives, updateWizardData]);

  const handleDeliverablesChange = useCallback((content: string) => {
    // Store the HTML content directly instead of converting to array
    // This preserves the formatting structure including headings
    const updatedObjectives = {
      ...wizardData.generatedObjectives,
      deliverablesHtml: content,
    };
    updateWizardData({ generatedObjectives: updatedObjectives });
  }, [wizardData.generatedObjectives, updateWizardData]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Prepare the data to save
      const saveData: Partial<SOWData> = {
        custom_objective_overview_content: wizardData.generatedObjectives.overview,
        objective_overview_content_edited: true,
        custom_key_objectives_content: wizardData.generatedObjectives.keyObjectivesHtml || 
          (wizardData.generatedObjectives.keyObjectives ? 
            wizardData.generatedObjectives.keyObjectives.map(obj => `<p>• ${obj}</p>`).join('') : ''),
        key_objectives_content_edited: true,
        custom_deliverables_content: wizardData.generatedObjectives.deliverablesHtml || 
          (wizardData.generatedObjectives.deliverables ? 
            wizardData.generatedObjectives.deliverables.map(del => `<p>${del}</p>`).join('') : ''),
        deliverables_content_edited: true,
        objectives: {
          ...formData.objectives,
          description: wizardData.generatedObjectives.overview,
          key_objectives: wizardData.generatedObjectives.keyObjectives,
        },
        deliverables: wizardData.generatedObjectives.deliverables.join('\n'),
        selected_documents: wizardData.selectedDocuments,
        selected_meetings: wizardData.selectedMeetings,
        preview_content: wizardData.previewContent,
      };

      // Update form data - merge with existing data to preserve ID and other fields
      setFormData({ ...formData, ...saveData });

      // If we have an SOW ID, save to database using tab-update endpoint
      if (formData.id) {
        const response = await fetch(`/api/sow/${formData.id}/tab-update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tab: 'Objectives',
            data: saveData,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to save objectives');
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      console.error('Error saving objectives:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save objectives');
    } finally {
      setIsSaving(false);
    }
  }, [wizardData, formData, setFormData]);

  // Use stored HTML content if available, otherwise convert array to proper HTML list
  const keyObjectivesHtml = wizardData.generatedObjectives.keyObjectivesHtml || 
    (wizardData.generatedObjectives.keyObjectives ? 
      `<ul class="list-disc pl-6 mb-4">${wizardData.generatedObjectives.keyObjectives.map(obj => `<li class="mb-1">${obj}</li>`).join('')}</ul>` : '');

  const deliverablesHtml = wizardData.generatedObjectives.deliverablesHtml || 
    (wizardData.generatedObjectives.deliverables ? 
      wizardData.generatedObjectives.deliverables.map(del => `<p>${del}</p>`).join('') : '');
  
  console.log('Final Edit Step - deliverablesHtml:', deliverablesHtml);
  console.log('Final Edit Step - raw deliverablesHtml:', wizardData.generatedObjectives.deliverablesHtml);
  console.log('Final Edit Step - deliverables array:', wizardData.generatedObjectives.deliverables);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 5: Final Edit & Save</h3>
        <p className="text-sm text-gray-600 mb-4">
          Review and edit the generated objectives, then save them to your SOW.
        </p>
      </div>

      {/* Save Status */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">✓ Objectives saved successfully!</p>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{saveError}</p>
        </div>
      )}

      {/* Objective Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold mb-4 text-gray-900">Objective Overview</h4>
        <TipTapEditor
          value={wizardData.generatedObjectives.overview}
          onChange={handleObjectiveOverviewChange}
          placeholder="Provide a high-level overview of what the project will entail..."
        />
        <p className="mt-1 text-sm text-gray-500">
          A high-level overview of what the project will entail.
        </p>
      </div>

      {/* Key Objectives */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold mb-4 text-gray-900">Key Objectives</h4>
        <p className="text-sm text-gray-600 mb-4">
          Pain points that the customer has outlined for us to solve. Use the toolbar to format with bullet points, numbered lists, and emphasis.
        </p>
        
        <TipTapEditor
          value={keyObjectivesHtml}
          onChange={handleKeyObjectivesChange}
          placeholder="Enter key objectives..."
        />
        <p className="mt-1 text-sm text-gray-500">
          Pain points that the customer has outlined for us to solve.
        </p>
      </div>

      {/* Deliverables */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold mb-4 text-gray-900">Deliverables</h4>
        <p className="text-sm text-gray-600 mb-4">
          Solutions to the pain points, utilizing LeanData products. Organize by product/category (LEANDATA ROUTING, LEANDATA BOOKIT, INTEGRATIONS, etc.).
        </p>
        
        <TipTapEditor
          value={deliverablesHtml}
          onChange={handleDeliverablesChange}
          placeholder="Enter deliverables..."
        />
        <p className="mt-1 text-sm text-gray-500">
          Solutions to the pain points, utilizing LeanData products.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <span className="font-medium">Documents Used:</span> {wizardData.selectedDocuments.length}
          </div>
          <div>
            <span className="font-medium">Meetings Used:</span> {wizardData.selectedMeetings.length}
          </div>
          <div>
            <span className="font-medium">Key Objectives:</span> {wizardData.generatedObjectives.keyObjectives.length}
          </div>
          <div>
            <span className="font-medium">Deliverables:</span> {wizardData.generatedObjectives.deliverables.length}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onPrev}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Previous: AI Generation
        </button>
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {isSaving ? 'Saving...' : 'Save Objectives'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalEditStep;




