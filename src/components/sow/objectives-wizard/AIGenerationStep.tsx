import React, { useState, useCallback } from 'react';
import { SOWData } from '@/types/sow';
import { SalesforceAccount } from '@/lib/salesforce';
import { WizardStepData } from '../ObjectivesWizard';
import AIGenerationModal from './AIGenerationModal';

interface AIGenerationStepProps {
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

const AIGenerationStep: React.FC<AIGenerationStepProps> = ({
  wizardData,
  updateWizardData,
  formData,
  selectedAccount,
  onNext,
  onPrev,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  

  const handleGenerationSuccess = useCallback((generatedObjectives: {
    overview: string;
    keyObjectives: string[];
    deliverables: string[];
    keyObjectivesHtml?: string;
    deliverablesHtml?: string;
  }) => {
    updateWizardData({ generatedObjectives });
    setIsModalOpen(false);
  }, [updateWizardData]);

  const handleGenerateClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 4: AI Generation</h3>
        <p className="text-sm text-gray-600 mb-4">
          Generate objectives, key points, and deliverables using AI analysis of your selected content.
        </p>
      </div>

      {/* Content Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Content to Analyze</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Documents:</span>
            <span className="ml-2 font-medium">{wizardData.selectedDocuments.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Meetings:</span>
            <span className="ml-2 font-medium">{wizardData.selectedMeetings.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Content Available:</span>
            <span className="ml-2 font-medium">
              {wizardData.selectedDocuments.some(doc => doc.content) || wizardData.selectedMeetings.some(meeting => meeting.transcription) 
                ? '✓ Yes' 
                : '✗ No'}
            </span>
          </div>
        </div>
      </div>

      {/* Generated Results Preview */}
      {wizardData.generatedObjectives.overview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Generated Results</h4>
            <button
              onClick={handleGenerateClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Regenerate with AI
            </button>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="font-medium text-green-900 mb-2">Objective Overview</h5>
            <p className="text-green-800 text-sm">{wizardData.generatedObjectives.overview}</p>
          </div>

          {wizardData.generatedObjectives.keyObjectives.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h5 className="font-medium text-green-900 mb-2">Key Objectives ({wizardData.generatedObjectives.keyObjectives.length})</h5>
              <ul className="text-green-800 text-sm space-y-1">
                {wizardData.generatedObjectives.keyObjectives.map((objective, index) => (
                  <li key={index}>{objective}</li>
                ))}
              </ul>
            </div>
          )}

          {(wizardData.generatedObjectives.deliverables.length > 0 || wizardData.generatedObjectives.deliverablesHtml) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h5 className="font-medium text-green-900 mb-2">
                Deliverables {wizardData.generatedObjectives.deliverablesHtml ? '' : `(${wizardData.generatedObjectives.deliverables.length} items)`}
              </h5>
              {wizardData.generatedObjectives.deliverablesHtml ? (
                <div 
                  className="text-green-800 text-sm prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: wizardData.generatedObjectives.deliverablesHtml }}
                />
              ) : (
                <div className="text-green-800 text-sm space-y-1">
                  {wizardData.generatedObjectives.deliverables.map((deliverable, index) => (
                    <div key={index}>{deliverable}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generation Button */}
      {!wizardData.generatedObjectives.overview && (
        <div className="text-center">
          <button
            onClick={handleGenerateClick}
            disabled={wizardData.selectedDocuments.length === 0 && wizardData.selectedMeetings.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            Generate Objectives with AI
          </button>
          {wizardData.selectedDocuments.length === 0 && wizardData.selectedMeetings.length === 0 && (
            <div className="text-sm text-gray-500 mt-2">
              <p>Please go back and select documents or meetings first</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onPrev}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Previous: Content Preview
        </button>
        <div className="flex space-x-3">
          {wizardData.generatedObjectives.overview && (
            <div className="text-sm text-green-600 self-center">
              ✓ Objectives generated successfully
            </div>
          )}
          <button
            onClick={onNext}
            disabled={!wizardData.generatedObjectives.overview}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next: Final Edit
          </button>
        </div>
      </div>

      {/* AI Generation Modal */}
      <AIGenerationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleGenerationSuccess}
        wizardData={wizardData}
        formData={formData}
        selectedAccount={selectedAccount}
      />
    </div>
  );
};

export default AIGenerationStep;
