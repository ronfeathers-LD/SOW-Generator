'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function NewSOWPage() {
  const router = useRouter();
  const isCreating = useRef(false);

  useEffect(() => {
    async function createNewSOW() {
      // Prevent multiple API calls
      if (isCreating.current) {
        return;
      }
      
      isCreating.current = true;
      
      try {
        // Create a new SOW with minimal data
        const response = await fetch('/api/sow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Minimal data to create a new SOW
            template: {
              sow_title: 'Statement of Work for LeanData Implementation',
              customer_name: '',
              lean_data_name: 'Agam Vasani',
              lean_data_title: 'VP Customer Success',
              lean_data_email: 'agam.vasani@leandata.com',
              products: [],
              number_of_units: '125',
              regions: '1',
              salesforce_tenants: '2',
              timeline_weeks: '8',
              units_consumption: 'All units immediately',
            },
            objectives: {
              description: '',
              key_objectives: [''],
              avoma_transcription: '',
            },
            scope: {
              project_description: '',
              deliverables: '',
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create new SOW');
        }

        const data = await response.json();
        
        // Redirect to edit mode for the new SOW
        router.push(`/sow/${data.id}/edit`);
      } catch (error) {
        console.error('Error creating new SOW:', error);
        // Reset the flag on error so user can try again
        isCreating.current = false;
        // You could show an error message here
      }
    }

    createNewSOW();
  }, []); // Remove router dependency since we don't need it

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Creating New Statement of Work...</h1>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we set up your new SOW
          </p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
} 