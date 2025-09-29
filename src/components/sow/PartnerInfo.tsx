import React from 'react';

interface PartnerInfoProps {
  opportunityId?: string;
  partnerInfo: {
    success: boolean;
    opportunity: {
      id: string;
      name: string;
      isPartnerSourced: boolean;
      partnerAccountId?: string;
      partnerAccountName?: string;
      implementationPartner?: string;
      channelPartnerContractAmount?: number;
      dateOfPartnerEngagement?: string;
    };
    partnerAccount?: {
      id: string;
      name: string;
      type?: string;
      industry?: string;
      website?: string;
      phone?: string;
      owner?: string;
      partnerStatus?: string;
      partnerType?: string;
      partnerTier?: string;
      primaryPartnerContact?: string;
    } | null;
  } | null;
  salesforceInstanceUrl?: string;
}

const PartnerInfo: React.FC<PartnerInfoProps> = ({ 
  partnerInfo, 
  salesforceInstanceUrl 
}) => {
  if (!partnerInfo?.opportunity.isPartnerSourced) {
    return null;
  }

  const { opportunity, partnerAccount } = partnerInfo;

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getPartnerAccountUrl = () => {
    if (!partnerAccount?.id || !salesforceInstanceUrl) return null;
    return `${salesforceInstanceUrl}/lightning/r/Account/${partnerAccount.id}/view`;
  };

  const partnerAccountUrl = getPartnerAccountUrl();

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center mb-3">
        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-blue-900">Partner-Sourced Opportunity</h3>
      </div>
      
      <div className="space-y-3">
        {/* Partner Account Information */}
        {partnerAccount && (
          <div className="bg-white border border-blue-200 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-900">Partner Account</h4>
              {partnerAccountUrl && (
                <a
                  href={partnerAccountUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View in Salesforce
                </a>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Name:</span>
                <span className="ml-2 text-gray-900">{partnerAccount.name}</span>
              </div>
              {partnerAccount.type && (
                <div>
                  <span className="font-medium text-gray-700">Type:</span>
                  <span className="ml-2 text-gray-900">{partnerAccount.type}</span>
                </div>
              )}
              {partnerAccount.industry && (
                <div>
                  <span className="font-medium text-gray-700">Industry:</span>
                  <span className="ml-2 text-gray-900">{partnerAccount.industry}</span>
                </div>
              )}
              {partnerAccount.partnerStatus && (
                <div>
                  <span className="font-medium text-gray-700">Partner Status:</span>
                  <span className="ml-2 text-gray-900">{partnerAccount.partnerStatus}</span>
                </div>
              )}
              {partnerAccount.partnerType && (
                <div>
                  <span className="font-medium text-gray-700">Partner Type:</span>
                  <span className="ml-2 text-gray-900">{partnerAccount.partnerType}</span>
                </div>
              )}
              {partnerAccount.partnerTier && (
                <div>
                  <span className="font-medium text-gray-700">Partner Tier:</span>
                  <span className="ml-2 text-gray-900">{partnerAccount.partnerTier}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Opportunity Partner Details */}
        <div className="bg-white border border-blue-200 rounded-md p-3">
          <h4 className="font-medium text-blue-900 mb-2">Partner Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {opportunity.implementationPartner && (
              <div>
                <span className="font-medium text-gray-700">Implementation Partner:</span>
                <span className="ml-2 text-gray-900">{opportunity.implementationPartner}</span>
              </div>
            )}
            {opportunity.channelPartnerContractAmount && (
              <div>
                <span className="font-medium text-gray-700">Contract Amount:</span>
                <span className="ml-2 text-gray-900">{formatCurrency(opportunity.channelPartnerContractAmount)}</span>
              </div>
            )}
            {opportunity.dateOfPartnerEngagement && (
              <div>
                <span className="font-medium text-gray-700">Partner Engagement Date:</span>
                <span className="ml-2 text-gray-900">{formatDate(opportunity.dateOfPartnerEngagement)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Avoma Search Note */}
        <div className="bg-blue-100 border border-blue-300 rounded-md p-3">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-blue-800 text-sm font-medium">💡 Avoma Search Tip</p>
              <p className="text-blue-700 text-xs mt-1">
                Since this opportunity is partner-sourced, Avoma meetings may be associated with the partner account 
                rather than the customer account. If no meetings are found for the customer, consider searching 
                using the partner account information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerInfo;
