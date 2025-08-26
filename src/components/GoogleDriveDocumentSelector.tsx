'use client';

import { useState, useEffect, useCallback } from 'react';

interface DriveDocument {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  content?: string; // Extracted text content
  isFolder?: boolean; // Added for UI distinction
}

interface GoogleDriveSearchResult {
  id: string;
  name: string;
  mimeType: string;
  size: string;
}

interface GoogleDriveDocumentSelectorProps {
  onDocumentsSelected: (documents: DriveDocument[]) => void;
  selectedDocuments: DriveDocument[];
  customerName?: string; // Customer name for pre-searching relevant folders
  folderId?: string; // Optional: specific folder to browse
}

export default function GoogleDriveDocumentSelector({
  onDocumentsSelected,
  selectedDocuments,
  customerName,
  folderId
}: GoogleDriveDocumentSelectorProps) {
  const [folderContents, setFolderContents] = useState<DriveDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<{
    id: string;
    name: string;
    path: string[];
  } | null>(null);
  const [searchResults, setSearchResults] = useState<DriveDocument[]>([]);
  const [searchMode, setSearchMode] = useState<'search' | 'browse'>('search');
  const [isPreloading, setIsPreloading] = useState(false);
  const [processingDocuments, setProcessingDocuments] = useState<Set<string>>(new Set());

  // Preload customer folders in the background
  const preloadCustomerFolders = useCallback(async () => {
    if (!customerName) return;
    
    setIsPreloading(true);
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
        
        // Transform fast search results to our document format
        const fastResults = fastData.searchResults?.map((item: GoogleDriveSearchResult) => ({
          id: item.id,
          name: item.name,
          mimeType: item.mimeType,
          size: item.size,
          isFolder: item.mimeType === 'application/vnd.google-apps.folder'
        })) || [];
        
        setSearchResults(fastResults);
        
        // If only one folder found, automatically open it
        if (fastResults.length === 1 && fastResults[0].isFolder) {
          setSearchMode('browse');
          await loadFolderContents(fastResults[0].id);
          setCurrentFolder({ 
            id: fastResults[0].id, 
            name: fastResults[0].name, 
            path: [fastResults[0].name] 
          });
        } else if (fastResults.length > 0) {
          setSearchMode('search');
          setCurrentFolder({ id: 'search', name: `Search Results for "${customerName}"`, path: [] });
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
            const aiResults = aiData.searchResults?.map((item: GoogleDriveSearchResult) => ({
              id: item.id,
              name: item.name,
              mimeType: item.mimeType,
              size: item.size,
              isFolder: item.mimeType === 'application/vnd.google-apps.folder'
            })) || [];
            
            // Update with AI-enhanced results if they're better
            if (aiResults.length > fastResults.length) {
              setSearchResults(aiResults);
            }
          }
        }).catch(err => {
          console.warn('AI enhancement failed, but fast search results are already displayed:', err);
        });
      }
    } catch (err) {
      console.warn('Failed to preload customer folders:', err);
      // Don't show error to user for preloading - just fall back to browse mode
      setSearchMode('browse');
    } finally {
      setIsPreloading(false);
    }
  }, [customerName]);

  // Preload customer folders when component mounts or when triggered externally
  useEffect(() => {
    if (customerName && !folderId) {
      preloadCustomerFolders();
    }
  }, [customerName, folderId, preloadCustomerFolders]);
  
  // Listen for external preload trigger (from ObjectivesTab)
  useEffect(() => {
    const handlePreload = (event: CustomEvent) => {
      if (event.detail?.customerName === customerName && !folderId) {
        preloadCustomerFolders();
      }
    };
    
    window.addEventListener('preloadGoogleDrive', handlePreload as EventListener);
    return () => {
      window.removeEventListener('preloadGoogleDrive', handlePreload as EventListener);
    };
  }, [customerName, folderId, preloadCustomerFolders]);

  // Load folder contents
  const loadFolderContents = async (folderId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/google-drive/folders/${folderId}/contents`);
      
      if (!response.ok) {
        throw new Error(`Failed to load folder contents: ${response.statusText}`);
      }
      
      const data = await response.json();
      const contents = data.contents?.map((item: GoogleDriveSearchResult) => ({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        size: item.size,
        isFolder: item.mimeType === 'application/vnd.google-apps.folder'
      })) || [];
      
      setFolderContents(contents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folder contents');
      console.error('Error loading folder contents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load root folders
  const loadRootFolders = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/google-drive/folders');
      
      if (!response.ok) {
        throw new Error(`Failed to load root folders: ${response.statusText}`);
      }
      
      const data = await response.json();
      const folders = data.folders?.map((item: GoogleDriveSearchResult) => ({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        size: item.size,
        isFolder: true
      })) || [];
      
      setFolderContents(folders);
      setCurrentFolder({ id: 'root', name: 'My Drive', path: [] });
      setSearchMode('browse');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load root folders');
      console.error('Error loading root folders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle folder click
  const handleFolderClick = async (folderId: string) => {
    const folder = [...folderContents, ...searchResults].find(item => item.id === folderId);
    if (!folder) return;
    
    const newPath = currentFolder ? [...currentFolder.path, folder.name] : [folder.name];
    setCurrentFolder({ id: folderId, name: folder.name, path: newPath });
    await loadFolderContents(folderId);
  };

  // Handle back navigation
  const handleBackClick = () => {
    if (!currentFolder || currentFolder.path.length === 0) {
      // Go back to root
      loadRootFolders();
      return;
    }
    
    // Remove last path segment
    const newPath = currentFolder.path.slice(0, -1);
    const parentName = newPath.length > 0 ? newPath[newPath.length - 1] : 'My Drive';
    const parentId = newPath.length === 0 ? 'root' : 'parent'; // This is simplified - in real implementation you'd track parent IDs
    
    setCurrentFolder({ 
      id: parentId, 
      name: parentName, 
      path: newPath 
    });
    
    if (newPath.length === 0) {
      loadRootFolders();
    } else {
      // For simplicity, just go back to root - in real implementation you'd navigate to actual parent
      loadRootFolders();
    }
  };

  // Handle document selection
  const handleDocumentSelect = async (document: DriveDocument) => {
    // Don't allow selecting folders
    if (document.mimeType === 'application/vnd.google-apps.folder') {
      return;
    }

    const isSelected = selectedDocuments.some(doc => doc.id === document.id);
    
    if (isSelected) {
      // Remove document
      const updated = selectedDocuments.filter(doc => doc.id !== document.id);
      onDocumentsSelected(updated);
    } else {
      // Add document and extract content
      setProcessingDocuments(prev => new Set(prev).add(document.id));
      
      try {
        const response = await fetch('/api/google-drive/extract-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: document.id })
        });

        if (response.ok) {
          const data = await response.json();
          const documentWithContent = { ...document, content: data.content };
          const updated = [...selectedDocuments, documentWithContent];
          onDocumentsSelected(updated);
        } else {
          // Add document without content if extraction fails
          const updated = [...selectedDocuments, document];
          onDocumentsSelected(updated);
        }
      } catch (err) {
        console.error('Failed to extract document content:', err);
        // Add document without content if extraction fails
        const updated = [...selectedDocuments, document];
        onDocumentsSelected(updated);
      } finally {
        setProcessingDocuments(prev => {
          const newSet = new Set(prev);
          newSet.delete(document.id);
          return newSet;
        });
      }
    }
  };

  const handleRemoveDocument = (documentId: string) => {
    const updated = selectedDocuments.filter(doc => doc.id !== documentId);
    onDocumentsSelected(updated);
  };

  const getTotalCharacters = () => {
    return selectedDocuments.reduce((total, doc) => {
      return total + (doc.content?.length || 0);
    }, 0);
  };

  return (
    <div className="space-y-4">
      {/* Header and Navigation */}
      <div className="space-y-2">
        {/* Breadcrumb Navigation */}
        {currentFolder && (
          <div className="flex items-center text-sm text-gray-600 mb-3">
            {currentFolder.path.length > 0 && (
              <>
                <button
                  onClick={handleBackClick}
                  className="text-blue-600 hover:text-blue-800 mr-2"
                >
                  ← Back
                </button>
                <span className="mx-2">/</span>
              </>
            )}
            <span className="font-medium">{currentFolder.name}</span>
          </div>
        )}

        {/* Search Results Header */}
        {searchMode === 'search' && searchResults.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-gray-900">
              Search Results for &quot;{customerName}&quot;
            </h4>
            <button
              onClick={() => {
                setSearchMode('browse');
                loadRootFolders();
              }}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Browse All Folders
            </button>
          </div>
        )}
        

        
        {/* Preloaded Results Status */}
        {!isPreloading && searchResults.length > 0 && (
          <div className="text-xs text-green-600">
            {searchResults.length === 1 && currentFolder && currentFolder.id !== 'search' ? (
              `✅ Found customer folder "${currentFolder.name}" - ready to browse`
            ) : (
              `✅ Found ${searchResults.length} customer folder${searchResults.length !== 1 ? 's' : ''}`
            )}
          </div>
        )}
      </div>

      {/* Content Display */}
      {!isLoading && !error && (
        <>
          {/* Search Results */}
          {searchMode === 'search' && searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
              {searchResults.map((item) => {
                const isSelected = selectedDocuments.some(doc => doc.id === item.id);
                const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                
                return (
                  <div
                    key={item.id}
                    className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      isSelected ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => isFolder ? handleFolderClick(item.id) : handleDocumentSelect(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div className="mr-3">
                          {isFolder ? (
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">
                            {isFolder ? 'Folder' : `${item.mimeType} • ${item.size || 'Unknown size'}`}
                          </div>
                        </div>
                      </div>
                      {!isFolder && (
                        <div className="ml-3">
                          {processingDocuments.has(item.id) ? (
                            <div className="w-5 h-5 flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          ) : isSelected ? (
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Folder Contents */}
          {searchMode === 'browse' && folderContents.length > 0 && (
            <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
              {folderContents.map((item) => {
                const isSelected = selectedDocuments.some(doc => doc.id === item.id);
                const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                
                return (
                  <div
                    key={item.id}
                    className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      isSelected ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => isFolder ? handleFolderClick(item.id) : handleDocumentSelect(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <div className="mr-3">
                          {isFolder ? (
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">
                            {isFolder ? 'Folder' : `${item.mimeType} • ${item.size || 'Unknown size'}`}
                          </div>
                        </div>
                      </div>
                      {!isFolder && (
                        <div className="ml-3">
                          {processingDocuments.has(item.id) ? (
                            <div className="w-5 h-5 flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          ) : isSelected ? (
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8 text-gray-500">
          <svg className="animate-spin mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="mt-2">Loading folder contents...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8 text-red-500">
          <svg className="mx-auto h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="mt-2">Error: {error}</p>
          <button
            onClick={() => loadRootFolders()}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State - Only show when not preloading and actually no results */}
      {!isPreloading && !isLoading && !error && folderContents.length === 0 && searchResults.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="mt-2">No documents found</p>
          <button
            onClick={() => loadRootFolders()}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Browse All Folders
          </button>
        </div>
      )}

      {/* Selected Documents */}
      {selectedDocuments.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <h4 className="text-md font-medium text-gray-900">
                Selected Documents ({selectedDocuments.length})
              </h4>
              {processingDocuments.size > 0 && (
                <div className="flex items-center text-xs text-blue-600">
                  <svg className="w-3 h-3 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              )}
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showPreview ? 'Hide Preview' : 'Preview Content'}
            </button>
          </div>

          <div className="space-y-2">
            {selectedDocuments.map((document) => (
              <div key={document.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{document.name}</div>
                  {showPreview && document.content && (
                    <div className="text-sm text-gray-600 mt-1">
                      {document.content.substring(0, 150)}...
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveDocument(document.id)}
                  className="ml-3 text-red-600 hover:text-red-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {showPreview && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-800">
                <strong>Total Content:</strong> {getTotalCharacters().toLocaleString()} characters will be analyzed
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
