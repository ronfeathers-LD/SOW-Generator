import React, { useState, useCallback, useEffect } from 'react';
import { SOWData } from '@/types/sow';
import { SalesforceAccount } from '@/lib/salesforce';
import { WizardStepData } from '../ObjectivesWizard';
import LoadingModal from '../../ui/LoadingModal';

interface AvomaSelectionStepProps {
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

interface AvomaSearchResult {
  id: string;
  url: string;
  title?: string;
  date?: string;
  start_at?: string;
  subject?: string;
  participants?: string[];
  attendees?: Array<{
    email?: string;
    name?: string;
  }>;
  organizer_email?: string;
  duration?: number;
  summary?: string;
  relevanceScore?: number;
  transcription?: string;
  status?: 'pending' | 'completed' | 'failed';
  purpose?: string;
  hasTranscript?: boolean;
  transcription_uuid?: string;
  transcript_ready?: boolean;
  audio_ready?: boolean;
  video_ready?: boolean;
  notes_ready?: boolean;
  state?: string;
  uuid?: string;
}

const AvomaSelectionStep: React.FC<AvomaSelectionStepProps> = ({
  wizardData,
  updateWizardData,
  formData,
  selectedAccount,
  selectedOpportunity,
  onNext,
  onPrev,
}) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AvomaSearchResult[]>([]);
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [fetchingTranscripts, setFetchingTranscripts] = useState<Set<string>>(new Set());
  const [searchContext, setSearchContext] = useState<string>('');

