'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import ChangeOrderForm from '@/components/change-orders/ChangeOrderForm';
import ChangeOrderList from '@/components/change-orders/ChangeOrderList';
import SOWSelector from '@/components/change-orders/SOWSelector';
import { ChangeOrderFormData, ChangeOrderWithSOW, SOWData, ChangeCategory } from '@/types/sow';

type ViewMode = 'list' | 'create' | 'select-sow' | 'view' | 'edit';

function ChangeOrdersPageContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSOW, setSelectedSOW] = useState<SOWData | null>(null);
  const [selectedChangeOrder, setSelectedChangeOrder] = useState<ChangeOrderWithSOW | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check for SOW ID in URL parameters
  useEffect(() => {
    const sowId = searchParams.get('sowId');
    if (sowId) {
      // Fetch the SOW data and go directly to create mode
      fetchSOWData(sowId);
    }
  }, [searchParams]);

  const fetchSOWData = async (sowId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/sow/${sowId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch SOW data');
      }
      
      const sowData = await response.json();
      setSelectedSOW(sowData);
      setViewMode('create');
    } catch (error) {
      console.error('Error fetching SOW data:', error);
      alert('Failed to load SOW data. Please try again.');
      setViewMode('list');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if not authenticated
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/');
    return null;
  }

  const handleCreateChangeOrder = () => {
    setViewMode('select-sow');
    setSelectedSOW(null);
  };

  const handleSOWSelect = (sow: SOWData) => {
    setSelectedSOW(sow);
    setViewMode('create');
  };

  const handleFormSubmit = async (formData: ChangeOrderFormData) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/change-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create change order');
      }

      const changeOrder = await response.json();
      console.log('Change order created:', changeOrder);
      
      // Trigger refresh for the list
      setRefreshTrigger(prev => prev + 1);
      
      // Set the created change order and switch to edit mode
      setSelectedChangeOrder(changeOrder);
      setViewMode('edit');
      setSelectedSOW(null);
      
      // Show success message (you could add a toast notification here)
      alert('Change order created successfully! You can now edit it.');
      
    } catch (error) {
      console.error('Error creating change order:', error);
      alert(`Error creating change order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormCancel = () => {
    if (selectedSOW) {
      setViewMode('create');
    } else {
      setViewMode('list');
    }
  };

  const handleSelectSOWCancel = () => {
    setViewMode('list');
    setSelectedSOW(null);
  };

  const handleViewChangeOrder = (changeOrder: ChangeOrderWithSOW) => {
    setSelectedChangeOrder(changeOrder);
    setViewMode('view');
  };

  const handleEditChangeOrder = (changeOrder: ChangeOrderWithSOW) => {
    setSelectedChangeOrder(changeOrder);
    setViewMode('edit');
  };

  const handleDeleteChangeOrder = async (changeOrder: ChangeOrderWithSOW) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/change-orders/${changeOrder.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete change order');
      }

      alert('Change order deleted successfully!');
      
      // Refresh the list by triggering a refresh
      setRefreshTrigger(prev => prev + 1);
      
      // Go back to list view
      setViewMode('list');
      setSelectedChangeOrder(null);
      
    } catch (error) {
      console.error('Error deleting change order:', error);
      alert(`Error deleting change order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedSOW(null);
    setSelectedChangeOrder(null);
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'select-sow':
        return (
          <SOWSelector
            onSOWSelect={handleSOWSelect}
            onCancel={handleSelectSOWCancel}
          />
        );

      case 'create':
        return (
          <ChangeOrderForm
            sowData={selectedSOW || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isLoading={isLoading}
          />
        );

      case 'edit':
        return (
          <ChangeOrderForm
            initialData={{
              sow_id: selectedChangeOrder?.sow_id || '',
              change_requestor: selectedChangeOrder?.change_requestor || '',
              change_categories: selectedChangeOrder?.change_categories || [],
              reason_for_change: selectedChangeOrder?.reason_for_change || '',
              change_description: selectedChangeOrder?.change_description || '',
              new_start_date: selectedChangeOrder?.new_start_date ? new Date(selectedChangeOrder.new_start_date) : undefined,
              new_end_date: selectedChangeOrder?.new_end_date ? new Date(selectedChangeOrder.new_end_date) : undefined,
              associated_po: selectedChangeOrder?.associated_po || 'N/A',
              pricing_roles: selectedChangeOrder?.pricing_roles || []
            }}
            sowData={selectedChangeOrder?.sow as unknown as SOWData}
            onSubmit={async (formData) => {
              try {
                setIsLoading(true);
                
                const response = await fetch(`/api/change-orders/${selectedChangeOrder?.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(formData),
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to update change order');
                }

                const updatedChangeOrder = await response.json();
                setSelectedChangeOrder(updatedChangeOrder);
                setViewMode('view');
                
                // Trigger refresh for the list
                setRefreshTrigger(prev => prev + 1);
                
                alert('Change order updated successfully!');
                
              } catch (error) {
                console.error('Error updating change order:', error);
                alert(`Error updating change order: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                setIsLoading(false);
              }
            }}
            onCancel={() => setViewMode('view')}
            isLoading={isLoading}
          />
        );

      case 'view':
        return (
          <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <div className="mb-6">
              <button
                onClick={handleBackToList}
                className="mb-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                ← Back to List
              </button>
            </div>

            {selectedChangeOrder && (
              <div className="space-y-8">
                {/* Document Header */}
                <div className="text-center border-b-2 border-gray-300 pb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Change Order : {selectedChangeOrder.change_order_number}</h1>
                </div>

                {/* Intro Paragraph */}
                <div className="text-gray-700 leading-relaxed">
                  <p>This Change Order (&quot;CO&quot;), is effective as of signature of the document (&quot;CO Effective Date&quot;) and is being entered into in accordance with and pursuant to the Order Form by and between <strong>PDQ</strong>, (&quot;Customer&quot;) and <strong>LeanData, Inc.</strong>, (&quot;LeanData&quot;), dated <strong>{selectedChangeOrder.order_form_date ? new Date(selectedChangeOrder.order_form_date).toLocaleDateString() : 'N/A'}</strong>, (&quot;Order Form&quot;). The following Change Order defines the additional or change in services.</p>
                </div>

                {/* Details Section */}
                <div>
                  <p className="text-gray-700 mb-4">The following provides the details of the changes as part of the CO :</p>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="py-2 pr-4 font-semibold text-gray-900 w-48">Project:</td>
                        <td className="py-2 text-gray-700">{selectedChangeOrder.project_name}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-semibold text-gray-900 w-48">Change Requestor:</td>
                        <td className="py-2 text-gray-700">{selectedChangeOrder.change_requestor}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-semibold text-gray-900 w-48">Change Number:</td>
                        <td className="py-2 text-gray-700">{selectedChangeOrder.change_number}</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-semibold text-gray-900 w-48">Associated PO:</td>
                        <td className="py-2 text-gray-700">{selectedChangeOrder.associated_po}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                  {/* Change Categories */}
                  <div>
                    <p className="text-gray-700 mb-3">Change Category (Select all that apply):</p>
                    <div className="flex flex-wrap gap-3">
                      {['Schedule', 'Cost', 'Scope', 'Testing (Quality)', 'Resources', 'Artifacts'].map((category) => {
                        const isChecked = selectedChangeOrder.change_categories.includes(category as ChangeCategory);
                        return (
                          <div key={category} className={`flex items-center space-x-2 px-3 py-2 rounded-lg border-2 transition-all ${
                            isChecked 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-700'
                          }`}>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isChecked 
                                ? 'bg-white border-white' 
                                : 'border-gray-400'
                            }`}>
                              {isChecked && (
                                <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-sm font-medium ${
                              isChecked ? 'text-white' : 'text-gray-700'
                            }`}>
                              {category}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                {/* Reason for Change */}
                <div>
                  <p className="text-gray-700 mb-3">Reason for Change:</p>
                  <div className="border border-gray-300 p-4 bg-white min-h-[60px]">
                    <p className="text-gray-700">{selectedChangeOrder.reason_for_change}</p>
                  </div>
                </div>

                {/* Change Description */}
                <div>
                  <p className="text-gray-700 mb-3">Change Description:</p>
                  <div className="border border-gray-300 p-4 bg-white min-h-[80px]">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedChangeOrder.change_description}</p>
                  </div>
                </div>

                {/* Dates */}
                {(selectedChangeOrder.original_start_date || selectedChangeOrder.new_start_date) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Schedule Changes</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Original Schedule</h4>
                        <p><strong>Start:</strong> {selectedChangeOrder.original_start_date ? new Date(selectedChangeOrder.original_start_date).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>End:</strong> {selectedChangeOrder.original_end_date ? new Date(selectedChangeOrder.original_end_date).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">New Schedule</h4>
                        <p><strong>Start:</strong> {selectedChangeOrder.new_start_date ? new Date(selectedChangeOrder.new_start_date).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>End:</strong> {selectedChangeOrder.new_end_date ? new Date(selectedChangeOrder.new_end_date).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pricing Changes */}
                {selectedChangeOrder.pricing_roles && selectedChangeOrder.pricing_roles.length > 0 && (
                  <div>
                    <p className="text-gray-700 mb-3">Pricing Changes:</p>
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 p-3 text-left font-semibold text-gray-900">Role</th>
                          <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">Rate/Hr</th>
                          <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">Hours</th>
                          <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedChangeOrder.pricing_roles.map((role, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 p-3 text-gray-700">{role.role}</td>
                            <td className="border border-gray-300 p-3 text-center text-gray-700">${role.ratePerHour.toFixed(2)}</td>
                            <td className="border border-gray-300 p-3 text-center text-gray-700">{role.totalHours}</td>
                            <td className="border border-gray-300 p-3 text-center text-gray-700">${role.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td colSpan={3} className="border border-gray-300 p-3 text-right font-semibold text-gray-900">Total Change Order Amount:</td>
                          <td className="border border-gray-300 p-3 text-center font-semibold text-gray-900">
                            ${selectedChangeOrder.total_change_amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Signers */}
                <div className="mt-12">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-gray-700 mb-4 font-semibold">Approved by PDQ:</p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-gray-700 mb-1 font-semibold">Name:</p>
                          <p className="text-gray-700">{selectedChangeOrder.client_signer_name}, {selectedChangeOrder.client_signer_title}</p>
                        </div>
                        <div>
                          <p className="text-gray-700 mb-1 font-semibold">Signature:</p>
                          <div className="border-b border-gray-300 h-6"></div>
                        </div>
                        <div>
                          <p className="text-gray-700 mb-1 font-semibold">Date:</p>
                          <div className="border-b border-gray-300 h-6"></div>
                        </div>
                        <div>
                          <p className="text-gray-700 mb-1 font-semibold">Email:</p>
                          <p className="text-gray-700">{selectedChangeOrder.client_signer_email}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-700 mb-4 font-semibold">Approved by LeanData, Inc.:</p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-gray-700 mb-1 font-semibold">Name:</p>
                          <p className="text-gray-700">{selectedChangeOrder.leandata_signer_name}, {selectedChangeOrder.leandata_signer_title}</p>
                        </div>
                        <div>
                          <p className="text-gray-700 mb-1 font-semibold">Signature:</p>
                          <div className="border-b border-gray-300 h-6"></div>
                        </div>
                        <div>
                          <p className="text-gray-700 mb-1 font-semibold">Date:</p>
                          <div className="border-b border-gray-300 h-6"></div>
                        </div>
                        <div>
                          <p className="text-gray-700 mb-1 font-semibold">Email:</p>
                          <p className="text-gray-700">{selectedChangeOrder.leandata_signer_email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setViewMode('edit')}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Edit Change Order
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete change order ${selectedChangeOrder.change_order_number}? This action cannot be undone.`)) {
                          handleDeleteChangeOrder(selectedChangeOrder);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Delete Change Order
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      // Generate PDF
                      fetch(`/api/change-orders/${selectedChangeOrder.id}/pdf`, { method: 'POST' })
                        .then(response => response.blob())
                        .then(blob => {
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `change-order-${selectedChangeOrder.change_order_number}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        })
                        .catch(err => {
                          console.error('Error generating PDF:', err);
                          alert('Failed to generate PDF. Please try again.');
                        });
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Generate PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <ChangeOrderList
            onCreateNew={handleCreateChangeOrder}
            onViewChangeOrder={handleViewChangeOrder}
            onEditChangeOrder={handleEditChangeOrder}
            onDeleteChangeOrder={handleDeleteChangeOrder}
            refreshTrigger={refreshTrigger}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </div>
    </div>
  );
}

export default function ChangeOrdersPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
      <ChangeOrdersPageContent />
    </Suspense>
  );
}
