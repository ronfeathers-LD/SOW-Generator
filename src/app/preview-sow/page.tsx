'use client';

import { useState, useCallback, useEffect } from 'react';
import SalesforceIntegration from '@/components/SalesforceIntegration';
import OpportunityLookup from '@/components/OpportunityLookup';
import LoadingModal from '@/components/ui/LoadingModal';
import { SalesforceAccount, SalesforceOpportunity } from '@/lib/salesforce';

interface AvomaMeeting {
  id: string;
  url: string;
  title?: string;
  subject?: string;
  date?: string;
  start_at?: string;
  duration?: number;
  organizer_email?: string;
  attendees?: Array<{ email?: string; name?: string }>;
  purpose?: string;
  hasTranscript?: boolean;
  transcript_ready?: boolean;
}

interface PreviewResult {
  customerName: string;
  objectiveOverview: string;
  overcomingActions: string[];
  solutions: Record<string, string[]>;
  detectedProducts: string[];
  transcriptionsUsed: number;
  meetingTitles: string[];
}

export default function PreviewSOWPage() {
  // const router = useRouter(); // Unused - removed
  const [step, setStep] = useState<'account' | 'opportunity' | 'meetings' | 'preview'>('account');
  
  // Account/Opportunity state
  const [selectedAccount, setSelectedAccount] = useState<SalesforceAccount | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<{
    id: string;
    name: string;
    amount?: number;
    stageName?: string;
    closeDate?: string;
  } | null>(null);
  // const [availableOpportunities, setAvailableOpportunities] = useState<Array<{
  //   id: string;
  //   name: string;
  //   amount?: number;
  //   stageName?: string;
  //   closeDate?: string;
  // }>>([]); // Unused - removed

  // Meeting search state
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AvomaMeeting[]>([]);
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<Set<string>>(new Set());
  const [fetchingTranscripts, setFetchingTranscripts] = useState<Set<string>>(new Set());
  const [searchError, setSearchError] = useState<string | null>(null);

  // Preview state
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Initialize date range to last 6 months
  useEffect(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const today = new Date();
    
    setFromDate(sixMonthsAgo.toISOString().split('T')[0]);
    setToDate(today.toISOString().split('T')[0]);
  }, []);

  const handleAccountSelected = (customerData: { account: unknown; opportunities: unknown[] }) => {                                                             
    const account = customerData.account as SalesforceAccount;
    setSelectedAccount(account);
    // Opportunities are now handled by OpportunityLookup component
    setSelectedOpportunity(null);
  };

  const handleOpportunitySelected = (opportunity: SalesforceOpportunity) => {
    setSelectedOpportunity({
      id: opportunity.Id,
      name: opportunity.Name,
      amount: opportunity.Amount,
      stageName: opportunity.StageName,
      closeDate: opportunity.CloseDate
    });
  };

  const handleSearchMeetings = useCallback(async () => {
    if (!fromDate || !toDate) {
      setSearchError('Please select both start and end dates');
      return;
    }

    if (!selectedAccount) {
      setSearchError('Please select an account first');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const accountName = selectedAccount.Name || selectedAccount.name || '';
      const salesforceAccountId = selectedAccount.Id || selectedAccount.id;
      const salesforceOpportunityId = selectedOpportunity?.id;

      const response = await fetch('/api/avoma/enhanced-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountName,
          opportunityName: selectedOpportunity?.name,
          fromDate,
          toDate,
          salesforceAccountId,
          salesforceOpportunityId,
          useEnhancedSearch: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to search meetings');
      }

      const result = await response.json();
      setSearchResults(result.meetings || []);
    } catch (error) {
      console.error('Error searching meetings:', error);
      setSearchError(error instanceof Error ? error.message : 'Failed to search meetings');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [fromDate, toDate, selectedAccount, selectedOpportunity]);

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
          const transcriptResponse = await fetch('/api/avoma/transcription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              meetingUuid: meetingId,
              avomaUrl: meeting.url,
            }),
          });

          if (!transcriptResponse.ok) {
            console.error('Failed to fetch transcript for meeting:', meetingId);
          }
        }
      } catch (error) {
        console.error('Error fetching transcript for meeting:', meetingId, error);
      } finally {
        setFetchingTranscripts(prev => {
          const newSet = new Set(prev);
          newSet.delete(meetingId);
          return newSet;
        });
      }
    }
  }, [selectedMeetingIds, searchResults]);

  const handleGeneratePreview = useCallback(async () => {
    if (selectedMeetingIds.size === 0) {
      setPreviewError('Please select at least one meeting');
      return;
    }

    if (!selectedAccount) {
      setPreviewError('Account is required');
      return;
    }

    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      const accountName = selectedAccount.Name || selectedAccount.name || '';
      const salesforceAccountId = selectedAccount.Id || selectedAccount.id;
      const salesforceOpportunityId = selectedOpportunity?.id;

      const response = await fetch('/api/sow/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingIds: Array.from(selectedMeetingIds),
          accountName,
          opportunityName: selectedOpportunity?.name,
          salesforceAccountId,
          salesforceOpportunityId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate preview');
      }

      const data = await response.json();
      setPreviewResult(data.preview);
      setStep('preview');
    } catch (error) {
      console.error('Error generating preview:', error);
      setPreviewError(error instanceof Error ? error.message : 'Failed to generate preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [selectedMeetingIds, selectedAccount, selectedOpportunity]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SOW Preview</h1>
          <p className="mt-2 text-sm text-gray-600">
            Generate a preview of SOW details based on Avoma transcriptions. Nothing is saved to the database.
          </p>
        </div>

        {/* Step 1: Account Selection */}
        {step === 'account' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Step 1: Select Account</h2>
            <SalesforceIntegration 
              onCustomerSelected={handleAccountSelected}
              showOnlyAccountSelection={true}
            />
            {selectedAccount && (
              <div className="mt-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900">
                    Selected: {selectedAccount.Name || selectedAccount.name}
                  </p>
                </div>
                <button
                  onClick={() => setStep('opportunity')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next: Select Opportunity
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Opportunity Selection */}
        {step === 'opportunity' && selectedAccount && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Select Opportunity</h2>
            <OpportunityLookup
              accountId={selectedAccount.Id || selectedAccount.id || ''}
              accountName={selectedAccount.Name || selectedAccount.name || ''}
              onOpportunitySelected={handleOpportunitySelected}
            />
            {selectedOpportunity && (
              <div className="mt-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900">
                    Selected: {selectedOpportunity.name}
                  </p>
                </div>
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={() => setStep('account')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep('meetings')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Next: Select Meetings
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Meeting Selection */}
        {step === 'meetings' && selectedAccount && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Step 3: Select Meetings</h2>

            {/* Date Range */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Search Date Range</h3>
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
                onClick={handleSearchMeetings}
                disabled={isSearching || !fromDate || !toDate}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Searching...' : 'Search Meetings'}
              </button>
            </div>

            {/* Error Display */}
            {searchError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm">{searchError}</p>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">
                  Search Results ({searchResults.length} meetings found)
                </h3>
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
                          <h4 className="text-sm font-medium text-gray-900">
                            {meeting.title || meeting.subject || 'Untitled Meeting'}
                          </h4>
                          <div className="mt-2 text-xs text-gray-600 space-y-1">
                            {(meeting.start_at || meeting.date) && (
                              <span>📅 {new Date(meeting.start_at || meeting.date || '').toLocaleDateString()}</span>
                            )}
                            {meeting.organizer_email && (
                              <div>👤 Organizer: {meeting.organizer_email}</div>
                            )}
                            {fetchingTranscripts.has(meeting.id) && (
                              <span className="text-blue-600">🔄 Fetching transcript...</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Meetings Summary */}
            {selectedMeetingIds.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">
                  Selected Meetings ({selectedMeetingIds.size})
                </h3>
                <div className="space-y-1">
                  {Array.from(selectedMeetingIds).map((meetingId) => {
                    const meeting = searchResults.find(m => m.id === meetingId);
                    return meeting ? (
                      <div key={meetingId} className="text-sm text-blue-800">
                        • {meeting.title || meeting.subject || 'Untitled Meeting'}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setStep('opportunity')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleGeneratePreview}
                disabled={selectedMeetingIds.size === 0 || isGeneratingPreview}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isGeneratingPreview ? 'Generating Preview...' : 'Generate Preview'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Preview Results */}
        {step === 'preview' && previewResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Preview Results</h2>
              <button
                onClick={() => {
                  setPreviewResult(null);
                  setStep('account');
                  setSelectedAccount(null);
                  setSelectedOpportunity(null);
                  setSearchResults([]);
                  setSelectedMeetingIds(new Set());
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Start Over
              </button>
            </div>

            {/* Detected Products */}
            {previewResult.detectedProducts.length > 0 && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Detected Products</h3>
                <div className="flex flex-wrap gap-2">
                  {previewResult.detectedProducts.map((product, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Objective Overview */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Objective Overview</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{previewResult.objectiveOverview}</p>
              </div>
            </div>

            {/* Overcoming Actions */}
            {previewResult.overcomingActions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Key Objectives</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <ul className="space-y-2">
                    {previewResult.overcomingActions.map((action, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Solutions */}
            {Object.keys(previewResult.solutions).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Solutions</h3>
                <div className="space-y-4">
                  {Object.entries(previewResult.solutions).map(([product, items]) => (
                    <div key={product} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{product}</h4>
                      <ul className="space-y-1">
                        {items.map((item, idx) => (
                          <li key={idx} className="flex items-start text-sm text-gray-700">
                            <span className="text-blue-600 mr-2">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Based on {previewResult.transcriptionsUsed} transcription(s) from {previewResult.meetingTitles.length} meeting(s)
              </p>
            </div>
          </div>
        )}

        {/* Preview Error */}
        {previewError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{previewError}</p>
          </div>
        )}

        {/* Loading Modal */}
        <LoadingModal
          isOpen={isGeneratingPreview}
          operation="custom"
          message="🤖 Generating SOW preview from transcriptions..."
        />
      </div>
    </div>
  );
}


