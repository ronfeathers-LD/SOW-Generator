'use client';

import { useState } from 'react';

interface DriveSearchResult {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  webViewLink?: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
}

interface SearchResponse {
  searchResults: DriveSearchResult[];
  interpretedQuery: Record<string, unknown>;
  analysis?: string;
}

export default function GoogleDriveSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/google-drive/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: query.trim(),
          useAI 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Google Drive Search with Gemini AI
        </h2>
        
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for folders (e.g., 'project documents', 'SOW files', 'client folders')"
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Use Gemini AI for intelligent search</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {/* AI Analysis */}
            {results.analysis && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-2">AI Analysis</h3>
                <p className="text-blue-800 whitespace-pre-wrap">{results.analysis}</p>
              </div>
            )}

            {/* Search Results */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Search Results ({results.searchResults.length})
              </h3>
              
              {results.searchResults.length === 0 ? (
                <p className="text-gray-500">No folders found matching your search criteria.</p>
              ) : (
                <div className="space-y-3">
                  {results.searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            📁 {result.name}
                          </h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Created: {formatDate(result.createdTime)}</p>
                            <p>Modified: {formatDate(result.modifiedTime)}</p>
                            {result.size && <p>Size: {result.size}</p>}
                          </div>
                        </div>
                        {result.webViewLink && (
                          <a
                            href={result.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Open in Drive →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interpreted Query */}
            {results.interpretedQuery && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Search Parameters</h3>
                <pre className="text-sm text-gray-700 bg-white p-3 rounded border overflow-x-auto">
                  {JSON.stringify(results.interpretedQuery, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Example Queries */}
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Example Queries</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Find all project folders from last year',
              'Look for SOW documents in the client folder',
              'Search for folders containing &quot;implementation&quot;',
              'Find folders created by the sales team',
              'Look for archived project folders',
              'Search for folders with &quot;2024&quot; in the name'
            ].map((example, index) => (
              <button
                key={index}
                onClick={() => setQuery(example)}
                className="text-left text-sm text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"
              >
                &quot;{example}&quot;
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
