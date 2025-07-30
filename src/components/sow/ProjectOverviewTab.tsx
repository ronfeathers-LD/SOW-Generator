import React from 'react';
import { SOWData } from '@/types/sow';

interface ProjectOverviewTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  leanDataSignators: Array<{ id: string; name: string; email: string; title: string }>;
  selectedLeanDataSignator: string;
  onLeanDataSignatorChange: (signatorId: string) => void;
}

export default function ProjectOverviewTab({
  formData,
  setFormData,
  leanDataSignators,
  selectedLeanDataSignator,
  onLeanDataSignatorChange,
}: ProjectOverviewTabProps) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Project Overview</h2>
      
      {/* SOW Title and LeanData Signator - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOW Title */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">SOW Title</h3>
          <input
            type="text"
            value={formData.template?.sow_title || formData.header?.sow_title || ''}
            onChange={(e) => setFormData({
              ...formData,
              template: { ...formData.template!, sow_title: e.target.value },
              header: { ...formData.header!, sow_title: e.target.value }
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter SOW title"
          />
        </div>

        {/* LeanData Signator */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">LeanData Signator</h3>
          <select
            value={selectedLeanDataSignator}
            onChange={(e) => onLeanDataSignatorChange(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select a LeanData signator</option>
            {leanDataSignators.map((signator) => (
              <option key={signator.id} value={signator.id}>
                {signator.name} - {signator.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Project Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Number of Units</label>
            <input
              type="text"
              value={formData.template?.number_of_units || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, number_of_units: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Regions</label>
            <input
              type="text"
              value={formData.template?.regions || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, regions: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Salesforce Tenants</label>
            <input
              type="text"
              value={formData.template?.salesforce_tenants || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, salesforce_tenants: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Timeline (Weeks)</label>
            <input
              type="text"
              value={formData.template?.timeline_weeks || ''}
              onChange={(e) => setFormData({
                ...formData,
                template: { ...formData.template!, timeline_weeks: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    </section>
  );
} 