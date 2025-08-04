import React, { useState } from 'react';
import { SOWData } from '@/types/sow';
import WYSIWYGEditor from '../WYSIWYGEditor';

interface ObjectivesTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  selectedAccount?: { id: string; name: string } | null;
}

export default function ObjectivesTab({
  formData,
  setFormData,
  selectedAccount,
}: ObjectivesTabProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingTranscription, setIsFetchingTranscription] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  // Get customer name from selected account
  const customerName = selectedAccount?.name || '';
  
  // Debug logging for Avoma URL
  console.log('ObjectivesTab - formData.objectives:', formData.objectives);
  console.log('ObjectivesTab - avoma_url:', formData.objectives?.avoma_url);

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
        key_objectives: objectives 
      }
    });
  };

  const handleAvomaUrlChange = (url: string) => {
    setFormData({
      ...formData,
      objectives: { 
        ...formData.objectives!, 
        avoma_url: url 
      }
    });
  };

  const handleTranscriptionChange = (transcription: string) => {
    setFormData({
      ...formData,
      objectives: { 
        ...formData.objectives!, 
        avoma_transcription: transcription 
      }
    });
    // Clear any previous analysis errors when transcription changes
    setAnalysisError(null);
    setTranscriptionError(null);
  };

  const handleFetchTranscription = async () => {
    const currentAvomaUrl = formData.objectives?.avoma_url || '';
    if (!currentAvomaUrl.trim()) {
      setTranscriptionError('Please enter an Avoma meeting URL');
      return;
    }

    setIsFetchingTranscription(true);
    setTranscriptionError(null);

    try {
      const response = await fetch('/api/avoma/transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avomaUrl: currentAvomaUrl.trim()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch transcription');
      }

      if (result.transcription) {
        handleTranscriptionChange(result.transcription);
        // Keep the URL in the form data (don't clear it)
      } else {
        throw new Error('No transcription content received');
      }

    } catch (error) {
      console.error('Error fetching transcription:', error);
      setTranscriptionError(error instanceof Error ? error.message : 'Failed to fetch transcription');
    } finally {
      setIsFetchingTranscription(false);
    }
  };

  const handleAnalyzeTranscription = async () => {
    const transcription = formData.objectives?.avoma_transcription;
    
    if (!transcription || !transcription.trim()) {
      setAnalysisError('Please paste a transcription first');
      return;
    }

    if (!customerName) {
      setAnalysisError('Customer name is required. Please select an account in the Customer Information tab first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/gemini/analyze-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcription,
          customerName: customerName,
          existingDescription: formData.objectives?.description || '',
          existingObjectives: formData.objectives?.key_objectives || [],
          selectedProducts: formData.template?.products || []
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

      // Check for Gemini API overload errors
      if (result.objective.includes('model is overloaded') || result.objective.includes('Service Unavailable')) {
        throw new Error('AI service is currently overloaded. Please wait a few minutes and try again.');
      }

      // Check for other Gemini API errors
      if (result.objective.includes('could not be generated')) {
        throw new Error('AI analysis failed. Please try again in a few minutes.');
      }


      
      // Update the form with the generated objective and scope
      // Handle the new JSON structure where scope is an array of objects with product and items
      let generatedKeyObjectives: string[] = [];
      
      if (Array.isArray(result.scope)) {
        // Check if it's the new format (array of objects with product and items)
        if (result.scope.length > 0 && typeof result.scope[0] === 'object' && result.scope[0].hasOwnProperty('product')) {
          // New format: include product names as headers with their items
          result.scope.forEach((productGroup: any) => {
            if (productGroup.product && productGroup.items && Array.isArray(productGroup.items)) {
              // Add product name as a header
              const headerText = `${productGroup.product}:`;
              generatedKeyObjectives.push(headerText);
              
              // Add items under this product
              productGroup.items.forEach((item: any) => {
                if (typeof item === 'string' && item.trim().length > 0) {
                  // Remove any existing numbering and convert to bullet point format
                  const cleanItem = item.replace(/^\d+\.\s*/, '').trim();
                  const bulletItem = `• ${cleanItem}`;
                  generatedKeyObjectives.push(bulletItem);
                }
              });
              
              // Add a blank line between product groups for better formatting
              generatedKeyObjectives.push('');
            }
          });
          
          // Remove the last empty line if it exists
          if (generatedKeyObjectives.length > 0 && generatedKeyObjectives[generatedKeyObjectives.length - 1] === '') {
            generatedKeyObjectives.pop();
          }
        } else {
          // Old format: simple array of strings
          generatedKeyObjectives = result.scope
            .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
            .map((item: string, index: number) => {
              // Remove any existing numbering and convert to bullet point format
              const cleanItem = item.replace(/^\d+\.\s*/, '').trim();
              return cleanItem;
            });
        }
      }
      

      
      // Ensure we have valid objectives
      const finalObjectives = generatedKeyObjectives.length > 0 ? generatedKeyObjectives : [''];
      
      const updatedFormData = {
        ...formData,
        objectives: {
          ...formData.objectives!,
          description: result.objective,
          key_objectives: finalObjectives
        }
      };
      
      // Show fallback warning if applicable
      if (result.isFallback) {
        setAnalysisError('Note: AI response was generated using fallback parsing due to formatting issues. Please review the content carefully.');
      }
      
      console.log('Updated form data:', updatedFormData);
      console.log('Final objectives being set:', finalObjectives);
      setFormData(updatedFormData);

    } catch (error) {
      console.error('Error analyzing transcription:', error);
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        // API key or configuration issues
        if (errorMessage.includes('API key not valid') || 
            errorMessage.includes('API_KEY_INVALID') ||
            errorMessage.includes('not configured')) {
          setAnalysisError('Gemini AI is not properly configured. Please contact your administrator to set up the API key.');
          return;
        }
        
        // Network or other errors
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          setAnalysisError('Network error occurred. Please check your connection and try again.');
          return;
        }
        
        // Generic error handling
        setAnalysisError(errorMessage);
      } else {
        setAnalysisError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  
  
  return (
    <section className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Project Objectives & Scope</h2>
        
        {/* Customer Name and Avoma URL Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Customer & Avoma Integration</h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter an Avoma meeting URL to automatically fetch the transcription and generate objectives.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
              {/* Left Column - Customer Name */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Customer Name</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Customer name from selected account in Customer Information tab
                </p>
                <input
                  type="text"
                  value={customerName}
                  onChange={() => {}} // Read-only
                  placeholder="Select an account in Customer Information tab..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                  disabled
                />
              </div>
              
              {/* Right Column - Avoma URL with Search Link */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Avoma Meeting URL</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Paste the URL from your Avoma meeting or search for meetings
                </p>
                <div className="space-y-2">
                  <input
                    type="url"
                    value={formData.objectives?.avoma_url || ''}
                    onChange={(e) => handleAvomaUrlChange(e.target.value)}
                    placeholder="https://app.avoma.com/meetings/..."
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {customerName && (
                    <a
                      href={`https://app.avoma.com/search?q=${customerName.split(' ').join('%2C')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search Avoma for "{customerName}" meetings
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                
              </div>
              <button
                type="button"
                onClick={handleFetchTranscription}
                disabled={isFetchingTranscription || !(formData.objectives?.avoma_url || '').trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingTranscription ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fetching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                    </svg>
                    Fetch Transcription
                  </>
                )}
              </button>
            </div>
            

            
            {transcriptionError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-red-700 text-sm">{transcriptionError}</p>
                  </div>
                </div>
              </div>
            )}
            

          </div>
        </div>

        {/* Call Transcription - Full Width */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Call Transcription</h3>
              <p className="text-sm text-gray-600">
                Review the transcription from your scoping call
              </p>
            </div>
            {formData.objectives?.avoma_transcription && customerName && (
              <button
                type="button"
                onClick={() => handleAnalyzeTranscription()}
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
                    Generate Content
                  </>
                )}
              </button>
            )}
          </div>
          
          <textarea
            value={formData.objectives?.avoma_transcription || ''}
            onChange={(e) => handleTranscriptionChange(e.target.value)}
            rows={7}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm"
            placeholder="Paste the transcription from your scoping call here, or use the Avoma integration above to fetch it automatically..."
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
        </div>

        {/* Full Width Layout */}
        <div className="space-y-6">
            {/* Project Description */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
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
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Key Objectives</h3>
              <p className="text-sm text-gray-600 mb-4">
                List the specific objectives that will be achieved through this project. Use the toolbar to format with bullet points, numbered lists, and emphasis.
              </p>
              
              <WYSIWYGEditor
                value={(() => {
                  const objectives = formData.objectives?.key_objectives || [];
                  
                  if (!Array.isArray(objectives) || objectives.length === 0) {
                    return '';
                  }
                  
                  // Convert array to HTML format - handle both simple items and structured content
                  let htmlValue = '';
                  let currentList = '';
                  
                  objectives.forEach(obj => {
                    if (!obj || typeof obj !== 'string') return;
                    
                    const trimmedObj = obj.trim();
                    if (trimmedObj.length === 0) return;
                    
                    // Check if this is a product header with markdown (starts with ** and ends with **:)
                    if (trimmedObj.startsWith('**') && trimmedObj.endsWith(':**')) {
                      // Close any existing list
                      if (currentList) {
                        htmlValue += `<ul>${currentList}</ul>`;
                        currentList = '';
                      }
                      // Add the product header - strip markdown
                      const headerText = trimmedObj.replace(/^\*\*(.*?)\*\*:$/, '$1');
                      htmlValue += `<h4 class="font-semibold text-gray-900 mt-4 mb-2">${headerText}</h4>`;
                    }
                    // Check if this is a product header (ends with :) - but not markdown
                    else if (trimmedObj.endsWith(':')) {
                      // Close any existing list
                      if (currentList) {
                        htmlValue += `<ul>${currentList}</ul>`;
                        currentList = '';
                      }
                      // Add the product header
                      const headerText = trimmedObj.slice(0, -1); // Remove the trailing colon
                      htmlValue += `<h4 class="font-semibold text-gray-900 mt-4 mb-2">${headerText}</h4>`;
                    }
                    // Check if this is a bullet point (starts with •)
                    else if (trimmedObj.startsWith('• ')) {
                      const itemText = trimmedObj.substring(2); // Remove the • and space
                      currentList += `<li>${itemText}</li>`;
                    }
                    // Check if this is an empty line
                    else if (trimmedObj === '') {
                      // Close any existing list
                      if (currentList) {
                        htmlValue += `<ul>${currentList}</ul>`;
                        currentList = '';
                      }
                    }
                    // Regular item (fallback)
                    else {
                      currentList += `<li>${trimmedObj}</li>`;
                    }
                  });
                  
                  // Close any remaining list
                  if (currentList) {
                    htmlValue += `<ul>${currentList}</ul>`;
                  }
                  
                  // If no structured content was found, fall back to simple list
                  if (htmlValue === '') {
                    const listItems = objectives
                      .map(obj => obj && typeof obj === 'string' ? obj.trim() : '')
                      .filter(obj => obj.length > 0)
                      .map(obj => `<li>${obj}</li>`)
                      .join('');
                    htmlValue = `<ul>${listItems}</ul>`;
                  }
                  return htmlValue;
                })()}
                onChange={(value) => {
                  // Convert the rich text content back to an array of objectives
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = value;
                  
                  const objectives: string[] = [];
                  
                  // Process all child nodes to maintain structure
                  Array.from(tempDiv.childNodes).forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                      const element = node as Element;
                      
                      if (element.tagName === 'H4') {
                        // This is a product header
                        let headerText = element.textContent?.trim() || '';
                        // Strip any markdown that might have been re-introduced
                        headerText = headerText.replace(/^\*\*(.*?)\*\*$/, '$1').trim();
                        if (headerText) {
                          objectives.push(`${headerText}:`);
                        }
                      } else if (element.tagName === 'UL') {
                        // This is a list of items
                        const listItems = Array.from(element.querySelectorAll('li'))
                          .map(li => li.textContent?.trim() || '')
                          .filter(text => text.length > 0)
                          .map(text => `• ${text}`);
                        
                        objectives.push(...listItems);
                        
                        // Add empty line after list for spacing
                        if (listItems.length > 0) {
                          objectives.push('');
                        }
                      }
                    }
                  });
                  
                  // Remove trailing empty line
                  if (objectives.length > 0 && objectives[objectives.length - 1] === '') {
                    objectives.pop();
                  }
                  
                  // Fallback: if no structured content found, try simple list parsing
                  if (objectives.length === 0) {
                    const listItems = Array.from(tempDiv.querySelectorAll('li'))
                      .map(li => li.textContent?.trim() || '')
                      .filter(text => text.length > 0);
                    
                    const fallbackItems = value
                      .split(/\n/)
                      .map(line => line.trim())
                      .filter(line => line.length > 0 && !line.startsWith('<'))
                      .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
                      .filter(line => line.length > 0);
                    
                    const fallbackObjectives = listItems.length > 0 ? listItems : fallbackItems;
                    objectives.push(...fallbackObjectives);
                  }
                  
                  setFormData({
                    ...formData,
                    objectives: {
                      ...formData.objectives!,
                      key_objectives: objectives.length > 0 ? objectives : ['']
                    }
                  });
                }}
                placeholder="Enter project objectives here. Use bullet points or numbered lists for better organization..."
              />
            </div>
        </div>
      </div>
    </section>
  );
} 