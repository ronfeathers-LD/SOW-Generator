import React, { useState, useCallback, useEffect } from 'react';
import { SOWData } from '@/types/sow';
import { SalesforceAccount } from '@/lib/salesforce';
import { WizardStepData } from '../ObjectivesWizard';

interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (generatedObjectives: {
    overview: string;
    keyObjectives: string[];
    deliverables: string[];
    keyObjectivesHtml?: string;
    deliverablesHtml?: string;
  }) => void;
  wizardData: WizardStepData;
  formData: Partial<SOWData>;
  selectedAccount?: SalesforceAccount | null;
}

const AIGenerationModal: React.FC<AIGenerationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  wizardData,
  formData,
  selectedAccount,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [messageTimer, setMessageTimer] = useState<NodeJS.Timeout | null>(null);

  const analysisMessages = [
    '🔍 Analyzing selected documents and meetings...',
    '🤖 Processing content with AI...',
    '📝 Generating objective overview...',
    '🎯 Creating key objectives...',
    '📋 Identifying deliverables...',
    '✨ Finalizing results...',
  ];

  const startAnalysisMessages = useCallback(() => {
    if (messageTimer) {
      clearInterval(messageTimer);
    }
    
    setCurrentMessage(0);
    
    const timer = setInterval(() => {
      setCurrentMessage(prev => {
        const next = prev + 1;
        if (next >= analysisMessages.length - 1) {
          if (messageTimer) {
            clearInterval(messageTimer);
          }
          return analysisMessages.length - 1;
        }
        return next;
      });
    }, 5000);
    
    setMessageTimer(timer);
  }, [messageTimer, analysisMessages.length]);

  const stopAnalysisMessages = useCallback(() => {
    if (messageTimer) {
      clearInterval(messageTimer);
      setMessageTimer(null);
    }
  }, [messageTimer]);

  const generateObjectives = useCallback(async () => {
    // Check if we have any content sources available
    const hasDocuments = wizardData.selectedDocuments.length > 0 && wizardData.selectedDocuments.some(doc => doc.content);
    const hasMeetings = wizardData.selectedMeetings.length > 0 && wizardData.selectedMeetings.some(meeting => meeting.transcription);
    
    if (!hasDocuments && !hasMeetings) {
      setError('No content available for AI analysis. Please go back and select documents or meetings with content.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    startAnalysisMessages();

    try {
      // Prepare transcription content from selected meetings
      const transcriptionContent = wizardData.selectedMeetings
        .map((meeting, index) => {
          const source = meeting.title || `Meeting ${index + 1}`;
          return `=== ${source} ===\n${meeting.transcription || '[Transcription not available]'}\n\n`;
        })
        .join('');

      // Prepare supporting documents content
      const supportingDocsContent = wizardData.selectedDocuments
        .map(doc => `${doc.name}:\n${doc.content || 'Content not available'}`)
        .join('\n\n');

      // Regenerate preview content if needed (it's not persisted to database)
      let previewContent = wizardData.previewContent;
      if (!previewContent.trim()) {
        previewContent = `${transcriptionContent}\n\n${supportingDocsContent}`.trim();
      }

      // Combine all content
      const combinedContent = `${previewContent}\n\n=== TRANSCRIPTIONS ===\n${transcriptionContent}\n\n=== SUPPORTING DOCUMENTS ===\n${supportingDocsContent}`;

      const customerName = selectedAccount?.Name || selectedAccount?.name || 'Customer';

      const response = await fetch('/api/gemini/analyze-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: combinedContent,
          customerName,
          existingDescription: formData.objectives?.description || '',
          existingObjectives: formData.objectives?.key_objectives || [],
          selectedProducts: formData.template?.products || [],
          supportingDocuments: supportingDocsContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to analyze content: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Validate the response structure
      if (!result.objectiveOverview || !result.solutions) {
        throw new Error('Invalid response format from AI analysis');
      }

      // Handle both painPoints and overcomingActions for backward compatibility
      let painPoints: string[] = [];
      
      if (result.painPoints && Array.isArray(result.painPoints)) {
        painPoints = result.painPoints;
      } else if (result.overcomingActions && Array.isArray(result.overcomingActions)) {
        painPoints = result.overcomingActions;
      }

      // Convert solutions object to HTML format for proper rendering
      let deliverablesHtml = '';
      if (result.solutions && typeof result.solutions === 'object') {
        Object.entries(result.solutions).forEach(([category, items]) => {
          if (Array.isArray(items)) {
            deliverablesHtml += `<h3 class="text-lg font-semibold mb-3 mt-4">${category}</h3>`;
            deliverablesHtml += '<ul class="list-disc pl-6 mb-4">';
            items.forEach((item: string) => {
              deliverablesHtml += `<li class="mb-1">${item}</li>`;
            });
            deliverablesHtml += '</ul>';
          }
        });
      }

      // Also create a plain text version for backward compatibility
      const deliverables: string[] = [];
      if (result.solutions && typeof result.solutions === 'object') {
        Object.entries(result.solutions).forEach(([category, items]) => {
          if (Array.isArray(items)) {
            deliverables.push(`${category}:`);
            items.forEach((item: string) => {
              deliverables.push(`  • ${item}`);
            });
          }
        });
      }

      // Convert key objectives to HTML format for proper rendering
      const keyObjectivesHtml = painPoints.length > 0 ? 
        `<ul class="list-disc pl-6 mb-4">${painPoints.map(obj => `<li class="mb-1">${obj}</li>`).join('')}</ul>` : '';

      // Call the success callback with generated content
      onSuccess({
        overview: result.objectiveOverview || '',
        keyObjectives: painPoints,
        deliverables: deliverables,
        keyObjectivesHtml: keyObjectivesHtml,
        deliverablesHtml: deliverablesHtml,
      });

      // Close the modal
      onClose();

    } catch (error) {
      console.error('Error generating objectives:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate objectives. Please try again.');
    } finally {
      setIsGenerating(false);
      stopAnalysisMessages();
    }
  }, [wizardData, formData, selectedAccount, onSuccess, onClose, startAnalysisMessages, stopAnalysisMessages]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (messageTimer) {
        clearInterval(messageTimer);
      }
    };
  }, [messageTimer]);

  // Auto-start generation when modal opens
  useEffect(() => {
    if (isOpen && !isGenerating) {
      generateObjectives();
    }
  }, [isOpen, isGenerating, generateObjectives]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">AI Generation</h3>
            {!isGenerating && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Content Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Content to Analyze</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Documents:</span>
                <span className="ml-2 font-medium">{wizardData.selectedDocuments.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Meetings:</span>
                <span className="ml-2 font-medium">{wizardData.selectedMeetings.length}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Content Available:</span>
                <span className="ml-2 font-medium">
                  {wizardData.selectedDocuments.some(doc => doc.content) || wizardData.selectedMeetings.some(meeting => meeting.transcription) 
                    ? '✓ Yes' 
                    : '✗ No'}
                </span>
              </div>
            </div>
          </div>

          {/* Generation Status */}
          {isGenerating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-blue-800 font-medium">{analysisMessages[currentMessage]}</p>
              <p className="text-blue-600 text-sm mt-2">This may take 30-60 seconds...</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">Generation Error</h4>
              <p className="text-red-800 text-sm">{error}</p>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={() => {
                    setError(null);
                    generateObjectives();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Success Message */}
          {!isGenerating && !error && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-green-600 text-4xl mb-2">✓</div>
              <p className="text-green-800 font-medium">Objectives generated successfully!</p>
              <p className="text-green-600 text-sm mt-1">You can now review and edit them in the Final Edit step.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIGenerationModal;
