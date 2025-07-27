import React from 'react';
import { SOWData } from '@/types/sow';

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
      
      {/* Billing Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Billing Company Name</label>
            <input
              type="text"
              value={formData.template?.billingCompanyName || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, billingCompanyName: e.target.value },
                pricing: {
                  ...formData.pricing!,
                  billing: { ...formData.pricing?.billing!, companyName: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Billing Contact Name</label>
            <input
              type="text"
              value={formData.template?.billingContactName || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, billingContactName: e.target.value },
                pricing: {
                  ...formData.pricing!,
                  billing: { ...formData.pricing?.billing!, billingContact: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Billing Address</label>
            <input
              type="text"
              value={formData.template?.billingAddress || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, billingAddress: e.target.value },
                pricing: {
                  ...formData.pricing!,
                  billing: { ...formData.pricing?.billing!, billingAddress: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Billing Email</label>
            <input
              type="email"
              value={formData.template?.billingEmail || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, billingEmail: e.target.value },
                pricing: {
                  ...formData.pricing!,
                  billing: { ...formData.pricing?.billing!, billingEmail: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Purchase Order Number</label>
            <input
              type="text"
              value={formData.template?.purchaseOrderNumber || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, purchaseOrderNumber: e.target.value },
                pricing: {
                  ...formData.pricing!,
                  billing: { ...formData.pricing?.billing!, poNumber: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Terms</label>
            <input
              type="text"
              value={formData.pricing?.billing?.paymentTerms || ''}
              onChange={(e) => setFormData({
                ...formData,
                pricing: {
                  ...formData.pricing!,
                  billing: { ...formData.pricing?.billing!, paymentTerms: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Currency</label>
            <input
              type="text"
              value={formData.pricing?.billing?.currency || ''}
              onChange={(e) => setFormData({
                ...formData,
                pricing: {
                  ...formData.pricing!,
                  billing: { ...formData.pricing?.billing!, currency: e.target.value }
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Project Assumptions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Project Assumptions</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Access Requirements</label>
            <textarea
              value={formData.assumptions?.accessRequirements || ''}
              onChange={(e) => setFormData({
                ...formData,
                assumptions: { ...formData.assumptions!, accessRequirements: e.target.value }
              })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Describe any access requirements for the project..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Travel Requirements</label>
            <textarea
              value={formData.assumptions?.travelRequirements || ''}
              onChange={(e) => setFormData({
                ...formData,
                assumptions: { ...formData.assumptions!, travelRequirements: e.target.value }
              })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Describe any travel requirements for the project..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Working Hours</label>
            <textarea
              value={formData.assumptions?.workingHours || ''}
              onChange={(e) => setFormData({
                ...formData,
                assumptions: { ...formData.assumptions!, workingHours: e.target.value }
              })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Describe working hours and timezone considerations..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Testing Responsibilities</label>
            <textarea
              value={formData.assumptions?.testingResponsibilities || ''}
              onChange={(e) => setFormData({
                ...formData,
                assumptions: { ...formData.assumptions!, testingResponsibilities: e.target.value }
              })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Describe testing responsibilities and expectations..."
            />
          </div>
        </div>
      </div>
    </section>
  );
} 