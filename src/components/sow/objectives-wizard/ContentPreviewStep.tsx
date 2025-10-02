import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SOWData } from '@/types/sow';
import { SalesforceAccount } from '@/lib/salesforce';
import { WizardStepData } from '../ObjectivesWizard';

interface ContentPreviewStepProps {
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

const ContentPreviewStep: React.FC<ContentPreviewStepProps> = ({
  wizardData,
  updateWizardData,
  formData,
  selectedAccount,
  selectedOpportunity,
  onNext,
  onPrev,
}) => {
  const [previewContent, setPreviewContent] = useState(wizardData.previewContent || '');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with wizardData changes
  useEffect(() => {
    if (wizardData.previewContent !== previewContent) {
      setPreviewContent(wizardData.previewContent || '');
    }
  }, [wizardData.previewContent, previewContent]);

  // Generate preview content from selected documents and meetings
  const generatePreviewContent = useCallback(async () => {
    console.log('Generating preview content...', {
      documentsCount: wizardData.selectedDocuments.length,
      meetingsCount: wizardData.selectedMeetings.length,
      documents: wizardData.selectedDocuments,
      meetings: wizardData.selectedMeetings
    });
    
    setIsGeneratingPreview(true);
    
    try {
      let content = '';
      
      // Add account and opportunity context
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

      // Add selected documents content
      if (wizardData.selectedDocuments.length > 0) {
        content += '=== SELECTED DOCUMENTS ===\n';
        wizardData.selectedDocuments.forEach((doc, index) => {
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

      // Add selected meetings context
      if (wizardData.selectedMeetings.length > 0) {
        content += '=== SELECTED MEETINGS ===\n';
        wizardData.selectedMeetings.forEach((meeting, index) => {
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

      console.log('Generated content length:', content.length);
      console.log('Generated content preview:', content.substring(0, 200) + '...');
      setPreviewContent(content);
      // Always update wizard data with new content
      updateWizardData({ previewContent: content });
    } catch (error) {
      console.error('Error generating preview content:', error);
      setPreviewContent('Error generating preview content. Please try again.');
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [wizardData.selectedDocuments, wizardData.selectedMeetings, selectedAccount, selectedOpportunity, updateWizardData]); // Removed wizardData.previewContent to prevent circular dependency

  // Auto-generate preview when component mounts or selections change
  useEffect(() => {
    if ((wizardData.selectedDocuments.length > 0 || wizardData.selectedMeetings.length > 0) && !wizardData.previewContent) {
      generatePreviewContent();
    }
  }, [wizardData.selectedDocuments.length, wizardData.selectedMeetings.length, wizardData.selectedDocuments, wizardData.selectedMeetings, wizardData.previewContent, generatePreviewContent]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setPreviewContent(newContent);
    updateWizardData({ previewContent: newContent });
    
    // Auto-save to database if we have an SOW ID
    if (formData.id) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for debounced save
      autoSaveTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/sow/${formData.id}/tab-update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tab: 'Objectives',
              data: { preview_content: newContent },
            }),
          });
          
          if (!response.ok) {
            console.error('Failed to auto-save preview content');
          } else {
            console.log('Preview content auto-saved successfully');
          }
        } catch (error) {
          console.error('Error auto-saving preview content:', error);
        }
      }, 1000); // 1 second debounce
    }
  }, [updateWizardData, formData.id]);

  const handleNext = useCallback(() => {
    if (!previewContent.trim()) {
      alert('Please generate preview content before continuing.');
      return;
    }
    onNext();
  }, [previewContent, onNext]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 3: Content Preview</h3>
        <p className="text-sm text-gray-600 mb-4">
          Review and edit the content that will be sent to AI for generating objectives. 
          This includes selected documents and meeting information.
        </p>
      </div>

      {/* Content Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Content Summary</h4>
        
        {/* Header Row - Side by Side */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <span className="text-gray-600">Documents:</span>
            <span className="ml-2 font-medium">{wizardData.selectedDocuments.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Meetings:</span>
            <span className="ml-2 font-medium">{wizardData.selectedMeetings.length}</span>
          </div>
        </div>

        {/* Details - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Documents List */}
          <div>
            {wizardData.selectedDocuments.length > 0 && (
              <div className="space-y-1">
                {wizardData.selectedDocuments.map((doc, index) => (
                  <div key={doc.id} className="text-xs text-gray-700">
                    {index + 1}. {doc.name}
                    {doc.size && <span className="text-gray-500 ml-1">({parseInt(doc.size).toLocaleString()} chars)</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Meetings List */}
          <div>
            {wizardData.selectedMeetings.length > 0 && (
              <div className="space-y-1">
                {wizardData.selectedMeetings.map((meeting, index) => (
                  <div key={meeting.id} className="text-xs text-gray-700">
                    {index + 1}. {meeting.title || 'Untitled Meeting'}
                    {meeting.date && <span className="text-gray-500 ml-1">({new Date(meeting.date).toLocaleDateString()})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Content Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Preview Content</h4>
          <button
            onClick={generatePreviewContent}
            disabled={isGeneratingPreview}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isGeneratingPreview ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
        
        <div className="border border-gray-300 rounded-lg">
          <textarea
            value={previewContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Content will be generated automatically from selected documents and meetings..."
            className="w-full h-96 p-4 text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ minHeight: '400px' }}
          />
        </div>
        
        <div className="text-xs text-gray-500">
          Character count: {previewContent.length.toLocaleString()}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Review the generated content to ensure it includes all relevant information</li>
          <li>• Edit or remove any content that is not relevant to the project objectives</li>
          <li>• Add any additional context that might help the AI generate better objectives</li>
          <li>• The content will be sent to AI in the next step to generate objectives</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onPrev}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Previous: Avoma Calls
        </button>
        <div className="flex space-x-3">
          <div className="text-sm text-gray-500 self-center">
            {previewContent.length > 0 ? 'Content ready' : 'No content'}
          </div>
          <button
            onClick={handleNext}
            disabled={!previewContent.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next: AI Generation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentPreviewStep;
