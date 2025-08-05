import React, { useState } from 'react';
import { SOWData } from '@/types/sow';

interface BillingPaymentTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  selectedAccountId?: string;
}

export default function BillingPaymentTab({
  formData,
  setFormData,
  selectedAccountId,
}: BillingPaymentTabProps) {
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingSuccess, setBillingSuccess] = useState<string | null>(null);

  const fetchBillingFromSalesforce = async () => {
    if (!selectedAccountId) {
      setBillingError('No account selected. Please select a customer first.');
      return;
    }

    setIsLoadingBilling(true);
    setBillingError(null);

    try {
      const response = await fetch(`/api/salesforce/billing-info?accountId=${selectedAccountId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch billing information');
      }

      const data = await response.json();
      const billingInfo = data.billingInfo;

      // Update form data with billing information from Salesforce
      setFormData({
        ...formData,
        template: {
          ...formData.template!,
          billing_company_name: billingInfo.companyName || formData.template?.customer_name || '',
          billing_contact_name: billingInfo.billingContact || '',
          billing_address: billingInfo.billingAddress || '',
          billing_email: billingInfo.billingEmail || '',
        },
        pricing: {
          ...formData.pricing!,
          billing: {
            ...formData.pricing?.billing!,
            company_name: billingInfo.companyName || formData.template?.customer_name || '',
            billing_contact: billingInfo.billingContact || '',
            billing_address: billingInfo.billingAddress || '',
            billing_email: billingInfo.billingEmail || '',
          }
        }
      });

      setBillingSuccess('Billing information loaded from Salesforce successfully!');

      setBillingError(null);
      setBillingSuccess(null);
    } catch (error) {
      console.error('Error fetching billing info:', error);
      setBillingError('Failed to fetch billing information from Salesforce');
    } finally {
      setIsLoadingBilling(false);
    }
  };
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Billing & Payment</h2>
      
      {/* Billing Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Billing Information</h3>
          {selectedAccountId && (
            <button
              type="button"
              onClick={fetchBillingFromSalesforce}
              disabled={isLoadingBilling}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingBilling ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Get from Salesforce
                </>
              )}
            </button>
          )}
        </div>
        
        {billingError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{billingError}</p>
          </div>
        )}
        
        {billingSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{billingSuccess}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Name</label>
            <input
              type="text"
              value={formData.template?.billing_company_name || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, billing_company_name: e.target.value },
                pricing: {
                  ...formData.pricing!,
                  billing: { ...formData.pricing?.billing!, company_name: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Billing Contact Name</label>
            <input
              type="text"
              value={formData.template?.billing_contact_name || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, billing_contact_name: e.target.value },
                pricing: {
                  ...formData.pricing!,
                  billing: { ...formData.pricing?.billing!, billing_contact: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Billing Address</label>
            <input
              type="text"
              value={formData.template?.billing_address || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, billing_address: e.target.value },
                pricing: {
                  ...formData.pricing!,
                  billing: { ...formData.pricing?.billing!, billing_address: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Billing Email</label>
            <input
              type="email"
              value={formData.template?.billing_email || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, billing_email: e.target.value },
                pricing: {
                  ...formData.pricing!,
                  billing: { ...formData.pricing?.billing!, billing_email: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Purchase Order Number</label>
            <input
              type="text"
              value={formData.template?.purchase_order_number || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, purchase_order_number: e.target.value },
                pricing: {
                  ...formData.pricing!,
                  billing: { ...formData.pricing?.billing!, po_number: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="N/A"
            />
          </div>
        </div>
      </div>


    </section>
  );
} 