'use client';

import { useState, useEffect } from 'react';
import { SOWData } from '@/types/sow';

interface SOWDataLoaderProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoad: (data: SOWData) => void;
}

interface SOWSummary {
  id: string;
  sow_title: string;
  client_name: string;
  created_at: string;
  updated_at: string;
  template?: {
    products?: string[];
    number_of_units?: string;
    orchestration_units?: string;
    bookit_forms_units?: string;
    bookit_links_units?: string;
    bookit_handoff_units?: string;
  };
  selectedAccount?: {
    Account_Segment__c?: string;
  };
}

export default function SOWDataLoader({ isOpen, onClose, onDataLoad }: SOWDataLoaderProps) {
  const [sows, setSows] = useState<SOWSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSOW, setSelectedSOW] = useState<SOWSummary | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSOWs();
    }
  }, [isOpen]);

  const fetchSOWs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sow');
      if (response.ok) {
        const data = await response.json();
        setSows(data || []);
      }
    } catch (error) {
      console.error('Error fetching SOWs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSOWDetails = async (sowId: string) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/sow/${sowId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSOW(data);
      }
    } catch (error) {
      console.error('Error fetching SOW details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSOWSelect = (sow: SOWSummary) => {
    setSelectedSOW(sow);
    fetchSOWDetails(sow.id);
  };

  const handleLoadData = () => {
    if (selectedSOW) {
      // Convert SOWSummary to SOWData format for the calculator
      const sowData: SOWData = {
        id: selectedSOW.id,
        created_at: new Date(selectedSOW.created_at),
        updated_at: new Date(selectedSOW.updated_at),
        template: selectedSOW.template ? {
          sow_title: selectedSOW.sow_title || '',
          company_logo: '',
          client_name: selectedSOW.client_name || '',
          customer_signature_name: '',
          customer_signature: '',
          customer_email: '',
          customer_signature_date: null,
          lean_data_name: '',
          lean_data_title: '',
          lean_data_email: '',
          lean_data_signature_name: '',
          lean_data_signature: '',
          lean_data_signature_date: null,
          products: selectedSOW.template.products || [],
          number_of_units: selectedSOW.template.number_of_units || '',
          regions: '',
          salesforce_tenants: '',
          timeline_weeks: '',
          units_consumption: '',
          orchestration_units: selectedSOW.template.orchestration_units || '',
          bookit_forms_units: selectedSOW.template.bookit_forms_units || '',
          bookit_links_units: selectedSOW.template.bookit_links_units || '',
          bookit_handoff_units: selectedSOW.template.bookit_handoff_units || '',
          billing_company_name: '',
          billing_contact_name: '',
          billing_address: '',
          billing_email: '',
          purchase_order_number: '',
        } : undefined,
        selectedAccount: selectedSOW.selectedAccount ? {
          Id: '',
          Name: selectedSOW.client_name || '',
          Account_Segment__c: selectedSOW.selectedAccount.Account_Segment__c,
        } : undefined,
        pm_hours_requirement_disabled: false, // Default to false for calculator
        header: {
          company_logo: '',
          client_name: selectedSOW.client_name || '',
          sow_title: selectedSOW.sow_title || '',
        },
        client_signature: {
          name: '',
          title: '',
          email: '',
          signature_date: new Date(),
        },
        objectives: {
          description: '',
          key_objectives: [],
        },
        scope: {
          deliverables: '',
          timeline: {
            duration: '',
          },
        },
        roles: {
          client_roles: [],
        },
        pricing: {
          roles: [],
          billing: {
            company_name: '',
            billing_contact: '',
            billing_address: '',
            billing_email: '',
            po_number: '',
          },
        },
      };
      onDataLoad(sowData);
    }
  };

  const filteredSOWs = sows.filter(sow => 
    sow.sow_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sow.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Load Data from SOW</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search SOWs by title or client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SOW List */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Select SOW</h4>
              <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading SOWs...</p>
                  </div>
                ) : filteredSOWs.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No SOWs found
                  </div>
                ) : (
                  filteredSOWs.map((sow) => (
                    <div
                      key={sow.id}
                      onClick={() => handleSOWSelect(sow)}
                      className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                        selectedSOW?.id === sow.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{sow.sow_title}</div>
                      <div className="text-sm text-gray-600">{sow.client_name}</div>
                      <div className="text-xs text-gray-500">
                        Created: {new Date(sow.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SOW Details */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">SOW Details</h4>
              {loadingDetails ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading details...</p>
                </div>
              ) : selectedSOW ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Title:</span>
                      <p className="text-sm text-gray-900">{selectedSOW.sow_title}</p>
                    </div>
                    
                    <div>
                      <span className="font-medium text-gray-700">Client:</span>
                      <p className="text-sm text-gray-900">{selectedSOW.client_name}</p>
                    </div>

                    <div>
                      <span className="font-medium text-gray-700">Account Segment:</span>
                      <p className="text-sm text-gray-900">
                        {selectedSOW.selectedAccount?.Account_Segment__c || 'Not specified'}
                      </p>
                    </div>

                    <div>
                      <span className="font-medium text-gray-700">Products:</span>
                      <div className="text-sm text-gray-900">
                        {selectedSOW.template?.products?.length ? (
                          <ul className="list-disc list-inside mt-1">
                            {selectedSOW.template.products.map((product, index) => (
                              <li key={index}>{product}</li>
                            ))}
                          </ul>
                        ) : (
                          'No products selected'
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium text-gray-700">Units:</span>
                      <div className="text-sm text-gray-900 space-y-1">
                        {selectedSOW.template?.number_of_units && (
                          <div>Routing: {selectedSOW.template.number_of_units}</div>
                        )}
                        {selectedSOW.template?.orchestration_units && (
                          <div>Orchestration: {selectedSOW.template.orchestration_units}</div>
                        )}
                        {selectedSOW.template?.bookit_forms_units && (
                          <div>BookIt Forms: {selectedSOW.template.bookit_forms_units}</div>
                        )}
                        {selectedSOW.template?.bookit_links_units && (
                          <div>BookIt Links: {selectedSOW.template.bookit_links_units}</div>
                        )}
                        {selectedSOW.template?.bookit_handoff_units && (
                          <div>BookIt Handoff: {selectedSOW.template.bookit_handoff_units}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                  Select a SOW to view details
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleLoadData}
              disabled={!selectedSOW}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Load Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
