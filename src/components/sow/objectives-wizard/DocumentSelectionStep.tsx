import React, { useState, useCallback, useEffect } from 'react';
import { SOWData } from '@/types/sow';
import { SalesforceAccount } from '@/lib/salesforce';
import GoogleDriveDocumentSelector from '../../GoogleDriveDocumentSelector';
import { WizardStepData } from '../ObjectivesWizard';

interface DocumentSelectionStepProps {
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

const DocumentSelectionStep: React.FC<DocumentSelectionStepProps> = ({
  wizardData,
  updateWizardData,
  selectedAccount,
  onNext,
}) => {
  const [isPreloading, setIsPreloading] = useState(false);

  // Get customer name from selected account
  const customerName = selectedAccount?.Name || selectedAccount?.name || '';

  // Start preloading Google Drive data immediately when component mounts
  useEffect(() => {
    if (customerName) {
      setIsPreloading(true);
      // Trigger preload in GoogleDriveDocumentSelector
      const event = new CustomEvent('preloadGoogleDrive', { 
        detail: { customerName } 
      });
      window.dispatchEvent(event);
    }
  }, [customerName]);

  const handleDocumentsChange = useCallback((documents: Array<{
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    content?: string;
    wasTruncated?: boolean;
  }>) => {
    updateWizardData({ selectedDocuments: documents });
  }, [updateWizardData]);

  const handleNext = useCallback(() => {
    // Document selection is optional, proceed to next step
    onNext();
  }, [onNext]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 1: Document Selection</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select Google Drive documents that contain relevant information for generating project objectives.
          {customerName && isPreloading && (
            <span className="block mt-1 text-blue-600 flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              📁 Automatically searching for &quot;{customerName}&quot; folder...
            </span>
          )}
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <GoogleDriveDocumentSelector
          onDocumentsSelected={handleDocumentsChange}
          selectedDocuments={wizardData.selectedDocuments}
          customerName={customerName}
          onLoadingChange={setIsPreloading}
        />
      </div>


      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          {wizardData.selectedDocuments.length} document(s) selected
          {isPreloading && <span className="ml-2 text-blue-600">• Searching folders...</span>}
          {wizardData.selectedDocuments.length > 0 && <span className="ml-2 text-green-600">• Auto-saved</span>}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleNext}
            disabled={isPreloading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next: Avoma Calls
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentSelectionStep;
