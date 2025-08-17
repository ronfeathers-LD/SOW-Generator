'use client';

import React, { useState } from 'react';
import { SOWData } from '@/types/sow';

interface PricingRole {
  id: string;
  role: string;
  ratePerHour: number;
  totalHours: number;
  totalCost: number;
}

interface DiscountConfig {
  type: 'none' | 'fixed' | 'percentage';
  amount: number;
  percentage: number;
  initialized?: boolean;
}

interface PricingRolesAndDiscountProps {
  formData: SOWData;
  pricingRoles: PricingRole[];
  setPricingRoles: (roles: PricingRole[]) => void;
  discountConfig: DiscountConfig;
  setDiscountConfig: (config: DiscountConfig) => void;
  autoCalculateHours: () => void;
  ensureFormDataUpToDate: () => void;
}

export default function PricingRolesAndDiscount({
  formData,
  pricingRoles,
  setPricingRoles,
  discountConfig,
  setDiscountConfig,
  autoCalculateHours,
  ensureFormDataUpToDate,
}: PricingRolesAndDiscountProps) {
  const [showCalculationFormulas, setShowCalculationFormulas] = useState(false);
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false);
  // Add role
  const addRole = () => {
    const newRole: PricingRole = {
      id: Math.random().toString(36).substr(2, 9),
      role: '',
      ratePerHour: 0,
      totalHours: 0,
      totalCost: 0,
    };
    setPricingRoles([...pricingRoles, newRole]);
  };

  // Remove role
  const removeRole = (id: string) => {
    const newRoles = pricingRoles.filter(role => role.id !== id);
    setPricingRoles(newRoles);
    
    // Don't call calculateTotals here - it causes re-render loops
    // calculateTotals will be called when needed (save, auto-calculate, etc.)
  };

  // Update role
  const updateRole = (id: string, field: keyof PricingRole, value: string | number) => {
    const newRoles = pricingRoles.map(role => {
      if (role.id === id) {
        const updatedRole = { ...role, [field]: value };
        
        // Calculate total cost for this role
        if (field === 'ratePerHour' || field === 'totalHours') {
          updatedRole.totalCost = updatedRole.ratePerHour * updatedRole.totalHours;
        }
        
        return updatedRole;
      }
      return role;
    });
    
    setPricingRoles(newRoles);
    
    // Don't call calculateTotals here - it causes re-render loops
    // calculateTotals will be called when needed (save, auto-calculate, etc.)
  };

  // Update discount configuration
  const updateDiscount = (field: keyof typeof discountConfig, value: string | number) => {
    const newConfig = { ...discountConfig, [field]: value };
    setDiscountConfig(newConfig);
    
    // Don't call calculateTotals here - it causes re-render loops
    // calculateTotals will be called when needed (save, auto-calculate, etc.)
  };

  return (
    <div className="space-y-6">
      {/* Calculate Hours Button */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <button
          type="button"
          onClick={autoCalculateHours}
          disabled={!formData.template?.products || formData.template.products.length === 0}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Calculate Hours Based on Selected Products
        </button>
        
        {/* Calculation Formulas Link */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowCalculationFormulas(true)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
          >
            Calculation Formulas
          </button>
        </div>
        
        {/* Show calculated hours summary if available */}
        {pricingRoles.some(role => role.totalHours > 0) && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
            <h4 className="font-medium text-green-900 mb-2">✅ Hours Calculated Successfully!</h4>
            <div className="text-sm text-green-800 space-y-1">
              {pricingRoles.filter(role => role.totalHours > 0).map(role => (
                <div key={role.id} className="flex justify-between">
                  <span>{role.role}:</span>
                  <span className="font-medium">{role.totalHours} hours × ${role.ratePerHour}/hr = ${role.totalCost.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-green-300 pt-2 mt-2">
                <div className="flex justify-between font-medium">
                  <span>Subtotal:</span>
                  <span>${pricingRoles.reduce((sum, role) => sum + role.totalCost, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-green-700 mt-2">
              💡 The calculated hours have been assigned to the Onboarding Specialist role. Project Manager role is auto-added for 3+ products. You can manually adjust the distribution or add additional roles as needed.
            </p>
          </div>
        )}
        
        {(!formData.template?.products || formData.template.products.length === 0) && (
          <p className="text-sm text-blue-600 text-center mt-2">
            💡 Tip: Go to the Project Overview tab to select products and set units (users/endpoints)
          </p>
        )}
      </div>

      {/* Pricing Roles Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Pricing Roles</h3>
            <button
              type="button"
              onClick={addRole}
              className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Add Role
            </button>
          </div>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowRoleSuggestions(true)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
            >
              💡 Role Suggestions
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate/Hour ($)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost ($)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pricingRoles.map((role) => (
                <tr key={role.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={role.role}
                      onChange={(e) => updateRole(role.id, 'role', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter role name"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={role.ratePerHour}
                      onChange={(e) => updateRole(role.id, 'ratePerHour', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={role.totalHours}
                      onChange={(e) => updateRole(role.id, 'totalHours', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${role.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => removeRole(role.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discount Configuration */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4">Discount Configuration</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
            <select
              value={discountConfig.type}
              onChange={(e) => updateDiscount('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="none">No Discount</option>
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>
          {discountConfig.type === 'fixed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount ($)</label>
              <input
                type="number"
                value={discountConfig.amount}
                onChange={(e) => updateDiscount('amount', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                step="0.01"
                min="0"
              />
            </div>
          )}
          {discountConfig.type === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage (%)</label>
              <input
                type="number"
                value={discountConfig.percentage}
                onChange={(e) => updateDiscount('percentage', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                step="0.01"
                min="0"
                max="100"
              />
            </div>
          )}
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Pricing Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Subtotal</div>
            <div className="text-xl font-bold text-gray-900">
              ${(pricingRoles.reduce((sum, role) => sum + role.totalCost, 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Discount</div>
            <div className="text-xl font-bold text-red-600">
              {discountConfig.type === 'fixed' && discountConfig.amount ? (
                `-$${discountConfig.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              ) : discountConfig.type === 'percentage' && discountConfig.percentage ? (
                `-${discountConfig.percentage}%`
              ) : (
                '$0.00'
              )}
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Total Amount</div>
            <div className="text-xl font-bold text-green-600">
              ${(() => {
                const subtotal = pricingRoles.reduce((sum, role) => sum + role.totalCost, 0);
                let discountTotal = 0;
                if (discountConfig.type === 'fixed') {
                  discountTotal = discountConfig.amount;
                } else if (discountConfig.type === 'percentage') {
                  discountTotal = subtotal * (discountConfig.percentage / 100);
                }
                return (subtotal - discountTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              })()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Save Pricing Button */}
      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={() => {
            // Ensure form data is up to date before saving
            ensureFormDataUpToDate();
            
            // Use a small delay to ensure state update completes
            setTimeout(() => {
              // Trigger the parent's save functionality
              if (typeof window !== 'undefined') {
                // Find the main save button and click it
                const saveButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                if (saveButton) {
                  saveButton.click();
                }
              }
            }, 100); // 100ms delay to ensure state update
          }}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Save Pricing
        </button>
      </div>

      {/* Role Suggestions Modal */}
      {showRoleSuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Role Suggestions</h3>
              <button
                type="button"
                onClick={() => setShowRoleSuggestions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-gray-700 space-y-2">
                <p><strong>Onboarding Specialist:</strong> Always included (required role)</p>
                <p><strong>Project Manager:</strong> Auto-added as role (3+ products, excluding Lead to Account Matching)</p>
                <p><strong>Solution Architect:</strong> Add for Enterprise SOWs only</p>
                <p><strong>Developer:</strong> Add only when technical development is required</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculation Formulas Modal */}
      {showCalculationFormulas && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Calculation Formulas</h3>
              <button
                type="button"
                onClick={() => setShowCalculationFormulas(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-gray-700 space-y-2">
                <p><strong>Total Cost per Role:</strong> Rate/Hour × Total Hours</p>
                <p><strong>Subtotal:</strong> Sum of all role costs (including Project Manager if auto-added)</p>
                <p><strong>Discount:</strong> Fixed amount or percentage of subtotal</p>
                <p><strong>Total Amount:</strong> Subtotal - Discount</p>
                <p><strong>Auto-Calculate:</strong> Routing objects + BookIt products + User groups = Total hours assigned to Onboarding Specialist</p>
                <p><strong>Auto-Project Manager Role:</strong> Automatically added when 3+ products (excluding Lead to Account Matching, including BookIt Handoff with Smartrep as objects)</p>
                <p><strong>Routing Objects:</strong> Lead/Contact Routing: 15h (first), 5h (additional)</p>
                <p><strong>BookIt Products:</strong> Forms (10h), Links (1h, no cost), Handoff (1h/5h/10h based on Smartrep)</p>
                <p><strong>User Groups:</strong> Every 50 users/units = +5 hours</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
