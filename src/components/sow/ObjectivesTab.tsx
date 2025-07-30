import React, { useState } from 'react';
import { SOWData } from '@/types/sow';

interface ObjectivesTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
}

export default function ObjectivesTab({
  formData,
  setFormData,
}: ObjectivesTabProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Get customer name from form data
  const customerName = formData.template?.customer_name || formData.header?.client_name || '';

  const handleProjectDescriptionChange = (description: string) => {
    setFormData({
      ...formData,
      objectives: { 
        ...formData.objectives!, 
        description: description 
      }
    });
  };

  const handleKeyObjectivesChange = (objectives: string[]) => {
    setFormData({
      ...formData,
      objectives: { 
        ...formData.objectives!, 
        keyObjectives: objectives 
      }
    });
  };

  const handleTranscriptionChange = (transcription: string) => {
    setFormData({
      ...formData,
      objectives: { 
        ...formData.objectives!, 
        avomaTranscription: transcription 
      }
    });
    // Clear any previous analysis errors when transcription changes
    setAnalysisError(null);
  };

  const handleAnalyzeTranscription = async () => {
    const transcription = formData.objectives?.avomaTranscription;
    
    if (!transcription || !transcription.trim()) {
      setAnalysisError('Please paste a transcription first');
      return;
    }

    if (!customerName) {
      setAnalysisError('Customer name is required. Please complete the Customer Information tab first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    // Try up to 3 times with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Attempt ${attempt} to analyze transcription`);
        
        const response = await fetch('/api/gemini/analyze-transcription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript: transcription,
            customer_name: customerName
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to analyze transcription: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        // Validate the response structure
        if (!result.objective || !result.scope || !Array.isArray(result.scope)) {
          throw new Error('Invalid response format from AI analysis');
        }

        // Update the form with the generated objective and scope
        setFormData({
          ...formData,
          objectives: {
            ...formData.objectives!,
            description: result.objective,
            key_objectives: result.scope
          }
        });

        // Success - break out of retry loop
        break;

      } catch (error) {
        console.error(`Error analyzing transcription (attempt ${attempt}):`, error);
        
        if (attempt === 3) {
          // Final attempt failed
          setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze transcription after multiple attempts');
        } else {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    setIsAnalyzing(false);
  };

  return (
    <section className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Project Objectives</h2>
        
        {/* Scoping Call Transcription - Direct Input */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Scoping Call Transcription</h3>
          <p className="text-sm text-gray-600 mb-4">
            Paste the transcription from your scoping call below. This will help you generate clear project objectives.
          </p>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900">Call Transcription</h4>
                <p className="text-sm text-gray-600">
                  Copy the transcription from your Avoma meeting and paste it here
                </p>
              </div>
              {formData.objectives?.avoma_transcription && customerName && (
                <button
                  type="button"
                  onClick={handleAnalyzeTranscription}
                  disabled={isAnalyzing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Generate Objective & Scope
                    </>
                  )}
                </button>
              )}
            </div>
            
            <textarea
              value={formData.objectives?.avomaTranscription || ''}
              onChange={(e) => handleTranscriptionChange(e.target.value)}
              rows={12}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm"
              placeholder="Paste the transcription from your scoping call here..."
            />
            
            {analysisError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-red-700 text-sm">{analysisError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-blue-700 text-sm">
                    <strong>Tip:</strong> Once you paste the transcription, click "Generate Objective & Scope" to automatically create project objectives and scope items based on the call content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Description */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Project Description</h3>
          <textarea
            value={formData.objectives?.description || ''}
            onChange={(e) => handleProjectDescriptionChange(e.target.value)}
            rows={4}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Describe the overall objective and scope of this project..."
          />
          <p className="mt-1 text-sm text-gray-500">
            Provide a high-level description of what this project aims to achieve.
          </p>
        </div>

        {/* Key Objectives */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Key Objectives</h3>
          <p className="text-sm text-gray-600 mb-4">
            List the specific objectives that will be achieved through this project.
          </p>
          
          {(formData.objectives?.keyObjectives || ['']).map((objective, index) => (
            <div key={index} className="flex items-start space-x-3 mb-3">
              <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-1">
                <span className="text-indigo-600 text-sm font-medium">{index + 1}</span>
              </div>
              <div className="flex-1">
                <textarea
                  value={objective}
                  onChange={(e) => {
                    const newObjectives = [...(formData.objectives?.keyObjectives || [])];
                    newObjectives[index] = e.target.value;
                    handleKeyObjectivesChange(newObjectives);
                  }}
                  rows={2}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder={`Describe objective ${index + 1}...`}
                />
              </div>
              {(formData.objectives?.keyObjectives || []).length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const newObjectives = (formData.objectives?.keyObjectives || []).filter((_, i) => i !== index);
                    handleKeyObjectivesChange(newObjectives.length > 0 ? newObjectives : ['']);
                  }}
                  className="flex-shrink-0 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                  title="Remove objective"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={() => {
              const newObjectives = [...(formData.objectives?.keyObjectives || []), ''];
              handleKeyObjectivesChange(newObjectives);
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Objective
          </button>
        </div>
      </div>
    </section>
  );
} 