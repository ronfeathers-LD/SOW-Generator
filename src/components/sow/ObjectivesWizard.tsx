import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SOWData } from '@/types/sow';
import { SalesforceAccount } from '@/lib/salesforce';
import DocumentSelectionStep from './objectives-wizard/DocumentSelectionStep';
import AvomaSelectionStep from './objectives-wizard/AvomaSelectionStep';
import ContentPreviewStep from './objectives-wizard/ContentPreviewStep';
import AIGenerationStep from './objectives-wizard/AIGenerationStep';
import FinalEditStep from './objectives-wizard/FinalEditStep';

interface ObjectivesWizardProps {
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
}

export interface WizardStepData {
  selectedDocuments: Array<{
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    content?: string;
    wasTruncated?: boolean;
  }>;
  selectedMeetings: Array<{
    id: string;
    url: string;
    transcription?: string;
    title?: string;
    date?: string;
    status: 'pending' | 'completed' | 'failed';
  }>;
  previewContent: string;
  generatedObjectives: {
    overview: string;
    keyObjectives: string[];
    deliverables: string[];
    keyObjectivesHtml?: string;
    deliverablesHtml?: string;
  };
}

const STEPS = [
  { id: 'documents', title: 'Document Selection', description: 'Choose Google Drive documents' },
  { id: 'avoma', title: 'Avoma Calls', description: 'Select relevant meetings' },
  { id: 'preview', title: 'Content Preview', description: 'Review and edit content' },
  { id: 'generate', title: 'AI Generation', description: 'Generate objectives with AI' },
  { id: 'final', title: 'Final Edit', description: 'Edit and save results' },
];

const ObjectivesWizard = React.memo(function ObjectivesWizard({
  formData,
  setFormData,
  selectedAccount,
  selectedOpportunity,
}: ObjectivesWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardStepData>({
    selectedDocuments: formData.selected_documents || [],
    selectedMeetings: formData.selected_meetings || [],
    previewContent: formData.preview_content || '',
    generatedObjectives: {
      overview: formData.custom_objective_overview_content || formData.objectives?.description || '',
      keyObjectives: formData.objectives?.key_objectives || [],
      deliverables: formData.deliverables ? [formData.deliverables] : [],
      keyObjectivesHtml: formData.custom_key_objectives_content || '',
      deliverablesHtml: formData.custom_deliverables_content || '',
    },
  });

  // Ref to manage auto-save timeout
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref to access current formData without causing re-renders
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Load wizard data from formData on mount only
  useEffect(() => {
    setWizardData(prev => ({
      selectedDocuments: formData.selected_documents || prev.selectedDocuments || [],
      selectedMeetings: formData.selected_meetings || prev.selectedMeetings || [],
      previewContent: formData.preview_content || prev.previewContent || '', // ✅ Load from database or preserve existing
      generatedObjectives: {
        overview: formData.custom_objective_overview_content || formData.objectives?.description || prev.generatedObjectives.overview || '',
        keyObjectives: formData.objectives?.key_objectives || prev.generatedObjectives.keyObjectives || [],
        deliverables: formData.deliverables ? [formData.deliverables] : prev.generatedObjectives.deliverables || [],
        keyObjectivesHtml: formData.custom_key_objectives_content || prev.generatedObjectives.keyObjectivesHtml || '',
        deliverablesHtml: formData.custom_deliverables_content || prev.generatedObjectives.deliverablesHtml || '',
      },
    }));
  }, [formData.selected_documents, formData.selected_meetings, formData.preview_content, formData.custom_objective_overview_content, formData.objectives?.description, formData.objectives?.key_objectives, formData.deliverables, formData.custom_key_objectives_content, formData.custom_deliverables_content]); // ✅ Only trigger on specific field changes

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const updateWizardData = useCallback((updates: Partial<WizardStepData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
    
    // Persist selections to formData - only if they were actually updated
    const updatedFormData: Partial<SOWData> = {};
    
    // Only add fields that were actually updated
    if (updates.selectedDocuments) {
      updatedFormData.selected_documents = updates.selectedDocuments;
    }
    if (updates.selectedMeetings) {
      updatedFormData.selected_meetings = updates.selectedMeetings;
    }
    if (updates.previewContent !== undefined) {
      updatedFormData.preview_content = updates.previewContent;
    }
    
    if (updates.generatedObjectives) {
      updatedFormData.custom_objective_overview_content = updates.generatedObjectives.overview;
      updatedFormData.objective_overview_content_edited = true;
      updatedFormData.custom_key_objectives_content = updates.generatedObjectives.keyObjectivesHtml || '';
      updatedFormData.key_objectives_content_edited = true;
      updatedFormData.custom_deliverables_content = updates.generatedObjectives.deliverablesHtml || '';
      updatedFormData.deliverables_content_edited = true;
      updatedFormData.objectives = {
        ...(formDataRef.current.objectives || {}),
        description: updates.generatedObjectives.overview,
        key_objectives: updates.generatedObjectives.keyObjectives,
      };
      updatedFormData.deliverables = updates.generatedObjectives.deliverables.join('\n');
    }
    
    // Note: previewContent is now persisted to database via preview_content field
    
    if (Object.keys(updatedFormData).length > 0) {
      setFormData({ ...formDataRef.current, ...updatedFormData });
      
      // Auto-save to database if we have an SOW ID
      if (formDataRef.current.id) {
        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        
        // Set new timeout for auto-save
        autoSaveTimeoutRef.current = setTimeout(async () => {
          try {
            console.log('Auto-saving wizard data...', updatedFormData);
            const response = await fetch(`/api/sow/${formDataRef.current.id}/tab-update`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tab: 'Objectives',
                data: updatedFormData,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text().catch(() => 'Unknown error');
              console.error('Failed to auto-save wizard data:', response.status, errorText);
            } else {
              console.log('Wizard data auto-saved successfully');
            }
          } catch (error) {
            console.error('Error auto-saving wizard data:', error);
            // Don't throw - just log the error and continue
          }
        }, 1000); // 1 second debounce
      }
    }
  }, [setFormData]);

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((stepIndex: number) => {
    setCurrentStep(stepIndex);
  }, []);

  const renderCurrentStep = () => {
    const stepProps = {
      wizardData,
      updateWizardData,
      formData,
      setFormData,
      selectedAccount,
      selectedOpportunity,
      onNext: nextStep,
      onPrev: prevStep,
      onGoToStep: goToStep,
    };

    switch (currentStep) {
      case 0:
        return <DocumentSelectionStep {...stepProps} />;
      case 1:
        return <AvomaSelectionStep {...stepProps} />;
      case 2:
        return <ContentPreviewStep {...stepProps} />;
      case 3:
        return <AIGenerationStep {...stepProps} />;
      case 4:
        return <FinalEditStep {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Objectives Wizard</h2>
          <div className="flex items-center space-x-4">
            {/* Partner Badge - Only show if there's partner data */}
            {formData.salesforce_data?.opportunity_data?.is_partner_sourced && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-blue-900 font-medium text-sm">
                    Partner-Sourced
                    {formData.salesforce_data?.opportunity_data?.isv_partner_account_name && 
                      `: ${formData.salesforce_data.opportunity_data.isv_partner_account_name}`
                    }
                  </span>
                </div>
              </div>
            )}
            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {STEPS.length}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-4">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => goToStep(index)}
              className={`flex-1 text-left p-3 rounded-lg border transition-colors ${
                index === currentStep
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : index < currentStep
                  ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{step.title}</div>
              <div className="text-sm opacity-75">{step.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {renderCurrentStep()}
      </div>
    </div>
  );
});

export default ObjectivesWizard;
