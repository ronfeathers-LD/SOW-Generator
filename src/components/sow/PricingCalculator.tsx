'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface PricingRole {
  id: string;
  role: string;
  ratePerHour: number;
  totalHours: number;
  totalCost: number;
}

interface PricingCalculatorProps {
  formData: Record<string, unknown>;
  setFormData: (data: Record<string, unknown>) => void;
  onValidationChange?: (isValid: boolean) => void;
}

// Standard LeanData roles with default rates (2025 rates)
const STANDARD_ROLES = [
  { role: 'Solution Architect', ratePerHour: 250, defaultHours: 0 },
  { role: 'Senior Developer', ratePerHour: 200, defaultHours: 0 },
  { role: 'Developer', ratePerHour: 175, defaultHours: 0 },
  { role: 'Project Manager', ratePerHour: 225, defaultHours: 0 },
  { role: 'Business Analyst', ratePerHour: 200, defaultHours: 0 },
  { role: 'QA Engineer', ratePerHour: 150, defaultHours: 0 },
  { role: 'DevOps Engineer', ratePerHour: 200, defaultHours: 0 },
  { role: 'Data Engineer', ratePerHour: 200, defaultHours: 0 },
  { role: 'Integration Specialist', ratePerHour: 225, defaultHours: 0 },
  { role: 'Training Specialist', ratePerHour: 175, defaultHours: 0 },
];

// Product-based hour estimation rules
const PRODUCT_HOUR_ESTIMATES = {
  'Orchestration': {
    baseHours: 80,
    perUnitHours: 16, // Additional hours per unit
    roles: {
      'Solution Architect': 0.3, // 30% of total hours
      'Senior Developer': 0.4,   // 40% of total hours
      'Developer': 0.2,          // 20% of total hours
      'Project Manager': 0.1,    // 10% of total hours
    }
  },
  'BookIt for Forms': {
    baseHours: 40,
    perUnitHours: 8,
    roles: {
      'Solution Architect': 0.2,
      'Senior Developer': 0.5,
      'Developer': 0.2,
      'Project Manager': 0.1,
    }
  },
  'BookIt Links': {
    baseHours: 24,
    perUnitHours: 4,
    roles: {
      'Solution Architect': 0.2,
      'Senior Developer': 0.4,
      'Developer': 0.3,
      'Project Manager': 0.1,
    }
  },
  'BookIt Handoff': {
    baseHours: 32,
    perUnitHours: 6,
    roles: {
      'Solution Architect': 0.25,
      'Senior Developer': 0.45,
      'Developer': 0.2,
      'Project Manager': 0.1,
    }
  },
  'Lead Routing': {
    baseHours: 60,
    perUnitHours: 12,
    roles: {
      'Solution Architect': 0.3,
      'Senior Developer': 0.4,
      'Developer': 0.2,
      'Project Manager': 0.1,
    }
  },
  'Account Matching': {
    baseHours: 40,
    perUnitHours: 8,
    roles: {
      'Solution Architect': 0.25,
      'Senior Developer': 0.45,
      'Developer': 0.2,
      'Project Manager': 0.1,
    }
  },
};

