'use client';

import React, { useState, useEffect } from 'react';
import { SOWData } from '@/types/sow';

interface SOWSelectorProps {
  onSOWSelect: (sow: SOWData) => void;
  onCancel: () => void;
}

interface SOWSummary {
  id: string;
  sow_title: string;
  client_name: string;
  created_at: string;
  status: string;
}

export default function SOWSelector({ onSOWSelect, onCancel }: SOWSelectorProps) {
  const [sows, setSows] = useState<SOWSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSOWs();
  }, []);

  const fetchSOWs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sow');
      
      if (!response.ok) {
        throw new Error('Failed to fetch SOWs');
      }
      
      const data = await response.json();
      setSows(data);
    } catch (err) {
      console.error('Error fetching SOWs:', err);
      setError('Failed to load SOWs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSOWs = sows.filter(sow => 
    sow.sow_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sow.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading SOWs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading SOWs</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchSOWs}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select SOW for Change Order</h2>
        <p className="text-gray-600">
          Choose the SOW you want to create a change order for. The change order will inherit most information from the selected SOW.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search SOWs by title or client name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* SOW List */}
      <div className="space-y-4 mb-6">
        {filteredSOWs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm ? 'No SOWs match your search.' : 'No SOWs found.'}
            </p>
          </div>
        ) : (
          filteredSOWs.map((sow) => (
            <div
              key={sow.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => onSOWSelect(sow as unknown as SOWData)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {sow.sow_title}
                  </h3>
                  <p className="text-gray-600 mb-2">
                    <strong>Client:</strong> {sow.client_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Created: {formatDate(sow.created_at)}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sow.status)}`}>
                    {sow.status}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSOWSelect(sow as unknown as SOWData);
                    }}
                    className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Select →
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
