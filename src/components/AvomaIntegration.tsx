'use client';

import React, { useState, useEffect } from 'react';
import { GeminiBulletPoint } from '@/lib/gemini';

interface AvomaIntegrationProps {
  onBulletPointsGenerated: (bulletPoints: GeminiBulletPoint[]) => void;
  onProjectDescriptionGenerated: (description: string) => void;
  customer_name: string;
  // Enhanced Salesforce context props
  sowId?: string;
  accountName?: string;
  opportunityName?: string;
  contactEmails?: string[];
  additionalSearchTerms?: string[];
  useEnhancedSearch?: boolean;
  // Salesforce IDs
  salesforceAccountId?: string;
  salesforceOpportunityId?: string;
  // New callback for meeting selection
  onMeetingsSelected?: (meetingIds: Set<string>) => void;
}

interface AvomaSearchRequestBody {
  customerName: string;
  fromDate: string;
  toDate: string;
  projectContext?: string;
  sowId?: string;
  accountName?: string;
  opportunityName?: string;
  contactEmails?: string[];
  additionalSearchTerms?: string[];
  useSmartSearch?: boolean;
  salesforceAccountId?: string;
  salesforceOpportunityId?: string;
}

interface AvomaCall {
  id: string;
  title: string;
  subject?: string;
  customer_name: string;
  meeting_date: string;
  start_at?: string;
  duration: number;
  organizer_email?: string;
  attendees?: Array<{ email?: string; name?: string }>;
}

interface SearchResponse {
  message: string;
  calls?: AvomaCall[];
  meetings?: AvomaCall[];  // Enhanced search uses 'meetings' instead of 'calls'
  selectedCall?: AvomaCall;
  selectedMeeting?: AvomaCall;  // Enhanced search uses 'selectedMeeting' instead of 'selectedCall'
  meetingTranscripts?: Array<{
    meeting: AvomaCall;
    transcript: string;
    hasTranscript: boolean;
  }>;
  bulletPoints: GeminiBulletPoint[];
  summary: string;
  projectDescription: string;
  searchContext?: {
    accountName: string;
    opportunityName?: string;
    contactEmails?: string[];
    searchTerms: string[];
    usedSalesforceData: boolean;
    salesforceAccountId?: string;
    salesforceOpportunityId?: string;
    searchMethod: string;
    totalMeetingsFound?: number;
    meetingsWithTranscripts?: number;
  };
}

interface ConfigStatus {
  isConfigured: boolean;
  isActive: boolean;
  lastError?: string;
}

