import React from 'react';
import { SOWData } from '@/types/sow';

interface TeamRolesTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  leanDataSignators: Array<{ id: string; name: string; email: string; title: string }>;
  selectedLeanDataSignator: string;
  onLeanDataSignatorChange: (signatorId: string) => void;
}

export default function TeamRolesTab({
  formData,
  setFormData,
  leanDataSignators,
  selectedLeanDataSignator,
  onLeanDataSignatorChange,
}: TeamRolesTabProps) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Team & Roles</h2>
      
      {/* LeanData Signator */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">LeanData Signator</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select the LeanData representative who will sign this SOW
        </p>
        <select
          value={selectedLeanDataSignator}
          onChange={(e) => onLeanDataSignatorChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="">Select a signator</option>
          {leanDataSignators.map((signator) => (
            <option key={signator.id} value={signator.id}>
              {signator.name} - {signator.title}
            </option>
          ))}
        </select>
        {selectedLeanDataSignator && (
          <div className="mt-2 text-sm text-gray-600">
            Selected: {leanDataSignators.find(s => s.id === selectedLeanDataSignator)?.name} - {leanDataSignators.find(s => s.id === selectedLeanDataSignator)?.title}
          </div>
        )}
      </div>
      
      {/* Client Roles */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Client Roles & Responsibilities</h3>
        <p className="text-sm text-gray-600 mb-4">
          Define the roles and responsibilities for the client team
        </p>
        {formData.roles?.client_roles?.map((role, index) => (
          <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <input
                  type="text"
                  value={role.role}
                  onChange={(e) => {
                    const newRoles = [...(formData.roles?.client_roles || [])];
                    newRoles[index] = { ...role, role: e.target.value };
                    setFormData({
                      ...formData,
                      roles: { ...formData.roles!, client_roles: newRoles }
                    });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g., Project Manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={role.name}
                  onChange={(e) => {
                                    const newRoles = [...(formData.roles?.client_roles || [])];
                newRoles[index] = { ...role, name: e.target.value };
                setFormData({
                  ...formData,
                  roles: { ...formData.roles!, client_roles: newRoles }
                });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Full name"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={role.email}
                onChange={(e) => {
                  const newRoles = [...(formData.roles?.client_roles || [])];
                  newRoles[index] = { ...role, email: e.target.value };
                  setFormData({
                    ...formData,
                    roles: { ...formData.roles!, client_roles: newRoles }
                  });
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="email@company.com"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Responsibilities</label>
              <textarea
                value={role.responsibilities}
                onChange={(e) => {
                  const newRoles = [...(formData.roles?.client_roles || [])];
                  newRoles[index] = { ...role, responsibilities: e.target.value };
                  setFormData({
                    ...formData,
                    roles: { ...formData.roles!, client_roles: newRoles }
                  });
                }}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Describe the responsibilities for this role..."
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const newRoles = formData.roles?.client_roles.filter((_, i) => i !== index) || [];
                  setFormData({
                    ...formData,
                    roles: { ...formData.roles!, client_roles: newRoles }
                  });
                }}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Remove Role
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const newRoles = [...(formData.roles?.client_roles || []), {
              role: '',
              name: '',
              email: '',
              responsibilities: ''
            }];
            setFormData({
              ...formData,
              roles: { ...formData.roles!, client_roles: newRoles }
            });
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Client Role
        </button>
      </div>

      {/* LeanData Roles */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">LeanData Team Roles</h3>
        <p className="text-sm text-gray-600 mb-4">
          Define the roles and rates for the LeanData team
        </p>
        {formData.pricing?.roles?.map((role, index) => (
          <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <input
                  type="text"
                  value={role.role}
                  onChange={(e) => {
                    const newRoles = [...(formData.pricing?.roles || [])];
                    newRoles[index] = { ...role, role: e.target.value };
                    setFormData({
                      ...formData,
                      pricing: { ...formData.pricing!, roles: newRoles }
                    });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g., Senior Consultant"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rate per Hour</label>
                <input
                  type="number"
                  value={role.rate_per_hour}
                  onChange={(e) => {
                    const newRoles = [...(formData.pricing?.roles || [])];
                    newRoles[index] = { ...role, rate_per_hour: parseFloat(e.target.value) || 0 };
                    setFormData({
                      ...formData,
                      pricing: { ...formData.pricing!, roles: newRoles }
                    });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Hours</label>
                <input
                  type="number"
                  value={role.total_hours}
                  onChange={(e) => {
                    const newRoles = [...(formData.pricing?.roles || [])];
                    newRoles[index] = { ...role, total_hours: parseFloat(e.target.value) || 0 };
                    setFormData({
                      ...formData,
                      pricing: { ...formData.pricing!, roles: newRoles }
                    });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="0"
                  step="0.5"
                  min="0"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total: ${(role.rate_per_hour * role.total_hours).toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => {
                  const newRoles = formData.pricing?.roles.filter((_, i) => i !== index) || [];
                  setFormData({
                    ...formData,
                    pricing: { ...formData.pricing!, roles: newRoles }
                  });
                }}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Remove Role
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const newRoles = [...(formData.pricing?.roles || []), {
              role: '',
              rate_per_hour: 0,
              total_hours: 0
            }];
            setFormData({
              ...formData,
              pricing: { ...formData.pricing!, roles: newRoles }
            });
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add LeanData Role
        </button>
      </div>

      {/* Total Calculation */}
      {formData.pricing?.roles && formData.pricing.roles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-lg font-semibold text-blue-800 mb-2">Total Project Cost</h4>
          <div className="text-2xl font-bold text-blue-900">
            ${formData.pricing.roles.reduce((total, role) => total + (role.rate_per_hour * role.total_hours), 0).toFixed(2)}
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Based on {formData.pricing.roles.length} role(s) and {formData.pricing.roles.reduce((total, role) => total + role.total_hours, 0)} total hours
          </p>
        </div>
      )}
    </section>
  );
} 