export default function PricingCalculator({ formData, setFormData, onValidationChange }: PricingCalculatorProps) {
  const [pricingRoles, setPricingRoles] = useState<PricingRole[]>([]);
  const [showAutoCalculate, setShowAutoCalculate] = useState(false);
  const [autoCalculateData, setAutoCalculateData] = useState({
    orchestrationUnits: '',
    bookitFormsUnits: '',
    bookitLinksUnits: '',
    bookitHandoffUnits: '',
    leadRoutingUnits: '',
    accountMatchingUnits: '',
  });

  // Initialize pricing roles from form data or defaults
  useEffect(() => {
    if (formData.pricing && typeof formData.pricing === 'object' && 'roles' in formData.pricing && Array.isArray(formData.pricing.roles) && formData.pricing.roles.length > 0) {
      const roles: PricingRole[] = formData.pricing.roles.map((role: Record<string, unknown>, index: number) => ({
        id: `role-${index}`,
        role: String(role.role || ''),
        ratePerHour: Number(role.ratePerHour) || Number(role.rate_per_hour) || 0,
        totalHours: Number(role.totalHours) || Number(role.total_hours) || 0,
        totalCost: (Number(role.ratePerHour) || Number(role.rate_per_hour) || 0) * (Number(role.totalHours) || Number(role.total_hours) || 0),
      }));
      setPricingRoles(roles);
    } else {
      // Initialize with standard roles
      const initialRoles = STANDARD_ROLES.map((role, index) => ({
        id: `role-${index}`,
        role: role.role,
        ratePerHour: role.ratePerHour,
        totalHours: 0,
        totalCost: 0,
      }));
      setPricingRoles(initialRoles);
    }
  }, [formData.pricing]);

  // Auto-calculate hours based on product selection and units
  const autoCalculateHours = useCallback(() => {
    const selectedProducts = (formData.template && typeof formData.template === 'object' && 'products' in formData.template && Array.isArray(formData.template.products)) ? formData.template.products : [];
    const newRoles = [...pricingRoles];

    // Reset all hours first
    newRoles.forEach(role => {
      role.totalHours = 0;
      role.totalCost = 0;
    });

    // Calculate hours for each selected product
    selectedProducts.forEach((product: string) => {
      const productConfig = PRODUCT_HOUR_ESTIMATES[product as keyof typeof PRODUCT_HOUR_ESTIMATES];
      if (productConfig) {
        let totalProductHours = productConfig.baseHours;
        
        // Add hours based on units
        if (product === 'Orchestration' && autoCalculateData.orchestrationUnits) {
          totalProductHours += parseInt(autoCalculateData.orchestrationUnits) * productConfig.perUnitHours;
        } else if (product === 'BookIt for Forms' && autoCalculateData.bookitFormsUnits) {
          totalProductHours += parseInt(autoCalculateData.bookitFormsUnits) * productConfig.perUnitHours;
        } else if (product === 'BookIt Links' && autoCalculateData.bookitLinksUnits) {
          totalProductHours += parseInt(autoCalculateData.bookitLinksUnits) * productConfig.perUnitHours;
        } else if (product === 'BookIt Handoff' && autoCalculateData.bookitHandoffUnits) {
          totalProductHours += parseInt(autoCalculateData.bookitHandoffUnits) * productConfig.perUnitHours;
        } else if (product === 'Lead Routing' && autoCalculateData.leadRoutingUnits) {
          totalProductHours += parseInt(autoCalculateData.leadRoutingUnits) * productConfig.perUnitHours;
        } else if (product === 'Account Matching' && autoCalculateData.accountMatchingUnits) {
          totalProductHours += parseInt(autoCalculateData.accountMatchingUnits) * productConfig.perUnitHours;
        }

        // Distribute hours across roles based on product configuration
        Object.entries(productConfig.roles).forEach(([roleName, percentage]) => {
          const roleIndex = newRoles.findIndex(r => r.role === roleName);
          if (roleIndex !== -1) {
            newRoles[roleIndex].totalHours += Math.round(totalProductHours * percentage);
            newRoles[roleIndex].totalCost = newRoles[roleIndex].totalHours * newRoles[roleIndex].ratePerHour;
          }
        });
      }
    });

    setPricingRoles(newRoles);
  }, [autoCalculateData, formData.template, pricingRoles]);

  // Update role data
  const updateRole = (id: string, field: keyof PricingRole, value: string | number) => {
    const newRoles = pricingRoles.map(role => {
      if (role.id === id) {
        const updatedRole = { ...role, [field]: value };
        if (field === 'ratePerHour' || field === 'totalHours') {
          updatedRole.totalCost = updatedRole.ratePerHour * updatedRole.totalHours;
        }
        return updatedRole;
      }
      return role;
    });
    setPricingRoles(newRoles);
  };

  // Add new role
  const addRole = () => {
    const newRole: PricingRole = {
      id: `role-${Date.now()}`,
      role: '',
      ratePerHour: 0,
      totalHours: 0,
      totalCost: 0,
    };
    setPricingRoles([...pricingRoles, newRole]);
  };

  // Remove role
  const removeRole = (id: string) => {
    setPricingRoles(pricingRoles.filter(role => role.id !== id));
  };

  // Save pricing data to form
  const savePricing = () => {
    const rolesData = pricingRoles
      .filter(role => role.role.trim() !== '' && role.totalHours > 0)
      .map(role => ({
        role: role.role,
        ratePerHour: role.ratePerHour,
        totalHours: role.totalHours,
      }));

    setFormData({
      ...formData,
      pricing: {
        ...(formData.pricing && typeof formData.pricing === 'object' ? formData.pricing : {}),
        roles: rolesData,
      },
    });
  };

  // Calculate totals
  const totalHours = pricingRoles.reduce((sum, role) => sum + role.totalHours, 0);
  const totalCost = pricingRoles.reduce((sum, role) => sum + role.totalCost, 0);
  const averageRate = totalHours > 0 ? totalCost / totalHours : 0;

  // Validation
  useEffect(() => {
    const isValid = pricingRoles.every(role => 
      role.role.trim() !== '' && 
      role.ratePerHour > 0 && 
      role.totalHours > 0
    );
    onValidationChange?.(isValid);
  }, [pricingRoles, onValidationChange]);

  return (
    <div className="space-y-6">
      {/* Auto-Calculate Section */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-900">Auto-Calculate Hours</h3>
          <button
            type="button"
            onClick={() => setShowAutoCalculate(!showAutoCalculate)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showAutoCalculate ? 'Hide' : 'Show'} Auto-Calculate
          </button>
        </div>
        
        {showAutoCalculate && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orchestration Units
                </label>
                <input
                  type="number"
                  value={autoCalculateData.orchestrationUnits}
                  onChange={(e) => setAutoCalculateData({
                    ...autoCalculateData,
                    orchestrationUnits: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  BookIt Forms Units
                </label>
                <input
                  type="number"
                  value={autoCalculateData.bookitFormsUnits}
                  onChange={(e) => setAutoCalculateData({
                    ...autoCalculateData,
                    bookitFormsUnits: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  BookIt Links Units
                </label>
                <input
                  type="number"
                  value={autoCalculateData.bookitLinksUnits}
                  onChange={(e) => setAutoCalculateData({
                    ...autoCalculateData,
                    bookitLinksUnits: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  BookIt Handoff Units
                </label>
                <input
                  type="number"
                  value={autoCalculateData.bookitHandoffUnits}
                  onChange={(e) => setAutoCalculateData({
                    ...autoCalculateData,
                    bookitHandoffUnits: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Routing Units
                </label>
                <input
                  type="number"
                  value={autoCalculateData.leadRoutingUnits}
                  onChange={(e) => setAutoCalculateData({
                    ...autoCalculateData,
                    leadRoutingUnits: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Matching Units
                </label>
                <input
                  type="number"
                  value={autoCalculateData.accountMatchingUnits}
                  onChange={(e) => setAutoCalculateData({
                    ...autoCalculateData,
                    accountMatchingUnits: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={autoCalculateHours}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Calculate Hours
            </button>
          </div>
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
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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

        {/* Summary Section */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Hours</dt>
              <dd className="text-lg font-semibold text-gray-900">{totalHours}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Average Rate</dt>
              <dd className="text-lg font-semibold text-gray-900">
                ${averageRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Cost</dt>
              <dd className="text-lg font-semibold text-gray-900">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </dd>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={savePricing}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save Pricing
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Formula Explanation */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-yellow-800 mb-2">Calculation Formulas</h4>
        <div className="text-sm text-yellow-700 space-y-1">
          <p><strong>Total Cost per Role:</strong> Rate/Hour × Total Hours</p>
          <p><strong>Project Total Cost:</strong> Sum of all role costs</p>
          <p><strong>Average Rate:</strong> Total Cost ÷ Total Hours</p>
          <p><strong>Auto-Calculate:</strong> Base hours + (Units × Hours per Unit) distributed across roles</p>
        </div>
      </div>
    </div>
  );
}
