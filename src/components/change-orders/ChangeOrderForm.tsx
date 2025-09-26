'use client';

import React, { useState, useEffect } from 'react';
import { ChangeOrderFormData, ChangeCategory, SOWData } from '@/types/sow';
import { getPricingRolesConfig, PricingRoleConfig, getDefaultRateForRole } from '@/lib/pricing-roles-config';

// Extended SOW interface for change orders
interface ExtendedSOWData extends SOWData {
  pricingRoles?: Array<{
    role: string;
    ratePerHour: number;
    totalHours: number;
    totalCost: number;
  }>;
  pricing_roles?: {
    roles: Array<{
      role: string;
      ratePerHour: number;
      totalHours: number;
      totalCost: number;
    }>;
  };
  sow_title?: string;
  client_name?: string;
}

interface PricingRole {
  id: string;
  role: string;
  ratePerHour: number;
  totalHours: number;
  totalCost: number;
}

interface ChangeOrderFormProps {
  initialData?: Partial<ChangeOrderFormData>;
  sowData?: ExtendedSOWData;
  onSubmit: (data: ChangeOrderFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const CHANGE_CATEGORIES: ChangeCategory[] = [
  'Schedule',
  'Cost', 
  'Scope',
  'Testing (Quality)',
  'Resources',
  'Artifacts'
];

export default function ChangeOrderForm({ 
  initialData, 
  sowData, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: ChangeOrderFormProps) {
  const [formData, setFormData] = useState<ChangeOrderFormData>({
    sow_id: '',
    change_requestor: '',
    change_categories: [],
    reason_for_change: '',
    change_description: '',
    new_start_date: undefined,
    new_end_date: undefined,
    associated_po: 'N/A',
    ...(initialData || {})
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pricingRoles, setPricingRoles] = useState<PricingRole[]>([]);
  const [showPricing, setShowPricing] = useState(false);
  const [pricingRolesConfig, setPricingRolesConfig] = useState<PricingRoleConfig[]>([]);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  // Load pricing roles configuration
  useEffect(() => {
    const loadPricingRolesConfig = async () => {
      try {
        const configs = await getPricingRolesConfig();
        setPricingRolesConfig(configs);
      } catch (error) {
        console.error('Failed to load pricing roles configuration:', error);
      }
    };

    loadPricingRolesConfig();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdowns(new Set());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize form with SOW data if provided
  useEffect(() => {
    if (sowData) {
      
      setFormData(prev => ({
        ...prev,
        sow_id: sowData.id || '',
        // Pre-fill change requestor with SOW author or client contact
        change_requestor: sowData.template?.customer_signature_name || 
                        sowData.client_signature?.name || 
                        sowData.client_signer_name || '',
        // Pre-fill associated PO from SOW
        associated_po: sowData.template?.purchase_order_number || 'N/A'
      }));
    }
  }, [sowData]);

  // Initialize form with initialData if provided (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
      
      // If editing and has pricing roles, show pricing section
      if (initialData.pricing_roles && initialData.pricing_roles.length > 0) {
        setShowPricing(true);
      }
    }
  }, [initialData]);

  // Initialize pricing roles when SOW data is available and pricing is needed
  useEffect(() => {
    let rolesToUse = null;
    
    // First check if we have existing pricing roles from initialData (for editing)
    if (initialData?.pricing_roles && Array.isArray(initialData.pricing_roles) && initialData.pricing_roles.length > 0) {
      rolesToUse = initialData.pricing_roles;
    }
    // Otherwise check SOW data
    else if (sowData?.pricingRoles) {
      rolesToUse = sowData.pricingRoles;
    } else if (sowData?.pricing?.roles) {
      rolesToUse = sowData.pricing.roles;
    } else if (sowData?.pricing_roles?.roles) {
      rolesToUse = sowData.pricing_roles.roles;
    }
    
    if (rolesToUse && Array.isArray(rolesToUse) && showPricing && pricingRoles.length === 0) {
      const sowPricingRoles = rolesToUse.map(role => ({
        id: Math.random().toString(36).substr(2, 9),
        role: role.role,
        ratePerHour: role.ratePerHour,
        totalHours: role.totalHours,
        totalCost: role.totalHours * role.ratePerHour
      }));
      setPricingRoles(sowPricingRoles);
    }
  }, [sowData, initialData, showPricing, pricingRoles.length]);

  const handleInputChange = (field: keyof ChangeOrderFormData, value: string | Date | ChangeCategory[] | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleCategoryToggle = (category: ChangeCategory) => {
    const newCategories = formData.change_categories.includes(category)
      ? formData.change_categories.filter(c => c !== category)
      : [...formData.change_categories, category];
    
    setFormData(prev => ({
      ...prev,
      change_categories: newCategories
    }));

    // Show pricing section if Cost or Scope is selected
    const shouldShowPricing = newCategories.includes('Cost') || newCategories.includes('Scope');
    setShowPricing(shouldShowPricing);

    // Initialize pricing roles from existing data or SOW if available
    let rolesToUse = null;
    
    // First check if we have existing pricing roles from initialData (for editing)
    if (initialData?.pricing_roles && Array.isArray(initialData.pricing_roles) && initialData.pricing_roles.length > 0) {
      rolesToUse = initialData.pricing_roles;
    }
    // Otherwise check SOW data
    else if (sowData?.pricingRoles) {
      rolesToUse = sowData.pricingRoles;
    } else if (sowData?.pricing?.roles) {
      rolesToUse = sowData.pricing.roles;
    } else if (sowData?.pricing_roles?.roles) {
      rolesToUse = sowData.pricing_roles.roles;
    }
    
    if (shouldShowPricing && rolesToUse && Array.isArray(rolesToUse) && pricingRoles.length === 0) {
      try {
        const sowPricingRoles = rolesToUse.map(role => ({
          id: Math.random().toString(36).substr(2, 9),
          role: role.role,
          ratePerHour: role.ratePerHour,
          totalHours: role.totalHours,
          totalCost: role.totalHours * role.ratePerHour
        }));
        setPricingRoles(sowPricingRoles);
      } catch (error) {
        console.error('Error mapping pricing roles:', error);
      }
    }
  };

  const toggleDropdown = (roleId: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const selectRole = (roleId: string, config: PricingRoleConfig) => {
    const updatedRoles = pricingRoles.map(role => {
      if (role.id === roleId) {
        const defaultRate = getDefaultRateForRole(config.role_name, pricingRolesConfig);
        const isAccountExecutive = config.role_name === 'Account Executive';
        return {
          ...role,
          role: config.role_name,
          ratePerHour: isAccountExecutive ? 0 : defaultRate,
          totalCost: role.totalHours * (isAccountExecutive ? 0 : defaultRate)
        };
      }
      return role;
    });
    setPricingRoles(updatedRoles);
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      newSet.delete(roleId);
      return newSet;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.sow_id) {
      newErrors.sow_id = 'Please select a SOW';
    }
    if (!formData.change_requestor.trim()) {
      newErrors.change_requestor = 'Change requestor is required';
    }
    if (formData.change_categories.length === 0) {
      newErrors.change_categories = 'Please select at least one change category';
    }
    if (!formData.reason_for_change.trim()) {
      newErrors.reason_for_change = 'Reason for change is required';
    }
    if (!formData.change_description.trim()) {
      newErrors.change_description = 'Change description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        ...formData,
        pricing_roles: pricingRoles.length > 0 ? pricingRoles : undefined,
        total_change_amount: pricingRoles.length > 0 ? pricingRoles.reduce((sum, role) => sum + role.totalCost, 0) : 0
      };
      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting change order:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {initialData?.sow_id && initialData?.change_requestor ? 'Edit Change Order' : 'Create Change Order'}
        </h2>
        <p className="text-gray-600">
          {initialData?.sow_id && initialData?.change_requestor 
            ? 'Edit the change order details below. Most information is inherited from the original SOW.'
            : 'Create a change order to modify an existing SOW. Most information will be automatically populated from the original SOW.'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SOW Selection */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">SOW Information</h3>
          {sowData ? (
            <div className="space-y-2">
              <p><strong>Project:</strong> {sowData.sow_title || 'Untitled SOW'}</p>
              <p><strong>Client:</strong> {sowData.client_name || 'Unknown Client'}</p>
              <p><strong>SOW ID:</strong> {sowData.id}</p>
            </div>
          ) : initialData?.sow_id ? (
            <div className="space-y-2">
              <p><strong>SOW ID:</strong> {initialData.sow_id}</p>
              <p className="text-sm text-gray-600">SOW details will be loaded when editing.</p>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              SOW information will be displayed here when a SOW is selected.
            </div>
          )}
        </div>

        {/* Change Requestor */}
        <div>
          <label htmlFor="change_requestor" className="block text-sm font-medium text-gray-700 mb-2">
            Change Requestor *
          </label>
          <input
            type="text"
            id="change_requestor"
            value={formData.change_requestor}
            onChange={(e) => handleInputChange('change_requestor', e.target.value)}
            className={`w-full px-4 py-3 border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.change_requestor ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Who is requesting this change?"
          />
          {errors.change_requestor && (
            <p className="mt-1 text-sm text-red-600">{errors.change_requestor}</p>
          )}
        </div>

        {/* Change Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Change Category (Select all that apply) *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {CHANGE_CATEGORIES.map((category) => {
              const isChecked = formData.change_categories.includes(category);
              return (
                <div 
                  key={category} 
                  onClick={() => handleCategoryToggle(category)}
                  className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                    isChecked 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                    isChecked 
                      ? 'bg-white border-white' 
                      : 'border-gray-400'
                  }`}>
                    {isChecked && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${
                    isChecked ? 'text-white' : 'text-gray-700'
                  }`}>
                    {category}
                  </span>
                </div>
              );
            })}
          </div>
          {errors.change_categories && (
            <p className="mt-1 text-sm text-red-600">{errors.change_categories}</p>
          )}
        </div>

        {/* Pricing Section - Show when Cost or Scope is selected */}
        {showPricing && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold mb-3 text-blue-900">Pricing Changes</h3>
            <p className="text-sm text-blue-700 mb-4">
              Since this change affects Cost or Scope, please specify the updated hours and pricing.
            </p>
            
            <div className="space-y-4">
              {pricingRoles.map((role, index) => (
                <div key={role.id} className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Role Name
                      </label>
                      <div className="relative dropdown-container">
                        <button
                          type="button"
                          onClick={() => toggleDropdown(role.id)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-left flex items-center justify-between"
                        >
                          <span className={role.role ? 'text-gray-900' : 'text-gray-500'}>
                            {role.role || 'Select a role...'}
                          </span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {/* Custom dropdown */}
                        {openDropdowns.has(role.id) && pricingRolesConfig.length > 0 && (
                          <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-xl" style={{ zIndex: 9999, maxHeight: '200px', overflowY: 'auto', minWidth: 'max-content', width: '250px' }}>
                            {pricingRolesConfig.map((config) => {
                              return (
                                <button
                                  key={config.role_name}
                                  type="button"
                                  onClick={() => selectRole(role.id, config)}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                >
                                  <div className="font-medium text-gray-900">{config.role_name}</div>
                                  {config.description && (
                                    <div className="text-xs text-gray-500 mt-1">{config.description}</div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 ml-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Rate/Hour
                      </label>
                      <input
                        type="number"
                        value={role.ratePerHour}
                        onChange={(e) => {
                          const newRate = parseFloat(e.target.value) || 0;
                          const newRoles = [...pricingRoles];
                          newRoles[index] = {
                            ...role,
                            ratePerHour: newRate,
                            totalCost: role.totalHours * newRate
                          };
                          setPricingRoles(newRoles);
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newRoles = pricingRoles.filter((_, i) => i !== index);
                        setPricingRoles(newRoles);
                      }}
                      className="ml-3 px-2 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded hover:bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Total Hours
                      </label>
                      <input
                        type="number"
                        value={role.totalHours}
                        onChange={(e) => {
                          const newHours = parseInt(e.target.value) || 0;
                          const newRoles = [...pricingRoles];
                          newRoles[index] = {
                            ...role,
                            totalHours: newHours,
                            totalCost: newHours * role.ratePerHour
                          };
                          setPricingRoles(newRoles);
                        }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            min="0"
                            step="1"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Total Cost
                      </label>
                      <div className="px-2 py-1 text-sm bg-gray-50 border border-gray-300 rounded text-gray-700">
                        ${role.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {pricingRoles.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p>No pricing roles found in the original SOW.</p>
                  <p className="text-sm mt-1">Click &quot;Add New Role&quot; below to create pricing for this change order.</p>
                </div>
              )}

              {/* Add New Role Button */}
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => {
                    const newRole = {
                      id: Math.random().toString(36).substr(2, 9),
                      role: '',
                      ratePerHour: 0,
                      totalHours: 0,
                      totalCost: 0
                    };
                    setPricingRoles([...pricingRoles, newRole]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  + Add New Role
                </button>
              </div>
              
              {pricingRoles.length > 0 && (
                <div className="bg-white p-3 rounded border border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total Change Order Amount:</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${pricingRoles.reduce((sum, role) => sum + role.totalCost, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Associated PO */}
        <div>
          <label htmlFor="associated_po" className="block text-sm font-medium text-gray-700 mb-2">
            Associated PO
          </label>
          <input
            type="text"
            id="associated_po"
            value={formData.associated_po}
            onChange={(e) => handleInputChange('associated_po', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Purchase order number (optional)"
          />
        </div>

        {/* New Dates (if Schedule is selected) */}
        {formData.change_categories.includes('Schedule') && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-blue-900">New Schedule</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="new_start_date" className="block text-sm font-medium text-gray-700 mb-2">
                  New Start Date
                </label>
                <input
                  type="date"
                  id="new_start_date"
                  value={formData.new_start_date ? formData.new_start_date.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleInputChange('new_start_date', e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full px-4 py-3 border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="new_end_date" className="block text-sm font-medium text-gray-700 mb-2">
                  New End Date
                </label>
                <input
                  type="date"
                  id="new_end_date"
                  value={formData.new_end_date ? formData.new_end_date.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleInputChange('new_end_date', e.target.value ? new Date(e.target.value) : undefined)}
                  className="w-full px-4 py-3 border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Reason for Change */}
        <div>
          <label htmlFor="reason_for_change" className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Change *
          </label>
          <textarea
            id="reason_for_change"
            value={formData.reason_for_change}
            onChange={(e) => handleInputChange('reason_for_change', e.target.value)}
            rows={4}
            className={`w-full px-4 py-3 border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.reason_for_change ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Explain why this change is needed..."
          />
          {errors.reason_for_change && (
            <p className="mt-1 text-sm text-red-600">{errors.reason_for_change}</p>
          )}
        </div>

        {/* Change Description */}
        <div>
          <label htmlFor="change_description" className="block text-sm font-medium text-gray-700 mb-2">
            Change Description *
          </label>
          <textarea
            id="change_description"
            value={formData.change_description}
            onChange={(e) => handleInputChange('change_description', e.target.value)}
            rows={6}
            className={`w-full px-4 py-3 border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.change_description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Describe the specific changes being made..."
          />
          {errors.change_description && (
            <p className="mt-1 text-sm text-red-600">{errors.change_description}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#2a2a2a',
              border: '1px solid #26D07C'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#01eb1d';
              (e.target as HTMLElement).style.color = '#2a2a2a';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#2a2a2a';
              (e.target as HTMLElement).style.color = 'white';
            }}
          >
            {isLoading 
              ? (initialData?.sow_id && initialData?.change_requestor ? 'Updating...' : 'Creating...') 
              : (initialData?.sow_id && initialData?.change_requestor ? 'Update Change Order' : 'Create Change Order')
            }
          </button>
        </div>
      </form>
    </div>
  );
}
