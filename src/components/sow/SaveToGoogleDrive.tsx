'use client';

import { useState } from 'react';
import Image from 'next/image';
import LoadingModal from '@/components/ui/LoadingModal';

interface SaveToGoogleDriveProps {
  sowId: string;
  customerName: string;
  sowTitle: string;
}

interface DriveFolder {
  id: string;
  name: string;
  webViewLink?: string;
}

export default function SaveToGoogleDrive({ sowId, customerName, sowTitle }: SaveToGoogleDriveProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; details?: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'generating' | 'uploading' | 'complete'>('idle');

  const searchCustomerFolder = async () => {
    setSearching(true);
    setMessage(null);
    
    try {
      // Start with fast search for immediate results
      const fastResponse = await fetch('/api/google-drive/fast-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: customerName
        })
      });

      if (fastResponse.ok) {
        const fastData = await fastResponse.json();
        const fastResults = fastData.searchResults || [];
        
        // Show fast results immediately
        setFolders(fastResults);
        
        if (fastResults.length === 0) {
          setMessage({ 
            type: 'error', 
            text: `No folders found for customer "${customerName}". You may need to create a folder first.` 
          });
        }
        
        // Now enhance with AI search in the background (non-blocking)
        fetch('/api/google-drive/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: customerName,
            useAI: true 
          })
        }).then(async (aiResponse) => {
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const aiResults = aiData.searchResults || [];
            
            // Update with AI-enhanced results if they're better
            if (aiResults.length > fastResults.length) {
              setFolders(aiResults);
            }
          }
        }).catch(err => {
          console.warn('AI enhancement failed, but fast search results are already displayed:', err);
        });
        
      } else {
        const error = await fastResponse.json();
        
        // Check if re-authentication is needed
        if (error.needsReauth) {
          setMessage({ 
            type: 'error', 
            text: 'Google Drive access issue detected. An administrator needs to re-authenticate the Google Drive integration.',
            details: error.details
          });
        } else {
          throw new Error(error.error || 'Failed to search Google Drive');
        }
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to search for customer folder' 
      });
    } finally {
      setSearching(false);
    }
  };

  const saveSOWToDrive = async () => {
    if (!selectedFolder) {
      setMessage({ type: 'error', text: 'Please select a folder first' });
      return;
    }

    setSaving(true);
    setMessage(null);
    setUploadProgress('generating');

    try {
      // First, generate the PDF using the Print page
      setUploadProgress('generating');
      const pdfResponse = await fetch(`/api/sow/${sowId}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!pdfResponse.ok) {
        const errorData = await pdfResponse.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // Get the PDF blob
      const pdfBlob = await pdfResponse.blob();

      // Convert PDF blob to base64 for upload
      const arrayBuffer = await pdfBlob.arrayBuffer();
      
      // Use a more robust base64 conversion method
      let base64: string;
      try {
        // Modern browsers support this
        base64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(arrayBuffer))));
      } catch {
        // Fallback for older browsers or large files
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64 = btoa(binary);
      }
      

      
      // Now upload to Google Drive
      setUploadProgress('uploading');
      const uploadResponse = await fetch('/api/google-drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: selectedFolder,
          fileName: `${sowTitle} - ${customerName}.pdf`,
          fileType: 'application/pdf',
          fileContent: base64
        })
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        setUploadProgress('complete');
        setMessage({ 
          type: 'success', 
          text: `SOW saved to Google Drive successfully! File ID: ${uploadData.fileId}` 
        });
        
        // Reset form after a short delay to show success message
        setTimeout(() => {
          setSelectedFolder('');
          setIsOpen(false);
          setUploadProgress('idle');
        }, 2000);
      } else {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Failed to upload to Google Drive');
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save SOW to Google Drive' 
      });
      setUploadProgress('idle');
    } finally {
      setSaving(false);
    }
  };

  // Get loading modal content based on current progress
  const getLoadingContent = () => {
    switch (uploadProgress) {
      case 'generating':
        return {
          title: 'Generating PDF...',
          message: 'Creating your SOW document in PDF format using the Print page. This ensures 100% accuracy.',
          operation: 'processing' as const
        };
      case 'uploading':
        return {
          title: 'Uploading to Google Drive...',
          message: 'Saving your SOW PDF to the selected Google Drive folder.',
          operation: 'saving' as const
        };
      default:
        return {
          title: 'Processing...',
          message: 'Please wait while we process your request.',
          operation: 'processing' as const
        };
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-white text-gray-700 px-3 py-2 rounded border border-gray-300 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-blue-500 flex items-center justify-center"
      >
        <Image src="/google-drive-icon.svg.png" alt="Google Drive" width={16} height={16} className="mr-1.5" />
        Save to Customer Folder
      </button>

      {/* Loading Modal */}
      <LoadingModal 
        isOpen={saving}
        {...getLoadingContent()}
        size="md"
      />

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Save SOW to Google Drive
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Customer: <strong>{customerName}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  SOW: <strong>{sowTitle !== 'Untitled SOW' ? sowTitle : 'Please add a title to this SOW'}</strong>
                </p>
                {sowTitle === 'Untitled SOW' && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    ⚠️ This SOW needs a title before saving to Google Drive. Please edit the SOW and add a title first.
                  </p>
                )}

              </div>

              <div className="space-y-2">
                <button
                  onClick={searchCustomerFolder}
                  disabled={searching}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {searching ? '🔍 Searching...' : '🔍 Search for Customer Folder'}
                </button>
                
                {searching && (
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                    🔍 Searching for customer folders... Google Drive lookup can be slow.
                  </div>
                )}
              </div>

              {folders.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Folder:
                  </label>
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a folder...</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        📁 {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {message && (
                <div className={`p-3 rounded-md ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <div className="font-medium">{message.text}</div>
                  {message.details && (
                    <div className="text-sm mt-1 opacity-80">{message.details}</div>
                  )}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                
                {selectedFolder && sowTitle !== 'Untitled SOW' && (
                  <button
                    onClick={saveSOWToDrive}
                    disabled={saving}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {saving ? '💾 Saving...' : '💾 Save SOW'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
