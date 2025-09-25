'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CreateRevisionButtonProps {
  sowId: string;
  sowTitle: string;
  clientName: string;
  onRevisionCreated?: () => void;
}

export default function CreateRevisionButton({ 
  sowId, 
  sowTitle, 
  clientName, 
  onRevisionCreated 
}: CreateRevisionButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleCreateRevision = async () => {
    if (!confirm(`Create a new revision of "${sowTitle}" for ${clientName}?\n\nThis will create a new draft version that you can edit and resubmit.`)) {
      return;
    }

    try {
      setIsCreating(true);
      
      const response = await fetch(`/api/sow/${sowId}/revision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        alert(`New revision (v${data.revision.version}) created successfully!`);
        
        // Redirect to edit the new revision
        router.push(`/sow/${data.revision.id}/edit`);
        
        // Call callback if provided
        if (onRevisionCreated) {
          onRevisionCreated();
        }
      } else {
        const error = await response.json();
        alert(`Failed to create revision: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating revision:', error);
      alert('Failed to create revision. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="text-center">
        <div className="mb-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Create New Revision</h3>
          <p className="text-sm text-gray-600 mb-4">
            Create a new version of this SOW to address the feedback and resubmit for approval.
          </p>
        </div>
        
        <button
          onClick={handleCreateRevision}
          disabled={isCreating}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
            isCreating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isCreating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Revision...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Revision
            </>
          )}
        </button>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>• The new revision will start as a draft</p>
          <p>• You can edit all content and resubmit for approval</p>
          <p>• Previous versions will remain in the history</p>
        </div>
      </div>
    </div>
  );
}
