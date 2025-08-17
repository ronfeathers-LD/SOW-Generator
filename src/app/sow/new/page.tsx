'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerSelectionWizard from '@/components/sow/CustomerSelectionWizard';

interface Account {
  id: string;
  name: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  industry?: string;
  numberOfEmployees?: number;
}

interface Opportunity {
  id: string;
  name: string;
  amount?: number;
  closeDate?: string;
  stageName: string;
  description?: string;
}

export default function NewSOWPage() {
  const router = useRouter();

  const [showWizard, setShowWizard] = useState(true);

  const handleCustomerSelectionComplete = async (selectedAccount: Account, selectedOpportunity: Opportunity) => {
    setShowWizard(false);

    try {
      const customerName = selectedAccount.name;

      // Create a new SOW with the customer and opportunity information
      const response = await fetch('/api/sow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Include customer information
          template: {
            sow_title: `Statement of Work for ${customerName} - ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}`,
            client_name: customerName,
            lean_data_name: 'Agam Vasani',
            lean_data_title: 'VP Customer Success',
            lean_data_email: 'agam.vasani@leandata.com',
            products: [],
            number_of_units: '',
            regions: '',
            salesforce_tenants: '',
            timeline_weeks: '',
            units_consumption: '',
            // Include opportunity information (now required)
            opportunity_id: selectedOpportunity.id,
            opportunity_name: selectedOpportunity.name,
            opportunity_amount: selectedOpportunity.amount || null,
            opportunity_stage: selectedOpportunity.stageName,
            opportunity_close_date: selectedOpportunity.closeDate || null,
          },
          objectives: {
            description: '',
            key_objectives: [''],
            avoma_transcription: '',
          },
          scope: {

            deliverables: '',
          },
          // Store the selected account information for later use
          selectedAccount: {
            id: selectedAccount.id,
            name: selectedAccount.name,
            billingCity: selectedAccount.billingCity,
            billingState: selectedAccount.billingState,
            billingCountry: selectedAccount.billingCountry,
            industry: selectedAccount.industry,
            numberOfEmployees: selectedAccount.numberOfEmployees,
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
      setShowWizard(true);
      // You could show an error message here
    }
  };

  if (showWizard) {
    return <CustomerSelectionWizard onComplete={handleCustomerSelectionComplete} />;
  }

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