  // Initialize date range to last 6 months
  useEffect(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const today = new Date();
    
    const fromDateStr = sixMonthsAgo.toISOString().split('T')[0];
    const toDateStr = today.toISOString().split('T')[0];
    
    
    setFromDate(fromDateStr);
    setToDate(toDateStr);
  }, []);

  // Load previously selected meetings
  useEffect(() => {
    const selectedIds = new Set(wizardData.selectedMeetings.map(meeting => meeting.id));
    setSelectedMeetingIds(selectedIds);
  }, [wizardData.selectedMeetings]);

  const handleSearch = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError('Please select both start and end dates');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const customerName = selectedAccount?.Name || selectedAccount?.name || '';
      const salesforceAccountId = selectedAccount?.Id || selectedAccount?.id || formData.salesforce_account_id;
      const salesforceOpportunityId = selectedOpportunity?.id || formData.opportunity_id;
      
      // Set search context for loading message
      const accountName = selectedAccount?.Name || selectedAccount?.name;
      const opportunityName = selectedOpportunity?.name;
      
      if (accountName && opportunityName) {
        setSearchContext(`Searching Avoma for meetings with "${accountName}" (${opportunityName})...`);
      } else if (accountName) {
        setSearchContext(`Searching Avoma for meetings with "${accountName}"...`);
      } else {
        setSearchContext('Searching Avoma for meetings...');
      }
      
      // Get partner account ID if this is a partner-sourced opportunity
      const partnerAccountId = formData.salesforce_data?.opportunity_data?.isv_partner_account || 
                              formData.salesforce_data?.opportunity_data?.partner_account;


      const response = await fetch('/api/avoma/enhanced-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sowId: formData.id, // ✅ Added SOW ID
          customerName,
          fromDate,
          toDate,
          accountName: selectedAccount?.Name || selectedAccount?.name,
          opportunityName: selectedOpportunity?.name,
          salesforceAccountId,
          salesforceOpportunityId,
          partnerAccountId, // ✅ Added partner account ID
          // contactEmails are retrieved from Salesforce on the backend
          useEnhancedSearch: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Avoma search failed:', response.status, errorData);
        throw new Error(`Failed to search Avoma meetings: ${response.status} ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      setSearchResults(result.meetings || []);
    } catch (error) {
      console.error('Error searching Avoma meetings:', error);
      setError(error instanceof Error ? error.message : 'Failed to search meetings');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [fromDate, toDate, selectedAccount, selectedOpportunity, formData.salesforce_account_id, formData.opportunity_id, formData.id, formData.salesforce_data]);

  const handleMeetingSelection = useCallback(async (meetingId: string, isSelected: boolean) => {
    const newSelection = new Set(selectedMeetingIds);
    if (isSelected) {
      newSelection.add(meetingId);
    } else {
      newSelection.delete(meetingId);
    }
    setSelectedMeetingIds(newSelection);
    
    // If selecting a meeting, fetch its transcript
    if (isSelected) {
      setFetchingTranscripts(prev => new Set(prev).add(meetingId));
      try {
        const meeting = searchResults.find(m => m.id === meetingId);
        if (meeting) {
          // Fetch transcript for the selected meeting
          const transcriptResponse = await fetch('/api/avoma/transcription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              meetingUuid: meetingId, // ✅ Fixed parameter name
              avomaUrl: meeting.url,  // ✅ Fixed parameter name
            }),
          });

          if (transcriptResponse.ok) {
            const transcriptData = await transcriptResponse.json();
            meeting.transcription = transcriptData.transcription || '';
            meeting.status = transcriptData.transcription ? 'completed' : 'failed';
          } else {
            console.error('Failed to fetch transcript for meeting:', meetingId);
            meeting.status = 'failed';
          }
        }
      } catch (error) {
        console.error('Error fetching transcript for meeting:', meetingId, error);
        // Continue with selection even if transcript fetch fails
      } finally {
        setFetchingTranscripts(prev => {
          const newSet = new Set(prev);
          newSet.delete(meetingId);
          return newSet;
        });
      }
    }
    
    // Immediately persist the selection changes with transcript data
    const selectedMeetings = searchResults
      .filter(meeting => {
        const isCurrentlySelected = newSelection.has(meeting.id);
        return isCurrentlySelected;
      })
      .map(meeting => ({
        id: meeting.id,
        url: meeting.url,
        title: meeting.title,
        date: meeting.date,
        transcription: meeting.transcription || '',
        status: meeting.status || 'pending' as const,
      }));
    
    updateWizardData({ selectedMeetings });
  }, [selectedMeetingIds, searchResults, updateWizardData]);

  const handleNext = useCallback(() => {
    // Meetings are already persisted in handleMeetingSelection, just proceed to next step
    onNext();
  }, [onNext]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Avoma Call Selection</h3>
        <p className="text-sm text-gray-600 mb-4">
          Search for and select relevant Avoma recordings that contain project requirements and objectives.
        </p>
        
        {/* Partner-sourced note */}
        {formData.salesforce_data?.opportunity_data?.is_partner_sourced && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start">
              <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-blue-900 font-medium">Partner-Sourced Opportunity</p>
                <p className="text-xs text-blue-700 mt-1">
                  Since this is a partner-sourced opportunity, we&apos;ll include partner account information in the call search to find recordings associated with the partner account.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Date Range Selection */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Search Date Range</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching || !fromDate || !toDate}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSearching ? 'Searching...' : 'Search Meetings'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Search Results ({searchResults.length} meetings found)</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map((meeting) => (
              <div
                key={meeting.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedMeetingIds.has(meeting.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleMeetingSelection(meeting.id, !selectedMeetingIds.has(meeting.id))}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedMeetingIds.has(meeting.id)}
                    onChange={() => handleMeetingSelection(meeting.id, !selectedMeetingIds.has(meeting.id))}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-gray-900 truncate">
                        {meeting.title || 'Untitled Meeting'}
                      </h5>
                      {meeting.relevanceScore && (
                        <span className="text-xs text-gray-500">
                          Relevance: {meeting.relevanceScore}%
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      <div className="flex items-center space-x-3">
                        {(meeting.start_at || meeting.date) && (
                          <span>📅 {new Date(meeting.start_at || meeting.date || '').toLocaleDateString()} at {new Date(meeting.start_at || meeting.date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                        {meeting.duration && (
                          <span>⏱️ {Math.round(meeting.duration / 60)} min</span>
                        )}
                      </div>
                      
                      {meeting.organizer_email && (
                        <div className="flex items-center space-x-1">
                          <span>👤 Organizer:</span>
                          <span className="font-medium text-gray-700">{meeting.organizer_email}</span>
                        </div>
                      )}
                      
                      {((meeting.participants?.length || 0) + (meeting.attendees?.length || 0)) > 0 && (
                        <div className="flex items-start space-x-1">
                          <span>👥 {meeting.participants?.length || meeting.attendees?.length} participant{(meeting.participants?.length || meeting.attendees?.length) !== 1 ? 's' : ''}:</span>
                          <div className="flex flex-wrap gap-1">
                            {(meeting.participants || meeting.attendees || []).slice(0, 3).map((participant: { email?: string; name?: string }, idx: number) => (
                              <span key={idx} className="text-gray-600 bg-gray-100 px-1 rounded text-xs">
                                {participant.email || participant.name || 'Unknown'}
                              </span>
                            ))}
                            {(meeting.participants?.length || meeting.attendees?.length || 0) > 3 && (
                              <span className="text-gray-500 text-xs">+{(meeting.participants?.length || meeting.attendees?.length || 0) - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {meeting.purpose && (
                        <div className="flex items-start space-x-1">
                          <span>📝</span>
                          <span className="text-gray-600 italic text-xs">{meeting.purpose}</span>
                        </div>
                      )}
                      
                      {/* Transcript status indicator */}
                      {selectedMeetingIds.has(meeting.id) && (
                        <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                          {fetchingTranscripts.has(meeting.id) ? (
                            <>🔄 Fetching transcript...</>
                          ) : meeting.status === 'completed' ? (
                            <>✅ Transcript ready</>
                          ) : meeting.status === 'failed' ? (
                            <>❌ Transcript failed</>
                          ) : (
                            <>⏳ Transcript pending</>
                          )}
                        </div>
                      )}
                    </div>
                    {meeting.summary && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {meeting.summary}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Meetings Summary */}
      {selectedMeetingIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Selected Meetings ({selectedMeetingIds.size})</h4>
          <div className="space-y-1">
            {Array.from(selectedMeetingIds).map((meetingId) => {
              // First try to find in current search results, then fall back to stored meeting data
              let meeting = searchResults.find(m => m.id === meetingId);
              let storedMeeting = null;
              let transcriptStatus = 'pending';
              
              if (!meeting) {
                // Fall back to stored meeting data from wizardData
                storedMeeting = wizardData.selectedMeetings.find(m => m.id === meetingId);
                if (storedMeeting) {
                  meeting = {
                    id: storedMeeting.id,
                    url: storedMeeting.url,
                    title: storedMeeting.title,
                    date: storedMeeting.date,
                    transcription: storedMeeting.transcription,
                    status: storedMeeting.status,
                  };
                  transcriptStatus = storedMeeting.status || 'pending';
                }
              } else {
                // Use current meeting's status from search results
                transcriptStatus = meeting.status || 'pending';
              }
              
              return meeting ? (
                <div key={meetingId} className="text-sm text-blue-800">
                  • {meeting.title || 'Untitled Meeting'}
                  {meeting.date && ` (${new Date(meeting.date).toLocaleDateString()})`}
                  {/* Show transcript status */}
                  {fetchingTranscripts.has(meetingId) ? (
                    <span className="ml-2 text-blue-600">• Fetching transcript...</span>
                  ) : transcriptStatus === 'completed' ? (
                    <span className="ml-2 text-green-600">• Transcript ready</span>
                  ) : transcriptStatus === 'failed' ? (
                    <span className="ml-2 text-red-600">• Transcript failed</span>
                  ) : (
                    <span className="ml-2 text-gray-500">• Transcript pending</span>
                  )}
                </div>
              ) : (
                <div key={meetingId} className="text-sm text-blue-800">
                  • Meeting ID: {meetingId} (details not available)
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onPrev}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Previous: Documents
        </button>
        <div className="flex space-x-3">
          <div className="text-sm text-gray-500 self-center">
            {selectedMeetingIds.size} meeting(s) selected
          </div>
          <button
            onClick={handleNext}
            disabled={selectedMeetingIds.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next: Content Preview
          </button>
        </div>
      </div>

      {/* Loading Modal for Avoma Search */}
      <LoadingModal
        isOpen={isSearching}
        operation="custom"
        message={searchContext || "🔍 Searching for meetings in Avoma..."}
      />
    </div>
  );
};

export default AvomaSelectionStep;
