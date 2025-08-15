import React from 'react';
import { SOWData } from '@/types/sow';
import PricingCalculator from '@/components/sow/PricingCalculator';

interface BillingPaymentTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
}

export default function BillingPaymentTab({
  formData,
  setFormData,
}: BillingPaymentTabProps) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Billing & Payment</h2>
      
      {/* Pricing Calculator - Full Width */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Pricing Calculator</h3>
        <PricingCalculator formData={formData as any} setFormData={setFormData} />
      </div>
    </section>
  );
} 