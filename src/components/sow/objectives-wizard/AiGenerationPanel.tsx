import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SOWData } from '@/types/sow';
import { SalesforceAccount } from '@/lib/salesforce';
import { GeneratedObjectives } from '@/lib/sow/objectives-content';
import { WizardStepData } from './types';
import DocumentSelectionStep from './DocumentSelectionStep';
import AvomaSelectionStep from './AvomaSelectionStep';
import AIGenerationModal from './AIGenerationModal';

interface AiGenerationPanelProps {
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
  onGenerated: (generated: GeneratedObjectives) => void;
}

// generatedObjectives isn't used by this panel (AIGenerationModal's onSuccess
// result is handed straight to onGenerated, bypassing wizardData entirely) —
// it's only present because DocumentSelectionStep/AvomaSelectionStep/
// AIGenerationModal are typed against the full wizard-era WizardStepData shape.
const EMPTY_GENERATED_OBJECTIVES = { overview: '', keyObjectives: [], deliverables: [] };

// Simplified, synchronous version of ContentPreviewStep.generatePreviewContent —
// no loading state since there's nothing async here (document/transcript
// content is already resolved by the time it lands in wizardData).
function buildPreviewContent(
  selectedDocuments: WizardStepData['selectedDocuments'],
  selectedMeetings: WizardStepData['selectedMeetings'],
  selectedAccount?: SalesforceAccount | null,
  selectedOpportunity?: AiGenerationPanelProps['selectedOpportunity']
): string {
  let content = '';

  if (selectedAccount) {
    content += `Account: ${selectedAccount.Name || selectedAccount.name}\n`;
  }
  if (selectedOpportunity) {
    content += `Opportunity: ${selectedOpportunity.name}\n`;
    if (selectedOpportunity.description) {
      content += `Description: ${selectedOpportunity.description}\n`;
    }
  }
  content += '\n';

  if (selectedDocuments.length > 0) {
    content += '=== SELECTED DOCUMENTS ===\n';
    selectedDocuments.forEach((doc, index) => {
      content += `\nDocument ${index + 1}: ${doc.name}\n`;
      if (doc.content) {
        content += doc.content;
        if (doc.wasTruncated) {
          content += '\n[Document content was truncated due to length]';
        }
      } else {
        content += '[Document content not available]';
      }
      content += '\n';
    });
    content += '\n';
  }

  if (selectedMeetings.length > 0) {
    content += '=== SELECTED MEETINGS ===\n';
    selectedMeetings.forEach((meeting, index) => {
      content += `\nMeeting ${index + 1}: ${meeting.title || 'Untitled Meeting'}\n`;
      if (meeting.date) {
        content += `Date: ${meeting.date}\n`;
      }
      if (meeting.url) {
        content += `URL: ${meeting.url}\n`;
      }
      if (meeting.transcription) {
        content += `Transcription: ${meeting.transcription}\n`;
      } else {
        content += '[Transcription not available - will be fetched during AI processing]\n';
      }
      content += '\n';
    });
  }

  return content;
}

