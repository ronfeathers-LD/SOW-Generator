import React, { useState } from 'react';
import { SOWData } from '@/types/sow';
import TipTapEditor from '../TipTapEditor';
import LoadingModal from '../ui/LoadingModal';
import GoogleDriveDocumentSelector from '../GoogleDriveDocumentSelector';

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

  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Array<{
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    content?: string;
    wasTruncated?: boolean;
  }>>([]);
  
  // Rotating messages for analysis process
  const [currentAnalysisMessage, setCurrentAnalysisMessage] = useState(0);
  const [analysisMessageTimer, setAnalysisMessageTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Google Drive preloading state
  const [isGoogleDrivePreloading, setIsGoogleDrivePreloading] = useState(false);
  
  // Multiple Avoma recordings support
  const [newAvomaUrl, setNewAvomaUrl] = useState('');

  // Get customer name from selected account or form data
  const customerName = selectedAccount?.name || formData.template?.client_name || formData.header?.client_name || '';

  // Clever messages for the analysis process
  const analysisMessages = [
    "🤖 AI is analyzing your scoping call...",
    "🧠 Extracting key pain points and objectives...",
    "💡 Identifying business challenges and opportunities...",
    "🎯 Mapping solutions to LeanData products...",
    "📝 Crafting compelling project descriptions...",
    "🔍 Analyzing customer needs and requirements...",
    "💼 Structuring deliverables and timelines...",
    "🚀 Preparing your SOW foundation...",
    "📊 Organizing project scope and objectives...",
    "✨ Almost there, finalizing your analysis..."
  ];

  // Function to start rotating messages
  const startAnalysisMessages = () => {
    const timer = setInterval(() => {
      setCurrentAnalysisMessage(prev => (prev + 1) % analysisMessages.length);
    }, 3000); // Change message every 3 seconds
    setAnalysisMessageTimer(timer);
  };

  // Function to stop rotating messages
  const stopAnalysisMessages = () => {
    if (analysisMessageTimer) {
      clearInterval(analysisMessageTimer);
      setAnalysisMessageTimer(null);
    }
    setCurrentAnalysisMessage(0);
  };

  // Cleanup effect for timers
  React.useEffect(() => {
    return () => {
      if (analysisMessageTimer) {
        clearInterval(analysisMessageTimer);
      }
    };
  }, [analysisMessageTimer]);
  
  // Start preloading Google Drive data immediately when page loads
  React.useEffect(() => {
    if (customerName) {
      setIsGoogleDrivePreloading(true);
      // Trigger preload in GoogleDriveDocumentSelector
      const event = new CustomEvent('preloadGoogleDrive', { 
        detail: { customerName } 
      });
      window.dispatchEvent(event);
    }
  }, [customerName]);





  const handleTranscriptionChange = (transcription: string) => {
    setFormData({
      ...formData,
      objectives: { 
        ...formData.objectives!, 
        avoma_transcription: transcription 
      }
    });
    // Clear any previous transcription errors when transcription changes
    setTranscriptionError(null);
  };

  // Add new Avoma recording
  const handleAddAvomaRecording = async () => {
    if (!newAvomaUrl.trim()) return;
    
    const newRecording = {
      id: Date.now().toString(), // Simple ID generation
      url: newAvomaUrl.trim(),
      status: 'pending' as const,
      title: `Recording ${(formData.objectives?.avoma_recordings?.length || 0) + 1}`,
      date: new Date().toISOString()
    };
    
    const updatedRecordings = [
      ...(formData.objectives?.avoma_recordings || []),
      newRecording
    ];
    
    setFormData({
      ...formData,
      objectives: {
        ...formData.objectives!,
        avoma_recordings: updatedRecordings
      }
    });
    
    setNewAvomaUrl('');
    
    // Automatically fetch transcription for the new recording
    await handleFetchTranscriptionForRecording(newRecording.id);
  };

  // Remove Avoma recording
  const handleRemoveAvomaRecording = (recordingId: string) => {
    const updatedRecordings = (formData.objectives?.avoma_recordings || [])
      .filter(recording => recording.id !== recordingId);
    
    setFormData({
      ...formData,
      objectives: {
        ...formData.objectives!,
        avoma_recordings: updatedRecordings
      }
    });
  };

  // Fetch transcription for a specific recording
  const handleFetchTranscriptionForRecording = async (recordingId: string) => {
    const recording = formData.objectives?.avoma_recordings?.find(r => r.id === recordingId);
    if (!recording) return;
    
    setIsFetchingTranscription(true);
    setTranscriptionError(null);
    
    try {
      const response = await fetch('/api/avoma/transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avomaUrl: recording.url.trim()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch transcription');
      }

      // Update the specific recording with transcription
      const updatedRecordings = (formData.objectives?.avoma_recordings || []).map(r => 
        r.id === recordingId 
          ? { ...r, transcription: result.transcription, status: 'completed' as const }
          : r
      );
      
      setFormData({
        ...formData,
        objectives: {
          ...formData.objectives!,
          avoma_recordings: updatedRecordings
        }
      });

    } catch (error) {
      console.error('Error fetching transcription:', error);
      
      // Update recording status to failed
      const updatedRecordings = (formData.objectives?.avoma_recordings || []).map(r => 
        r.id === recordingId 
          ? { ...r, status: 'failed' as const }
          : r
      );
      
      setFormData({
        ...formData,
        objectives: {
          ...formData.objectives!,
          avoma_recordings: updatedRecordings
        }
      });
      
      setTranscriptionError(error instanceof Error ? error.message : 'Failed to fetch transcription');
    } finally {
      setIsFetchingTranscription(false);
    }
  };



  const handleCustomDeliverablesChange = (content: string) => {
    setFormData({
      ...formData,
      scope: {
        ...formData.scope!,
        deliverables: content
      },
      custom_deliverables_content: content,
      deliverables_content_edited: true
    });
  };

  const handleCustomObjectiveOverviewChange = (content: string) => {
    setFormData({
      ...formData,
      objectives: {
        ...formData.objectives!,
        description: content
      },
      custom_objective_overview_content: content,
      objective_overview_content_edited: true
    });
  };

  const handleCustomKeyObjectivesChange = (content: string) => {
    setFormData({
      ...formData,
      objectives: {
        ...formData.objectives!,
        key_objectives: [content] // Save as single item for now, will be converted by onChange
      },
      custom_key_objectives_content: content,
      key_objectives_content_edited: true
    });
  };



  const handleAnalyzeTranscription = async () => {
    // Get all available transcriptions
    const recordings = formData.objectives?.avoma_recordings || [];
    const legacyTranscription = formData.objectives?.avoma_transcription;
    
    const allTranscriptions: string[] = [];
    
    // Add legacy transcription if it exists
    if (legacyTranscription && legacyTranscription.trim()) {
      allTranscriptions.push(legacyTranscription.trim());
    }
    
    // Add all completed recordings
    recordings.forEach(recording => {
      if (recording.transcription && recording.transcription.trim()) {
        allTranscriptions.push(recording.transcription.trim());
      }
    });
    
    if (allTranscriptions.length === 0) {
      setTranscriptionError('No transcriptions available for analysis');
      return;
    }

    if (!customerName) {
      setTranscriptionError('Customer name is required for analysis');
      return;
    }

    setIsAnalyzing(true);
    startAnalysisMessages(); // Start rotating messages

    try {
      // Combine all transcriptions with clear separators
      const combinedTranscription = allTranscriptions.map((transcription, index) => {
        const source = recordings[index]?.title || `Recording ${index + 1}`;
        return `=== ${source} ===\n${transcription}\n\n`;
      }).join('');

      // Prepare supporting documents content
      const supportingDocsContent = selectedDocuments.length > 0 
        ? selectedDocuments.map(doc => `${doc.name}:\n${doc.content || 'Content not available'}`).join('\n\n')
        : '';

      const response = await fetch('/api/gemini/analyze-transcription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript: combinedTranscription,
            customerName: customerName,
            existingDescription: formData.objectives?.description || '',
            existingObjectives: formData.objectives?.key_objectives || [],
            selectedProducts: formData.template?.products || [],
            supportingDocuments: supportingDocsContent
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
      if (!result.objectiveOverview || !result.solutions) {
        throw new Error('Invalid response format from AI analysis');
      }
      
      // Handle both painPoints and overcomingActions for backward compatibility
      let painPoints: string[] = [];
      
      if (result.painPoints) {
        painPoints = Array.isArray(result.painPoints) ? result.painPoints : [result.painPoints];
      } else if (result.overcomingActions) {
        if (Array.isArray(result.overcomingActions)) {
          painPoints = result.overcomingActions;
        } else if (typeof result.overcomingActions === 'string') {
          // If overcomingActions is HTML, extract text content
          if (result.overcomingActions.includes('<li>')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = result.overcomingActions;
            const listItems = tempDiv.querySelectorAll('li');
            painPoints = Array.from(listItems).map(item => item.textContent?.trim() || '').filter(item => item !== '');
          } else {
            painPoints = [result.overcomingActions];
          }
        }
      }



      // Convert objective paragraph to bullet points for TipTap editor
      const convertObjectiveToBulletPoints = (objectives: string[]): string => {
        if (!objectives || !Array.isArray(objectives) || objectives.length === 0) return '';
        
        // Check if objectives are already in HTML format
        if (objectives.some(obj => typeof obj === 'string' && obj.includes('<li>'))) {
          // If they're already HTML, extract the content and format properly for TipTap
          return objectives
            .map(obj => {
              if (typeof obj === 'string' && obj.includes('<li>')) {
                // Extract text content from <li> tags
                const textContent = obj.replace(/<li>(.*?)<\/li>/, '$1').trim();
                return textContent;
              }
              return obj;
            })
            .filter(obj => obj && typeof obj === 'string' && obj.trim().length > 0)
            .map(obj => `• ${obj}`)
            .join('\n');
        }
        
        // If they're plain text, convert to bullet points
        return objectives
          .filter(obj => obj && typeof obj === 'string' && obj.trim().length > 0)
          .map(obj => `• ${obj}`)
          .join('\n');
      };

      // Convert solutions to HTML format with proper product family groupings
      const convertSolutionsToHTML = (solutions: Record<string, string | string[]>): string => {
        if (!solutions || typeof solutions !== 'object') return '';
        
        let html = '';
        
        Object.entries(solutions).forEach(([category, items]) => {
          if (typeof items === 'string' && items.trim()) {
            // New format: items is a single HTML string
            if (items.includes('<ul>') && items.includes('<li>')) {
              // Already properly formatted HTML, just add the header
              html += `<h4><strong>${category.toUpperCase()}</strong></h4>\n${items}\n`;
            } else {
              // Plain text, wrap in list
              html += `<h4><strong>${category.toUpperCase()}</strong></h4>\n<ul>\n<li>${items}</li>\n</ul>\n`;
            }
          } else if (Array.isArray(items) && items.length > 0) {
            // Old format: items is an array of strings
            // Add product family header
            html += `<h4><strong>${category.toUpperCase()}</strong></h4>\n<ul>\n`;
            
            // Add items for this product family
            items.forEach(item => {
              if (typeof item === 'string' && item.trim()) {
                // Check if item is already HTML (contains <li> tags)
                if (item.includes('<li>')) {
                  // Extract text content from <li> tags
                  const textContent = item.replace(/<li>(.*?)<\/li>/, '$1').trim();
                  html += `<li>${textContent}</li>\n`;
                } else {
                  // Check for nested content patterns (like "Target:" statements)
                  const targetMatch = item.match(/\.\s*Target:\s*(.+)$/);
                  if (targetMatch) {
                    const mainObjective = item.replace(/\.\s*Target:\s*.+$/, '.');
                    const target = targetMatch[1];
                    html += `<li>${mainObjective}<ul><li>${target}</li></ul></li>\n`;
                  } else {
                    html += `<li>${item}</li>\n`;
                  }
                }
              }
            });
            
            html += '</ul>\n';
          }
        });
        
        return html;
      };

      // Convert deliverables to HTML format for WYSIWYG editor with nested list support


      // Check for Gemini API overload errors
      if (result.objectiveOverview.includes('model is overloaded') || result.objectiveOverview.includes('Service Unavailable')) {
        throw new Error('AI service is currently overloaded. Please wait a few minutes and try again.');
      }

      // Check for other Gemini API errors
      if (result.objectiveOverview.includes('could not be generated')) {
        throw new Error('AI analysis failed. Please try again in a few minutes.');
      }


      
      // Update the form with the generated objective overview, pain points, and solutions
      // Process solutions into deliverables format with proper product family grouping
      const allScopeItems: string[] = [];
      
      if (typeof result.solutions === 'string' && result.solutions.includes('<li>')) {
        // New format: solutions is already HTML
        // Extract text content from HTML for scope items
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = result.solutions;
        const listItems = tempDiv.querySelectorAll('li');
        listItems.forEach(item => {
          if (item.textContent && item.textContent.trim()) {
            allScopeItems.push(`• ${item.textContent.trim()}`);
          }
        });
      } else if (typeof result.solutions === 'object' && result.solutions !== null) {
        // Old format: solutions is an object with categories
        Object.entries(result.solutions).forEach(([category, items]) => {
          if (typeof items === 'string' && items.trim()) {
            // New format: items is a single HTML string
            if (items.includes('<ul>') && items.includes('<li>')) {
              // Extract text content from HTML for scope items
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = items;
              const listItems = tempDiv.querySelectorAll('li');
              const formattedItems = Array.from(listItems).map(item => {
                if (item.textContent && item.textContent.trim()) {
                  return `• ${item.textContent.trim()}`;
                }
                return '';
              }).filter(item => item !== '');
              if (formattedItems.length > 0) {
                allScopeItems.push(`${category.toUpperCase()}\n${formattedItems.join('\n')}`);
              }
            } else {
              // Plain text, format as bullet point
              allScopeItems.push(`${category.toUpperCase()}\n• ${items}`);
            }
          } else if (Array.isArray(items) && items.length > 0) {
            // Old format: items is an array of strings
            const formattedItems = items.map(item => {
              // Check if the item is already HTML (contains <li> tags)
              if (typeof item === 'string' && item.includes('<li>')) {
                // Extract the text content from the HTML
                const textContent = item.replace(/<li>(.*?)<\/li>/, '$1').trim();
                return `• ${textContent}`;
              }
              
              // Check for nested content patterns (like "Target:" statements or other sub-items)
              const targetMatch = item.match(/\.\s*Target:\s*(.+)$/);
              if (targetMatch) {
                const mainObjective = item.replace(/\.\s*Target:\s*.+$/, '.');
                const target = targetMatch[1];
                return `• ${mainObjective}\n  • ${target}`;
              } else {
                // If no target found, just format as a regular bullet point
                return `• ${item}`;
              }
            });
            allScopeItems.push(`${category.toUpperCase()}\n${formattedItems.join('\n')}`);
          }
        });
      }
      
      // Convert pain points to key objectives format
      // Ensure we have valid pain points
      const finalPainPoints = painPoints.length > 0 ? painPoints : [''];
      
      const updatedFormData = {
        ...formData,
        objectives: {
          ...formData.objectives!,
          description: result.objectiveOverview,
          key_objectives: finalPainPoints
        },
        scope: {
          ...formData.scope!,
          deliverables: allScopeItems.join('\n\n')
        },
        // Store the AI response directly without processing - let the display component handle it
        custom_deliverables_content: result.solutions ? 
          (typeof result.solutions === 'string' && result.solutions.includes('<li>') ? 
            result.solutions : // If already HTML, use as-is
            convertSolutionsToHTML(typeof result.solutions === 'object' ? result.solutions : {}) // If object format, convert
          ) : '',
        deliverables_content_edited: true,
        custom_objective_overview_content: result.objectiveOverview,
        objective_overview_content_edited: true,
        // Store pain points as-is if they're already HTML, otherwise convert
        custom_key_objectives_content: (result.painPoints || result.overcomingActions) ? 
          (typeof (result.painPoints || result.overcomingActions) === 'string' && (result.painPoints || result.overcomingActions)?.includes('<li>') ? 
            (result.painPoints || result.overcomingActions) : // If already HTML, use as-is
            convertObjectiveToBulletPoints(Array.isArray(result.painPoints || result.overcomingActions) ? (result.painPoints || result.overcomingActions) : [result.painPoints || result.overcomingActions]) // If plain text, convert
          ) : '',
        key_objectives_content_edited: true
      };
      
      // Show fallback warning if applicable
      if (result.isFallback) {
        // Note: AI response was generated using fallback parsing due to formatting issues. Please review the content carefully.
      }

      // Show success message for scope generation
      if (allScopeItems.length > 0) {
        // Scope items generated successfully
      }
      
      setFormData(updatedFormData);

    } catch (error) {
      console.error('Error analyzing transcription:', error);
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        // API key or configuration issues
        if (errorMessage.includes('API key not valid') || 
            errorMessage.includes('API_KEY_INVALID') ||
            errorMessage.includes('not configured')) {
          console.error('Gemini AI is not properly configured. Please contact your administrator to set up the API key.');
          return;
        }
        
        // Network or other errors
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          console.error('Network error occurred. Please check your connection and try again.');
          return;
        }
        
        // Generic error handling
        console.error('Analysis error:', errorMessage);
      } else {
        console.error('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
      stopAnalysisMessages(); // Stop rotating messages
    }
  };

  // Function to extract text content from selected documents
  const extractDocumentContent = async (documentId: string): Promise<{ content: string; wasTruncated: boolean }> => {
    try {
      const response = await fetch('/api/google-drive/extract-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      });

      if (!response.ok) {
        throw new Error(`Failed to extract content: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.content || 'No content could be extracted from this document.',
        wasTruncated: data.wasTruncated || false
      };
    } catch (error) {
      console.error('Error extracting document content:', error);
      return {
        content: `Error extracting content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        wasTruncated: false
      };
    }
  };

  // Function to handle document selection
  const handleDocumentsSelected = async (documents: Array<{
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    content?: string;
    wasTruncated?: boolean;
  }>) => {
    // Extract content from newly selected documents
    const documentsWithContent = await Promise.all(
      documents.map(async (doc) => {
        if (!doc.content) {
          const result = await extractDocumentContent(doc.id);
          doc.content = result.content;
          doc.wasTruncated = result.wasTruncated;
        }
        return doc;
      })
    );
    
    setSelectedDocuments(documentsWithContent);
  };

  
  
  return (
    <section className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Project Objectives & Scope</h2>
        
        {/* Google Drive Document Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Supporting Documents</h3>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  console.log('Current customer name:', customerName);
                  console.log('Google Drive component state:', {
                    customerName,
                    hasCustomerName: !!customerName
                  });
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                🐛 Debug Info
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/google-drive/diagnostic');
                    if (response.ok) {
                      const diagnostic = await response.json();
                      console.log('Google Drive Diagnostic:', diagnostic);
                      alert(`Google Drive Status: ${diagnostic.status}\n\nCheck browser console for detailed diagnostic information.`);
                    } else {
                      alert('Failed to run diagnostic. Check browser console for details.');
                    }
                  } catch (error) {
                    console.error('Diagnostic failed:', error);
                    alert('Diagnostic failed. Check browser console for details.');
                  }
                }}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                🔍 Run Diagnostic
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Select additional documents from Google Drive to include in AI analysis
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Google Drive Document Selector */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Document Selection</h4>
                {isGoogleDrivePreloading && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md mb-3 border border-blue-200">
                    🔍 Searching for customer folders... Google Drive lookup can be slow.
                  </div>
                )}
                <GoogleDriveDocumentSelector
                  onDocumentsSelected={handleDocumentsSelected}
                  selectedDocuments={selectedDocuments}
                  customerName={customerName}
                />
              </div>
              
              {/* Right Column - Selected Documents Preview */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">Selected Documents</h4>
                
                {selectedDocuments.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="text-center text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2 text-sm">No documents selected</p>
                      <p className="text-xs">Use the document selector to choose files</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDocuments.map((doc, index) => (
                      <div key={doc.id} className="p-3 bg-white border border-gray-200 rounded-md">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-500">{doc.mimeType}</p>
                            {doc.size && <p className="text-xs text-gray-500">{doc.size}</p>}
                            {doc.wasTruncated && (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                <div className="flex items-center text-yellow-800">
                                  <svg className="w-4 h-4 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  <span className="text-xs font-medium">Content Truncated</span>
                                </div>
                                <p className="text-xs text-yellow-700 mt-1">
                                  This document was too long and had to be shortened. Some content may be missing from the AI analysis.
                                </p>
                                <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
                                  <p className="text-xs text-yellow-800 font-medium mb-1">💡 Tip: Improve AI Analysis</p>
                                  <p className="text-xs text-yellow-700">
                                    You can edit the transcription field below to remove non-essential content like introductions, 
                                    small talk, or repetitive information. This will help the AI focus on the most important 
                                    project details and provide better analysis.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newDocs = selectedDocuments.filter((_, i) => i !== index);
                              setSelectedDocuments(newDocs);
                            }}
                            className="ml-2 p-1 text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center text-green-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">
                          {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        These documents will be included in AI analysis
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Multiple Avoma Recordings & Transcriptions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Avoma Recordings & Transcriptions</h3>
          <p className="text-sm text-gray-600 mb-4">
            Add multiple Avoma meeting URLs to automatically fetch transcriptions and generate comprehensive objectives and deliverables.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            {/* Add New Recording */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Add New Recording</h4>
              <div className="flex space-x-3">
                <input
                  type="url"
                  value={newAvomaUrl}
                  onChange={(e) => setNewAvomaUrl(e.target.value)}
                  placeholder="https://app.avoma.com/meetings/..."
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                                  <button
                    type="button"
                    onClick={handleAddAvomaRecording}
                    disabled={!newAvomaUrl.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Recording
                  </button>
              </div>
            </div>

            {/* Recordings List */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Recordings</h4>
              
              {/* Legacy single transcription (if exists) */}
              {formData.objectives?.avoma_transcription && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-yellow-800">Legacy Transcription</h5>
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">Legacy</span>
                  </div>
                  <textarea
                    value={formData.objectives.avoma_transcription}
                    onChange={(e) => handleTranscriptionChange(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border-yellow-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 font-mono text-sm"
                    placeholder="Legacy transcription..."
                  />
                  <div className="text-xs text-yellow-600 mt-1">
                    {formData.objectives.avoma_transcription.length} characters
                  </div>
                </div>
              )}

              {/* Multiple recordings */}
              {formData.objectives?.avoma_recordings?.map((recording) => (
                <div key={recording.id} className="p-4 bg-white border border-gray-200 rounded-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{recording.title}</h5>
                      <p className="text-sm text-gray-600">{recording.url}</p>
                      <p className="text-xs text-gray-500">{recording.date ? new Date(recording.date).toLocaleDateString() : 'Unknown date'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        recording.status === 'completed' ? 'bg-green-100 text-green-800' :
                        recording.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {recording.status}
                      </span>
                      <button
                        onClick={() => handleRemoveAvomaRecording(recording.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {recording.status === 'pending' && (
                    <button
                      onClick={() => handleFetchTranscriptionForRecording(recording.id)}
                      disabled={isFetchingTranscription}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isFetchingTranscription ? 'Fetching...' : 'Fetch Transcription'}
                    </button>
                  )}

                  {recording.status === 'failed' && (
                    <button
                      onClick={() => handleFetchTranscriptionForRecording(recording.id)}
                      disabled={isFetchingTranscription}
                      className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {isFetchingTranscription ? 'Retrying...' : 'Retry Transcription'}
                    </button>
                  )}

                  {recording.transcription && (
                    <div className="mt-3">
                      <textarea
                        value={recording.transcription}
                        rows={4}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 font-mono text-sm"
                        placeholder="Transcription..."
                        readOnly
                      />
                      <div className="text-xs text-gray-600 mt-1">
                        {recording.transcription.length} characters
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {(!formData.objectives?.avoma_recordings || formData.objectives.avoma_recordings.length === 0) && 
               !formData.objectives?.avoma_transcription && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm">No recordings yet</p>
                    <p className="text-xs">Add an Avoma URL above to get started</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {transcriptionError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <p className="text-red-700 text-sm">{transcriptionError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Avoma Search Link */}
            {customerName && (
              <div className="mt-4">
                <a
                  href={`https://app.avoma.com/search?q=${customerName.split(' ').join('%2C')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search Avoma for &quot;{customerName}&quot; meetings
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Generate Objectives & Deliverables Button */}
        {(formData.objectives?.avoma_transcription || (formData.objectives?.avoma_recordings && formData.objectives.avoma_recordings.length > 0)) && customerName && (
          <div className="flex justify-center mb-8">
            <button
              type="button"
              onClick={() => handleAnalyzeTranscription()}
              disabled={isAnalyzing}
              className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-lg shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing Transcriptions...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Generate Objectives & Deliverables from Transcriptions
                </>
              )}
            </button>
          </div>
        )}

        {/* Full Width Layout */}
        <div className="space-y-6">
            {/* Objective Overview */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Objective Overview</h3>
              <TipTapEditor
                value={formData.custom_objective_overview_content || formData.objectives?.description || ''}
                onChange={handleCustomObjectiveOverviewChange}
                placeholder="Provide a high-level overview of what the project will entail..."
              />
              <p className="mt-1 text-sm text-gray-500">
                A high-level overview of what the project will entail.
              </p>
            </div>

            {/* Key Objectives */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Key Objectives</h3>
              <p className="text-sm text-gray-600 mb-4">
                Pain points that the customer has outlined for us to solve. Use the toolbar to format with bullet points, numbered lists, and emphasis.
              </p>
              
              <TipTapEditor
                value={formData.custom_key_objectives_content || (() => {
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
                      // Close any existing list first
                      if (currentList) {
                        htmlValue += `<ul>${currentList}</ul>`;
                        currentList = '';
                      }
                      // Add as a paragraph
                      htmlValue += `<p>${trimmedObj}</p>`;
                    }
                  });
                  
                  // Close any remaining list
                  if (currentList) {
                    htmlValue += `<ul>${currentList}</ul>`;
                  }
                  
                  // If no structured content was found, fall back to simple paragraphs
                  if (htmlValue === '') {
                    const paragraphs = objectives
                      .map(obj => obj && typeof obj === 'string' ? obj.trim() : '')
                      .filter(obj => obj.length > 0)
                      .map(obj => `<p>${obj}</p>`)
                      .join('');
                    htmlValue = paragraphs;
                  }
                  return htmlValue;
                })()}
                onChange={handleCustomKeyObjectivesChange}
                placeholder="Enter project objectives here. Use bullet points or numbered lists for better organization..."
              />
            </div>

            {/* Deliverables */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Deliverables</h3>
              <p className="text-sm text-gray-600 mb-4">
                Define the specific deliverables that will be provided as part of this project. These will be used in the Scope section of the SOW.
              </p>
              
              <TipTapEditor
                value={formData.custom_deliverables_content || formData.scope?.deliverables || ''}
                onChange={handleCustomDeliverablesChange}
                placeholder={`Enter deliverables organized by product/category, for example:

LEANDATA ROUTING
• Lead routing based on employee size, geography, and account tiering
• Lead-to-lead matching and account matching to reduce duplicates
• Contact routing that mirrors lead routing logic
• Round robin and individual assignment logic

LEANDATA BOOKIT
• Notification workflows for sales and support teams
• SLA notifications via Microsoft Teams and/or Outreach

INTEGRATIONS
• Teams integration for notifications
• ZoomInfo integration for data enrichment`}
              />
              <p className="mt-1 text-sm text-gray-500">
                Solutions to the pain points, utilizing LeanData products. Organize by product/category (LEANDATA ROUTING, LEANDATA BOOKIT, INTEGRATIONS, etc.).
              </p>
            </div>
        </div>
      </div>
      
      {/* Loading Modals */}
      <LoadingModal 
        isOpen={isFetchingTranscription} 
        operation="loading"
        message="Fetching transcription from Avoma..."
      />
      
      <LoadingModal 
        isOpen={isAnalyzing} 
        operation="processing"
        message={analysisMessages[currentAnalysisMessage]}
      />
    </section>
  );
} 