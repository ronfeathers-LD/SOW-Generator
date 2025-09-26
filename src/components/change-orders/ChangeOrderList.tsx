'use client';

import React, { useState, useEffect } from 'react';
import { ChangeOrderWithSOW } from '@/types/sow';

interface ChangeOrderListProps {
  sowId?: string;
  onViewChangeOrder?: (changeOrder: ChangeOrderWithSOW) => void;
  onEditChangeOrder?: (changeOrder: ChangeOrderWithSOW) => void;
  onDeleteChangeOrder?: (changeOrder: ChangeOrderWithSOW) => void;
  onCreateNew?: () => void;
  refreshTrigger?: number; // Add refresh trigger prop
}

export default function ChangeOrderList({ 
  sowId, 
  onViewChangeOrder, 
  onEditChangeOrder,
  onDeleteChangeOrder,
  onCreateNew,
  refreshTrigger 
}: ChangeOrderListProps) {
  const [changeOrders, setChangeOrders] = useState<ChangeOrderWithSOW[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChangeOrders();
  }, [sowId, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchChangeOrders = async () => {
    try {
      setLoading(true);
      const url = sowId ? `/api/change-orders/sow/${sowId}` : '/api/change-orders';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch change orders');
      }
      
      const data = await response.json();
      setChangeOrders(data);
    } catch (err) {
      console.error('Error fetching change orders:', err);
      setError('Failed to load change orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const generatePDF = async (changeOrderId: string, changeOrderNumber: string) => {
    try {
      const response = await fetch(`/api/change-orders/${changeOrderId}/pdf`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `change-order-${changeOrderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading change orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Change Orders</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchChangeOrders}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {sowId ? 'Change Orders for This SOW' : 'All Change Orders'}
          </h2>
          <p className="text-gray-600">
            {changeOrders.length} change order{changeOrders.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create New Change Order
          </button>
        )}
      </div>

      {changeOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Change Orders Found</h3>
          <p className="text-gray-600 mb-4">
            {sowId 
              ? 'This SOW doesn\'t have any change orders yet.' 
              : 'You haven\'t created any change orders yet.'
            }
          </p>
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create Your First Change Order
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {changeOrders.map((changeOrder) => (
            <div
              key={changeOrder.id}
              className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {changeOrder.change_order_number}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(changeOrder.status)}`}>
                      {changeOrder.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-1">
                    <strong>Project:</strong> {changeOrder.project_name}
                  </p>
                  <p className="text-gray-600 mb-1">
                    <strong>Requestor:</strong> {changeOrder.change_requestor}
                  </p>
                  {changeOrder.sow && (
                    <p className="text-gray-600 mb-1">
                      <strong>SOW:</strong> {changeOrder.sow.sow_title} ({changeOrder.sow.client_name})
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <p className="text-sm text-gray-500">
                    Created: {formatDate(changeOrder.created_at)}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => generatePDF(changeOrder.id!, changeOrder.change_order_number)}
                      className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
                    >
                      PDF
                    </button>
                    {onViewChangeOrder && (
                      <button
                        onClick={() => onViewChangeOrder(changeOrder)}
                        className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        View
                      </button>
                    )}
                    {onEditChangeOrder && (
                      <button
                        onClick={() => onEditChangeOrder(changeOrder)}
                        className="px-3 py-1 text-sm font-medium text-orange-600 hover:text-orange-700 border border-orange-300 rounded hover:bg-orange-50"
                      >
                        Edit
                      </button>
                    )}
                    {onDeleteChangeOrder && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete change order ${changeOrder.change_order_number}? This action cannot be undone.`)) {
                            onDeleteChangeOrder(changeOrder);
                          }
                        }}
                        className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Change Categories */}
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Categories:</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {changeOrder.change_categories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>

              {/* Reason for Change (truncated) */}
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Reason:</strong>
                </p>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {changeOrder.reason_for_change}
                </p>
              </div>

              {/* Pricing Information (if available) */}
              {changeOrder.pricing_roles && changeOrder.pricing_roles.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Change Amount:</strong>
                  </p>
                  <p className="text-sm font-semibold text-green-600">
                    ${changeOrder.total_change_amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