export default function AiGenerationPanel({
  formData,
  setFormData,
  selectedAccount,
  selectedOpportunity,
  onGenerated,
}: AiGenerationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [justRebuilt, setJustRebuilt] = useState(false);
  const rebuiltTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [wizardData, setWizardData] = useState<WizardStepData>(() => ({
    selectedDocuments: formData.selected_documents || [],
    selectedMeetings: formData.selected_meetings || [],
    previewContent: formData.preview_content || '',
    generatedObjectives: EMPTY_GENERATED_OBJECTIVES,
  }));

  // Resync from formData (e.g. initial async load completing after mount) —
  // mirrors ObjectivesWizard's load-on-mount-and-change effect.
  useEffect(() => {
    setWizardData(prev => ({
      ...prev,
      selectedDocuments: formData.selected_documents || prev.selectedDocuments,
      selectedMeetings: formData.selected_meetings || prev.selectedMeetings,
      previewContent: formData.preview_content || prev.previewContent,
    }));
  }, [formData.selected_documents, formData.selected_meetings, formData.preview_content]);

  useEffect(() => {
    return () => {
      if (rebuiltTimeoutRef.current) clearTimeout(rebuiltTimeoutRef.current);
    };
  }, []);

  // Persists selections to formData (selected_documents/selected_meetings/
  // preview_content) exactly as ObjectivesWizard.updateWizardData did, so
  // autosave (Task 5) picks them up.
  const updateWizardData = useCallback(
    (updates: Partial<WizardStepData>) => {
      setWizardData(prev => ({ ...prev, ...updates }));

      const patch: Partial<SOWData> = {};
      if (updates.selectedDocuments) {
        patch.selected_documents = updates.selectedDocuments;
      }
      if (updates.selectedMeetings) {
        patch.selected_meetings = updates.selectedMeetings;
      }
      if (updates.previewContent !== undefined) {
        patch.preview_content = updates.previewContent;
      }

      if (Object.keys(patch).length > 0) {
        setFormData({ ...formData, ...patch });
      }
    },
    [formData, setFormData]
  );

  const handleRebuild = useCallback(() => {
    const content = buildPreviewContent(
      wizardData.selectedDocuments,
      wizardData.selectedMeetings,
      selectedAccount,
      selectedOpportunity
    );
    updateWizardData({ previewContent: content });
    setJustRebuilt(true);
    if (rebuiltTimeoutRef.current) clearTimeout(rebuiltTimeoutRef.current);
    rebuiltTimeoutRef.current = setTimeout(() => setJustRebuilt(false), 2500);
  }, [wizardData.selectedDocuments, wizardData.selectedMeetings, selectedAccount, selectedOpportunity, updateWizardData]);

  // Auto-build preview content the first time sources are selected, same as
  // ContentPreviewStep did — but only while there's nothing there yet, so it
  // never clobbers a manual edit to the textarea.
  useEffect(() => {
    if (
      (wizardData.selectedDocuments.length > 0 || wizardData.selectedMeetings.length > 0) &&
      !wizardData.previewContent
    ) {
      handleRebuild();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardData.selectedDocuments.length, wizardData.selectedMeetings.length]);

  const hasDocumentContent = wizardData.selectedDocuments.some(doc => doc.content);
  const hasMeetingContent = wizardData.selectedMeetings.some(meeting => meeting.transcription);
  const hasSources = hasDocumentContent || hasMeetingContent;
  const canGenerate = hasSources || wizardData.previewContent.trim().length > 0;

  const handleModalSuccess = useCallback(
    (generated: {
      overview: string;
      keyObjectives: string[];
      deliverables: string[];
      keyObjectivesHtml?: string;
      deliverablesHtml?: string;
    }) => {
      onGenerated({
        overview: generated.overview,
        keyObjectivesHtml: generated.keyObjectivesHtml || '',
        deliverablesHtml: generated.deliverablesHtml || '',
        keyObjectives: generated.keyObjectives,
        deliverables: generated.deliverables,
      });
      setIsModalOpen(false);
      setIsExpanded(false);
    },
    [onGenerated]
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-dark-border dark:bg-dark-surface">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={isExpanded}
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-dark-text">
          ✨ Generate with AI — analyze call transcripts and documents
        </span>
        <svg
          className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform dark:text-dark-text-muted ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-6 border-t border-gray-200 p-4 dark:border-dark-border">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-dark-text">Documents</h4>
            <DocumentSelectionStep
              wizardData={wizardData}
              updateWizardData={updateWizardData}
              formData={formData}
              setFormData={setFormData}
              selectedAccount={selectedAccount}
              selectedOpportunity={selectedOpportunity}
              onNext={() => {}}
              onPrev={() => {}}
              onGoToStep={() => {}}
              setNav={() => {}}
            />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-dark-text">Avoma calls</h4>
            <AvomaSelectionStep
              wizardData={wizardData}
              updateWizardData={updateWizardData}
              formData={formData}
              setFormData={setFormData}
              selectedAccount={selectedAccount}
              selectedOpportunity={selectedOpportunity}
              onNext={() => {}}
              onPrev={() => {}}
              onGoToStep={() => {}}
              setNav={() => {}}
            />
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-dark-border">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(prev => !prev)}
              className="flex w-full items-center justify-between gap-3 p-3 text-left"
              aria-expanded={isPreviewOpen}
            >
              <span className="text-sm font-medium text-gray-900 dark:text-dark-text">
                Combined content preview
              </span>
              <svg
                className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform dark:text-dark-text-muted ${isPreviewOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isPreviewOpen && (
              <div className="space-y-3 border-t border-gray-200 p-3 dark:border-dark-border">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                    Rebuilds from the selected documents &amp; meetings, replacing any manual edits below.
                  </p>
                  <div className="flex items-center gap-2">
                    {justRebuilt && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400" role="status">
                        ✓ Rebuilt from sources
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleRebuild}
                      className="whitespace-nowrap rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-elevated"
                    >
                      Rebuild from sources
                    </button>
                  </div>
                </div>
                <textarea
                  value={wizardData.previewContent}
                  onChange={(e) => updateWizardData({ previewContent: e.target.value })}
                  placeholder="Content will be generated automatically from selected documents and meetings..."
                  className="h-64 w-full resize-none rounded border border-gray-300 p-3 font-mono text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-dark-border dark:bg-dark-elevated dark:text-dark-text"
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={!canGenerate}
              className="rounded-lg bg-[#26D07C] px-4 py-2 text-sm font-semibold text-[#2a2a2a] hover:bg-[#1fa968] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-dark-elevated dark:disabled:text-dark-text-subtle"
            >
              Generate objectives
            </button>
            {!canGenerate && (
              <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-muted">
                No content to analyze. Select documents or Avoma calls above, or add content to the preview.
              </p>
            )}
          </div>
        </div>
      )}

      <AIGenerationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        wizardData={wizardData}
        formData={formData}
        selectedAccount={selectedAccount}
      />
    </div>
  );
}
