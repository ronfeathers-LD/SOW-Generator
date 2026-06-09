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
      // Store AI output as both current content and baseline for edit detection
      updatedFormData.custom_objective_overview_content = updates.generatedObjectives.overview;
      updatedFormData.ai_generated_objective_overview_content = updates.generatedObjectives.overview;
      updatedFormData.objective_overview_content_edited = false;
      updatedFormData.custom_key_objectives_content = updates.generatedObjectives.keyObjectivesHtml || '';
      updatedFormData.ai_generated_key_objectives_content = updates.generatedObjectives.keyObjectivesHtml || '';
      updatedFormData.key_objectives_content_edited = false;
      updatedFormData.custom_deliverables_content = updates.generatedObjectives.deliverablesHtml || '';
      updatedFormData.ai_generated_deliverables_content = updates.generatedObjectives.deliverablesHtml || '';
      updatedFormData.deliverables_content_edited = false;
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
      {/* Compact, subordinate sub-stepper — a guided tool *within* the Scope
          phase, intentionally lighter than the main 4-phase progress so it no
          longer reads as a second top-level wizard. */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-border dark:bg-dark-surface">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 flex-shrink-0 text-[#26D07C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M19 17v4m-2-2h4M13 3l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700 dark:text-dark-text">Generate objectives with AI</span>
          </div>
          <div className="flex items-center gap-3">
            {formData.salesforce_data?.opportunity_data?.is_partner_sourced && (
              <span className="hidden items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-900 sm:inline-flex dark:bg-blue-900/30 dark:text-blue-200">
                Partner-Sourced
                {formData.salesforce_data?.opportunity_data?.isv_partner_account_name &&
                  `: ${formData.salesforce_data.opportunity_data.isv_partner_account_name}`}
              </span>
            )}
            <span className="whitespace-nowrap text-xs text-gray-400 dark:text-dark-text-subtle">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
        </div>
        <ol className="flex list-none items-center gap-1 pl-0">
          {STEPS.map((step, index) => {
            const done = index < currentStep;
            const active = index === currentStep;
            return (
              <React.Fragment key={step.id}>
                <li>
                  <button
                    type="button"
                    onClick={() => goToStep(index)}
                    className="group flex items-center gap-1.5"
                    title={step.description}
                  >
                    <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      active
                        ? 'bg-[#26D07C] text-[#2a2a2a]'
                        : done
                          ? 'bg-[#26D07C]/20 text-[#1fa968] dark:text-[#26D07C]'
                          : 'bg-gray-200 text-gray-500 dark:bg-dark-elevated dark:text-dark-text-subtle'
                    }`}>
                      {done ? '✓' : index + 1}
                    </span>
                    <span className={`hidden whitespace-nowrap text-xs lg:inline ${active ? 'font-medium text-gray-900 dark:text-dark-text' : 'text-gray-500 dark:text-dark-text-subtle'}`}>
                      {step.title}
                    </span>
                  </button>
                </li>
                {index < STEPS.length - 1 && (
                  <li aria-hidden className="h-px flex-1 bg-gray-200 dark:bg-dark-border" />
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </div>

      {/* Current Step Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {renderCurrentStep()}
      </div>
    </div>
  );
});

export default ObjectivesWizard;