export default function AvomaIntegration({
  onBulletPointsGenerated,
  onProjectDescriptionGenerated,
  customer_name,
  sowId,
  accountName,
  opportunityName,
  contactEmails,
  additionalSearchTerms,
  useEnhancedSearch = true,
  salesforceAccountId,
  salesforceOpportunityId,
  onMeetingsSelected
}: AvomaIntegrationProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectContext, setProjectContext] = useState('');
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  
  // New state for prescriptive search
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedMeetings, setSelectedMeetings] = useState<Set<string>>(new Set());
  const [isFetchingTranscripts, setIsFetchingTranscripts] = useState(false);

  // Check Avoma configuration status on component mount
  useEffect(() => {
    checkConfigStatus();
  }, []);

  // Initialize date range to last 6 months
  useEffect(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const today = new Date();
    
    setFromDate(sixMonthsAgo.toISOString().split('T')[0]);
    setToDate(today.toISOString().split('T')[0]);
  }, []);

  const handleMeetingSelection = (meetingId: string, isSelected: boolean) => {
    const newSelection = new Set(selectedMeetings);
    if (isSelected) {
      newSelection.add(meetingId);
    } else {
      newSelection.delete(meetingId);
    }
    setSelectedMeetings(newSelection);
    
    // Notify parent component of selection changes
    if (onMeetingsSelected) {
      onMeetingsSelected(newSelection);
    }
  };

  const handleFetchTranscripts = async () => {
    if (selectedMeetings.size === 0) {
      setError('Please select at least one meeting to fetch transcripts');
      return;
    }

    setIsFetchingTranscripts(true);
    setError(null);

    try {
      const meetingIds = Array.from(selectedMeetings);
      const response = await fetch('/api/avoma/transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingIds,
          projectContext: projectContext.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transcripts');
      }

      const data = await response.json();
      
      // Generate bullet points and project description from transcripts
      if (data.bulletPoints && data.bulletPoints.length > 0) {
        onBulletPointsGenerated(data.bulletPoints);
      }
      
      if (data.projectDescription) {
        onProjectDescriptionGenerated(data.projectDescription);
      }

      // Update search results with transcript data
      setSearchResults(prev => prev ? {
        ...prev,
        bulletPoints: data.bulletPoints || [],
        projectDescription: data.projectDescription || '',
        summary: data.summary || ''
      } : null);

    } catch (error) {
      console.error('Error fetching transcripts:', error);
      setError('Failed to fetch transcripts. Please try again.');
    } finally {
      setIsFetchingTranscripts(false);
    }
  };

  const checkConfigStatus = async () => {
    try {
      const response = await fetch('/api/admin/avoma/config');
      if (response.ok) {
        const data = await response.json();
        setConfigStatus({
          isConfigured: true,
          isActive: data.config.is_active, // Use snake_case field name
          lastError: data.config.last_error // Use snake_case field name
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
    if (!customer_name.trim() && !accountName) {
      setError('Please enter a customer name or ensure account name is available');
      return;
    }

    if (!configStatus?.isConfigured || !configStatus?.isActive) {
      setError('Avoma integration is not configured or inactive');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Determine which endpoint to use based on available Salesforce context
      const hasSalesforceContext = sowId || accountName || opportunityName || contactEmails;
      const endpoint = hasSalesforceContext && useEnhancedSearch 
        ? '/api/avoma/enhanced-search' 
        : '/api/avoma/search';

      const requestBody: AvomaSearchRequestBody = {
        customerName: customer_name.trim(),
        fromDate: fromDate,
        toDate: toDate,
        projectContext: projectContext.trim() || undefined,
      };

      // Add Salesforce context if available
      if (hasSalesforceContext) {
        if (sowId) requestBody.sowId = sowId;
        if (accountName) requestBody.accountName = accountName;
        if (opportunityName) requestBody.opportunityName = opportunityName;
        if (contactEmails) requestBody.contactEmails = contactEmails;
        if (additionalSearchTerms) requestBody.additionalSearchTerms = additionalSearchTerms;
        if (salesforceAccountId) requestBody.salesforceAccountId = salesforceAccountId;
        if (salesforceOpportunityId) requestBody.salesforceOpportunityId = salesforceOpportunityId;
        if (endpoint === '/api/avoma/enhanced-search') {
          requestBody.useSmartSearch = useEnhancedSearch;
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
      <h3 className="text-lg font-semibold mb-4">Find Avoma Calls</h3>
      
      <div className="space-y-6">
        {/* Search Parameters Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-4">Search Parameters</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salesforce Account ID
              </label>
              <input
                type="text"
                value={salesforceAccountId || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 bg-gray-100 text-gray-600"
                placeholder="Account ID from Salesforce"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salesforce Opportunity ID
              </label>
              <input
                type="text"
                value={salesforceOpportunityId || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 bg-gray-100 text-gray-600"
                placeholder="Opportunity ID from Salesforce"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

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
        </div>

        <button
          onClick={handleSearch}
          disabled={isSearching || (!customer_name.trim() && !accountName) || !fromDate || !toDate}
          className="w-full text-white py-2 px-4 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#2a2a2a',
            border: '1px solid #26D07C'
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              (e.target as HTMLButtonElement).style.backgroundColor = '#01eb1d';
              (e.target as HTMLButtonElement).style.color = '#2a2a2a';
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              (e.target as HTMLButtonElement).style.backgroundColor = '#2a2a2a';
              (e.target as HTMLButtonElement).style.color = 'white';
            }
          }}
        >
          {isSearching ? 'Searching Avoma...' : 'Find Avoma Calls'}
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
              {(searchResults.calls?.length || searchResults.meetings?.length) && (
                <p className="text-green-700 text-sm mt-1">
                  Found {(searchResults.calls?.length || searchResults.meetings?.length || 0)} meeting(s)
                </p>
              )}
            </div>

            {/* Meeting Selection List */}
            {(searchResults.calls?.length || searchResults.meetings?.length) && (
              <div className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Select Meetings for Transcript Analysis</h4>
                  <div className="text-sm text-gray-600">
                    {selectedMeetings.size} of {(searchResults.calls?.length || searchResults.meetings?.length || 0)} selected
                  </div>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(searchResults.calls || searchResults.meetings || []).map((meeting) => (
                    <div key={meeting.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        id={`meeting-${meeting.id}`}
                        checked={selectedMeetings.has(meeting.id)}
                        onChange={(e) => handleMeetingSelection(meeting.id, e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <label htmlFor={`meeting-${meeting.id}`} className="block cursor-pointer">
                          <div className="font-medium text-gray-900 truncate">
                            {meeting.title || meeting.subject || 'Untitled Meeting'}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div className="flex items-center space-x-4">
                              <span>
                                📅 {meeting.start_at ? 
                                  new Date(meeting.start_at).toLocaleDateString() : 
                                  meeting.meeting_date ? 
                                  new Date(meeting.meeting_date).toLocaleDateString() : 
                                  'N/A'}
                              </span>
                              <span>
                                ⏱️ {meeting.duration ? 
                                  Math.round(meeting.duration / 60) : 'N/A'} min
                              </span>
                              {meeting.organizer_email && (
                                <span className="truncate">
                                  👤 {meeting.organizer_email}
                                </span>
                              )}
                            </div>
                            {meeting.attendees && meeting.attendees.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Attendees: {meeting.attendees.map(a => a.email || a.name).filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedMeetings.size > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <button
                      onClick={handleFetchTranscripts}
                      disabled={isFetchingTranscripts}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isFetchingTranscripts ? 'Analyzing Transcripts...' : `Analyze ${selectedMeetings.size} Selected Meeting${selectedMeetings.size > 1 ? 's' : ''}`}
                    </button>
                  </div>
                )}
              </div>
            )}


            {searchResults.searchContext && (
              <div className="p-4 bg-blue-50 rounded-md">
                <h4 className="font-medium text-blue-900 mb-2">Search Context</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Account:</strong> {searchResults.searchContext.accountName}</p>
                  {searchResults.searchContext.opportunityName && (
                    <p><strong>Opportunity:</strong> {searchResults.searchContext.opportunityName}</p>
                  )}
                  {searchResults.searchContext.contactEmails && searchResults.searchContext.contactEmails.length > 0 && (
                    <p><strong>Contact Emails:</strong> {searchResults.searchContext.contactEmails.join(', ')}</p>
                  )}
                  <p><strong>Search Method:</strong> {searchResults.searchContext.searchMethod}</p>
                  <p><strong>Used Salesforce Data:</strong> {searchResults.searchContext.usedSalesforceData ? 'Yes' : 'No'}</p>
                  {searchResults.searchContext.salesforceAccountId && (
                    <p><strong>Salesforce Account ID:</strong> {searchResults.searchContext.salesforceAccountId}</p>
                  )}
                  {searchResults.searchContext.salesforceOpportunityId && (
                    <p><strong>Salesforce Opportunity ID:</strong> {searchResults.searchContext.salesforceOpportunityId}</p>
                  )}
                  <p><strong>Search Terms:</strong> {searchResults.searchContext.searchTerms.join(', ')}</p>
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