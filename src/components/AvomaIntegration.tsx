'use client';

import React, { useState, useEffect } from 'react';
import { GeminiBulletPoint } from '@/lib/gemini';

interface AvomaIntegrationProps {
  onBulletPointsGenerated: (bulletPoints: GeminiBulletPoint[]) => void;
  onProjectDescriptionGenerated: (description: string) => void;
  customerName: string;
}

interface AvomaCall {
  id: string;
  title: string;
  customer_name: string;
  meeting_date: string;
  duration: number;
}

interface SearchResponse {
  message: string;
  calls: AvomaCall[];
  selectedCall?: AvomaCall;
  bulletPoints: GeminiBulletPoint[];
  summary: string;
  projectDescription: string;
}

interface ConfigStatus {
  isConfigured: boolean;
  isActive: boolean;
  lastError?: string;
}

export default function AvomaIntegration({
  onBulletPointsGenerated,
  onProjectDescriptionGenerated,
  customerName
}: AvomaIntegrationProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectContext, setProjectContext] = useState('');
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);

  // Check Avoma configuration status on component mount
  useEffect(() => {
    checkConfigStatus();
  }, []);

  const checkConfigStatus = async () => {
    try {
      const response = await fetch('/api/admin/avoma/config');
      if (response.ok) {
        const data = await response.json();
        setConfigStatus({
          isConfigured: true,
          isActive: data.config.isActive,
          lastError: data.config.lastError
        });
      } else if (response.status === 404) {
        setConfigStatus({
          isConfigured: false,
          isActive: false
        });
      }
    } catch (error) {
      console.error('Error checking config status:', error);
      setConfigStatus({
        isConfigured: false,
        isActive: false
      });
    }
  };

  const handleSearch = async () => {
    if (!customerName.trim()) {
      setError('Please enter a customer name first');
      return;
    }

    if (!configStatus?.isConfigured || !configStatus?.isActive) {
      setError('Avoma integration is not configured or inactive');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/avoma/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          projectContext: projectContext.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search Avoma calls');
      }

      setSearchResults(data);

      // Auto-populate the form with generated content
      if (data.bulletPoints.length > 0) {
        onBulletPointsGenerated(data.bulletPoints);
      }

      if (data.projectDescription) {
        onProjectDescriptionGenerated(data.projectDescription);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSearching(false);
    }
  };

  const categorizeBulletPoints = (bulletPoints: GeminiBulletPoint[]) => {
    const categories = {
      deliverable: bulletPoints.filter(bp => bp.category === 'deliverable'),
      requirement: bulletPoints.filter(bp => bp.category === 'requirement'),
      assumption: bulletPoints.filter(bp => bp.category === 'assumption'),
      timeline: bulletPoints.filter(bp => bp.category === 'timeline'),
    };
    return categories;
  };

  // Show configuration status
  if (!configStatus?.isConfigured) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h3 className="text-lg font-semibold mb-3 text-yellow-800">Avoma Integration</h3>
        <p className="text-yellow-700 mb-4">
          Avoma integration is not configured. Please contact your administrator to set up the connection.
        </p>
        <a
          href="/admin/avoma"
          className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          Configure Avoma
        </a>
      </div>
    );
  }

  if (!configStatus?.isActive) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-lg font-semibold mb-3 text-red-800">Avoma Integration</h3>
        <p className="text-red-700 mb-4">
          Avoma integration is currently disabled. Please contact your administrator to enable it.
        </p>
        {configStatus.lastError && (
          <p className="text-sm text-red-600 mb-4">
            Last error: {configStatus.lastError}
          </p>
        )}
        <a
          href="/admin/avoma"
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Fix Configuration
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h3 className="text-lg font-semibold mb-4">Avoma Call Analysis</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Context (Optional)
          </label>
          <textarea
            value={projectContext}
            onChange={(e) => setProjectContext(e.target.value)}
            placeholder="Add any additional context about the project..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={isSearching || !customerName.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSearching ? 'Searching Avoma...' : 'Search for Scoping Calls'}
        </button>

        {error && (
          <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {searchResults && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-md">
              <p className="text-green-800 font-medium">{searchResults.message}</p>
              {searchResults.calls.length > 0 && (
                <p className="text-green-700 text-sm mt-1">
                  Found {searchResults.calls.length} scoping call(s)
                </p>
              )}
            </div>

            {searchResults.selectedCall && (
              <div className="p-4 bg-gray-50 rounded-md">
                <h4 className="font-medium text-gray-900 mb-2">Selected Call</h4>
                <div className="text-sm text-gray-600">
                  <p><strong>Title:</strong> {searchResults.selectedCall.title}</p>
                  <p><strong>Date:</strong> {new Date(searchResults.selectedCall.meeting_date).toLocaleDateString()}</p>
                  <p><strong>Duration:</strong> {Math.round(searchResults.selectedCall.duration / 60)} minutes</p>
                </div>
              </div>
            )}

            {searchResults.bulletPoints.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Generated Content</h4>
                
                {searchResults.summary && (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-blue-800 text-sm">
                      <strong>Summary:</strong> {searchResults.summary}
                    </p>
                  </div>
                )}

                {(() => {
                  const categorized = categorizeBulletPoints(searchResults.bulletPoints);
                  return (
                    <div className="space-y-3">
                      {categorized.deliverable.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-800 mb-2">Deliverables</h5>
                          <ul className="space-y-1">
                            {categorized.deliverable.map((bp, index) => (
                              <li key={index} className="text-sm text-gray-700">
                                • {bp.title}: {bp.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {categorized.requirement.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-800 mb-2">Requirements</h5>
                          <ul className="space-y-1">
                            {categorized.requirement.map((bp, index) => (
                              <li key={index} className="text-sm text-gray-700">
                                • {bp.title}: {bp.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {categorized.assumption.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-800 mb-2">Assumptions</h5>
                          <ul className="space-y-1">
                            {categorized.assumption.map((bp, index) => (
                              <li key={index} className="text-sm text-gray-700">
                                • {bp.title}: {bp.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {categorized.timeline.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-800 mb-2">Timeline</h5>
                          <ul className="space-y-1">
                            {categorized.timeline.map((bp, index) => (
                              <li key={index} className="text-sm text-gray-700">
                                • {bp.title}: {bp.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 