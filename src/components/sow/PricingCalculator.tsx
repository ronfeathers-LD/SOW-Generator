'use client';

import React, { useState, useCallback, useEffect } from 'react';

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

interface PricingCalculatorProps {
  formData: Partial<{
    template?: {
      products?: string[];
      number_of_units?: string;
      units_consumption?: string;
      orchestration_units?: string;
      bookit_forms_units?: string;
      bookit_links_units?: string;
      bookit_handoff_units?: string;
      [key: string]: any;
    };
    pricing?: {
      discount_type?: 'none' | 'fixed' | 'percentage';
      discount_amount?: number;
      discount_percentage?: number;
      [key: string]: any;
    };
    [key: string]: any;
  }>;
  setFormData: (data: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

// Standard LeanData roles with default rates (2025 rates)
const STANDARD_ROLES = [
  { role: 'Onboarding Specialist', ratePerHour: 250, defaultHours: 0 },
];

// Product-based hour estimation rules based on business guidelines
const PRODUCT_HOUR_ESTIMATES = {
  'Lead to Account Matching': {
    baseHours: 15, // Lead to Account Matching = 15 hours ONLY if no other products
    perUnitHours: 0, // No additional hours per unit
    conditional: true, // Flag for conditional product
  },
  'Lead Routing': {
    baseHours: 15, // One routing object = 15 hours
    perUnitHours: 0, // No additional hours per unit
  },
  'Contact Routing': {
    baseHours: 15, // One routing object = 15 hours
    perUnitHours: 0, // No additional hours per unit
  },
  'BookIt for Forms': {
    baseHours: 10, // BookIt for Forms = 10 hours
    perUnitHours: 0, // No additional hours per unit
  },
  'BookIt Links': {
    baseHours: 1, // BookIt Links = 1 hour (no cost)
    perUnitHours: 0, // No additional hours per unit
    noCost: true, // Flag for no-cost items
  },
  'BookIt Handoff (without Smartrep)': {
    baseHours: 1, // BookIt Handoff without Smartrep = 1 hour (no cost)
    perUnitHours: 0, // No additional hours per unit
    noCost: true, // Flag for no-cost items
  },
  'BookIt Handoff (with Smartrep)': {
    baseHours: 10, // BookIt Handoff with Smartrep = 10 hours if alone
    perUnitHours: 0, // No additional hours per unit
    smartrepDiscount: true, // Flag for Smartrep discount logic
  },
};

export default function PricingCalculator({ formData, setFormData, onValidationChange }: PricingCalculatorProps) {
  const [pricingRoles, setPricingRoles] = useState<PricingRole[]>(STANDARD_ROLES.map(role => ({
    ...role,
    id: Math.random().toString(36).substr(2, 9),
    totalHours: 0,
    totalCost: 0,
  })));



  const [discountConfig, setDiscountConfig] = useState<DiscountConfig>({
    type: 'none',
    amount: 0,
    percentage: 0,
    initialized: false,
  });

  const [showAutoCalculate, setShowAutoCalculate] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showCalculationFormulas, setShowCalculationFormulas] = useState(false);

  // Load discount configuration from saved data when component mounts
  useEffect(() => {
    if (formData.pricing && !discountConfig.initialized) {
      setDiscountConfig({
        type: formData.pricing.discount_type || 'none',
        amount: formData.pricing.discount_amount || 0,
        percentage: formData.pricing.discount_percentage || 0,
        initialized: true,
      });
    }
  }, [formData.pricing, discountConfig.initialized]);

  // Single calculation function used by all other functions
  const calculateTotals = useCallback(() => {
    const rolesData = pricingRoles
      .filter(role => role.role.trim() !== '' && role.totalHours > 0)
      .map(role => ({
        role: role.role,
        ratePerHour: role.ratePerHour,
        totalHours: role.totalHours,
      }));

    const newSubtotal = pricingRoles.reduce((sum, role) => sum + role.totalCost, 0);
    
    let newDiscountTotal = 0;
    if (discountConfig.type === 'fixed') {
      newDiscountTotal = discountConfig.amount;
    } else if (discountConfig.type === 'percentage') {
      newDiscountTotal = newSubtotal * (discountConfig.percentage / 100);
    }
    
    const newTotalAmount = newSubtotal - newDiscountTotal;

    // Update form data with calculated totals
    setFormData({
      ...formData,
      pricing: {
        ...(formData.pricing || {}),
        roles: rolesData,
        discount_type: discountConfig.type,
        discount_amount: discountConfig.amount,
        discount_percentage: discountConfig.percentage,
        subtotal: newSubtotal,
        discount_total: newDiscountTotal,
        total_amount: newTotalAmount,
      },
    });

    return { newSubtotal, newDiscountTotal, newTotalAmount };
  }, [pricingRoles, discountConfig, formData, setFormData]);

  // Auto-calculate hours based on product selection and units from Project Overview tab
  const autoCalculateHours = useCallback(() => {
    try {
      const selectedProducts = (formData.template && typeof formData.template === 'object' && 'products' in formData.template && Array.isArray(formData.template.products)) ? formData.template.products : [];
      
      if (selectedProducts.length === 0) {
        alert('Please select products on the Project Overview tab before auto-calculating hours.');
        return;
      }

      const newRoles = [...pricingRoles];

      // Reset hours for non-Project Manager roles only
      newRoles.forEach(role => {
        if (role.role !== 'Project Manager') {
          role.totalHours = 0;
          role.totalCost = 0;
        }
      });

      // Calculate total hours for all selected products based on business guidelines
      let totalProjectHours = 0;
      let routingObjectCount = 0;
      let hasOtherProducts = false;
      
      // First pass: count routing objects and check for other products
      selectedProducts.forEach((product: string) => {
        if (product === 'Lead Routing' || product === 'Contact Routing') {
          routingObjectCount++; // Only count actual routing objects
        }
        if (product !== 'BookIt Handoff (with Smartrep)' && product !== 'BookIt Links' && product !== 'BookIt Handoff (without Smartrep)') {
          hasOtherProducts = true;
        }
      });
      
      // Second pass: calculate hours with business logic
      selectedProducts.forEach((product: string) => {
        const productConfig = PRODUCT_HOUR_ESTIMATES[product as keyof typeof PRODUCT_HOUR_ESTIMATES];
        if (productConfig) {
          let productHours = productConfig.baseHours;
          
          // Special logic for Lead to Account Matching (only gets hours if no other products)
          if (product === 'Lead to Account Matching') {
            if (selectedProducts.length > 1) {
              productHours = 0; // 0 hours if there are other products
            } else {
              productHours = 15; // 15 hours if it's the only product
            }
          }
          
          // Special logic for BookIt Handoff with Smartrep
          if (product === 'BookIt Handoff (with Smartrep)') {
            if (hasOtherProducts) {
              productHours = 5; // 5 hours if added to any other objects
            } else {
              productHours = 10; // 10 hours if alone
            }
          }
          
          // Add hours for routing objects (beyond the first one)
          if ((product === 'Lead Routing' || product === 'Contact Routing') && routingObjectCount > 1) {
            // First routing object gets 15 hours, additional ones get 5 hours each
            const isFirstRoutingObject = selectedProducts.indexOf(product) === selectedProducts.findIndex((p: string) => p === 'Lead Routing' || p === 'Contact Routing');
            if (!isFirstRoutingObject) {
              productHours = 5; // Additional routing objects = 5 hours each
            }
          }
          
          totalProjectHours += productHours;
        }
      });
      
      // Add hours for user/unit groups (every 50 users/units adds 5 hours)
      // number_of_units applies to all orchestration objects collectively
      const orchestrationUnits = parseInt(formData.template?.number_of_units || formData.template?.units_consumption || '0');
      const bookitFormsUnits = parseInt(formData.template?.bookit_forms_units || '0');
      const bookitLinksUnits = parseInt(formData.template?.bookit_links_units || '0');
      const bookitHandoffUnits = parseInt(formData.template?.bookit_handoff_units || '0');
      
      const totalUnits = orchestrationUnits + bookitFormsUnits + bookitLinksUnits + bookitHandoffUnits;
      
      if (totalUnits > 0) {
        const unitGroups = Math.floor(totalUnits / 50);
        totalProjectHours += unitGroups * 5;
      }

      // Auto-add Project Management as a role if 3+ products (excluding Lead to Account Matching, including BookIt Handoff with Smartrep as objects)
      const filteredProducts = selectedProducts.filter((product: string) => 
        product !== 'Lead to Account Matching'
      );
      const projectManagementProducts = selectedProducts.filter((product: string) => 
        product === 'BookIt Handoff (with Smartrep)'
      );
      const totalProductCount = filteredProducts.length + projectManagementProducts.length;
      
      if (totalProductCount >= 3) {
        // Check if Project Manager role already exists
        const projectManagerExists = newRoles.some(role => role.role === 'Project Manager');
        
        if (!projectManagerExists) {
          // Add Project Manager role with default hours and rate
          const projectManagerRole: PricingRole = {
            id: Math.random().toString(36).substr(2, 9),
            role: 'Project Manager',
            ratePerHour: 250, // Default rate
            totalHours: 40, // Default project management hours
            totalCost: 250 * 40, // Calculate total cost
          };
          
          newRoles.push(projectManagerRole);
        } else {
          // Preserve existing Project Manager role - ensure it has the correct hours and rate
          const projectManagerIndex = newRoles.findIndex(role => role.role === 'Project Manager');
          if (projectManagerIndex !== -1) {
            newRoles[projectManagerIndex].totalHours = 40; // Ensure default hours
            newRoles[projectManagerIndex].ratePerHour = 250; // Ensure default rate
            newRoles[projectManagerIndex].totalCost = 250 * 40; // Recalculate cost
          }
        }
      } else {
        // If criteria no longer met, remove Project Manager role
        const projectManagerIndex = newRoles.findIndex(role => role.role === 'Project Manager');
        if (projectManagerIndex !== -1) {
          newRoles.splice(projectManagerIndex, 1);
        }
      }

      // Assign all hours to Onboarding Specialist by default (required role)
      const onboardingSpecialistIndex = newRoles.findIndex(r => r.role === 'Onboarding Specialist');
      if (onboardingSpecialistIndex !== -1) {
        newRoles[onboardingSpecialistIndex].totalHours = totalProjectHours;
        newRoles[onboardingSpecialistIndex].totalCost = newRoles[onboardingSpecialistIndex].totalHours * newRoles[onboardingSpecialistIndex].ratePerHour;
      }

      setPricingRoles(newRoles);
      
      // Use the single calculation function
      calculateTotals();

      // Successfully calculated hours - no alert needed
      
      // Auto-save the calculated pricing to the database if this is the first calculation
      if (!formData.pricing?.total_amount) {
        try {
          // Trigger save by updating form data with a flag to indicate this needs saving
          setFormData((prevData: any) => ({
            ...prevData,
            pricing: {
              ...prevData.pricing,
              auto_calculated: true, // Flag to indicate this was auto-calculated
              last_calculated: new Date().toISOString(),
            }
          }));
          
          // Note: The actual database save will happen when the user saves the tab
          // This ensures the calculated values are preserved in the form state
        } catch (saveError) {
          console.error('Error preparing pricing data for save:', saveError);
        }
      }
    } catch (error) {
      console.error('Error in auto-calculate:', error);
      alert('An error occurred while calculating hours. Please check your input and try again.');
    }
  }, [formData.template, pricingRoles, setFormData, formData.pricing?.total_amount, calculateTotals]);

  // Auto-calculate on page load if no pricing data exists yet
  useEffect(() => {
    const hasExistingPricing = pricingRoles.some(role => role.totalHours > 0) || 
                               formData.pricing?.subtotal || 
                               formData.pricing?.total_amount;
    
    const hasProducts = formData.template?.products && 
                       Array.isArray(formData.template.products) && 
                       formData.template.products.length > 0;
    
    // Only auto-calculate if there are products selected and no existing pricing data
    if (hasProducts && !hasExistingPricing) {
      // Use setTimeout to avoid calling setState during render
      setTimeout(() => {
        autoCalculateHours();
      }, 0);
    }
  }, [formData.template?.products, autoCalculateHours, pricingRoles, formData.pricing?.subtotal, formData.pricing?.total_amount]); // Include all dependencies

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
    
    // Calculate totals directly with updated roles to avoid stale closure issues
    const updatedRoles = newRoles;
    const rolesData = updatedRoles
      .filter(role => role.role.trim() !== '' && role.totalHours > 0)
      .map(role => ({
        role: role.role,
        ratePerHour: role.ratePerHour,
        totalHours: role.totalHours,
      }));

    const newSubtotal = updatedRoles.reduce((sum, role) => sum + role.totalCost, 0);
    
    let newDiscountTotal = 0;
    if (discountConfig.type === 'fixed') {
      newDiscountTotal = discountConfig.amount;
    } else if (discountConfig.type === 'percentage') {
      newDiscountTotal = newSubtotal * (discountConfig.percentage / 100);
    }
    
    const newTotalAmount = newSubtotal - newDiscountTotal;

    // Update form data with calculated totals
    setFormData({
      ...formData,
      pricing: {
        ...(formData.pricing || {}),
        roles: rolesData,
        discount_type: discountConfig.type,
        discount_amount: discountConfig.amount,
        discount_percentage: discountConfig.percentage,
        subtotal: newSubtotal,
        discount_total: newDiscountTotal,
        total_amount: newTotalAmount,
      },
    });
  };

  // Add new role
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
    
    // Use the single calculation function
    calculateTotals();
  };

  // Update discount configuration
  const updateDiscount = (field: keyof typeof discountConfig, value: string | number) => {
    const newConfig = { ...discountConfig, [field]: value };
    setDiscountConfig(newConfig);
    
    // Use the single calculation function
    calculateTotals();
  };



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
          <h3 className="text-lg font-semibold text-blue-900">Update Hours</h3>
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
            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => setShowHowItWorks(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium underline block"
              >
                How it works
              </button>
              <button
                type="button"
                onClick={() => setShowCalculationFormulas(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium underline block"
              >
                Calculation Formulas
              </button>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-gray-900 mb-3">Selected Products & Units:</h4>
              {formData.template?.products && Array.isArray(formData.template.products) && formData.template.products.length > 0 ? (
                <div className="space-y-2">
                  {formData.template.products.map((product: string, index: number) => {

                    let unitValue = '';
                    let isNoCost = false;
                    
                    if (product === 'Lead to Account Matching' || product === 'Lead Routing' || product === 'Contact Routing') {
                      // number_of_units applies to all orchestration objects collectively
                      unitValue = formData.template?.number_of_units || formData.template?.units_consumption || '0';

                    } else if (product === 'BookIt for Forms') {

                      unitValue = formData.template?.bookit_forms_units || '0';
                    } else if (product === 'BookIt Links') {

                      unitValue = formData.template?.bookit_links_units || '0';
                      isNoCost = true;
                    } else if (product === 'BookIt Handoff (without Smartrep)') {
                      unitValue = formData.template?.bookit_handoff_units || '0';
                      isNoCost = true;
                    } else if (product === 'BookIt Handoff (with Smartrep)') {

                      unitValue = formData.template?.bookit_handoff_units || '0';
                    }
                    
                    return (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium text-gray-700">{product}</span>
                        <div className="text-right">
                          <span className="text-sm text-gray-600">
                            Units: {unitValue} {unitValue === '1' ? 'user/endpoint' : 'users/endpoints'}
                          </span>
                          {isNoCost && (
                            <div className="text-xs text-green-600 font-medium">No Cost</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 italic">No products selected. Please go to the Project Overview tab to select products first.</p>
              )}
            </div>

            {/* Role Suggestions */}
            {formData.template?.products && Array.isArray(formData.template.products) && formData.template.products.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-2">💡 Role Suggestions:</h4>
                <ul className="text-sm text-yellow-800 space-y-2">
                  <li><strong>Onboarding Specialist:</strong> Always included (required role)</li>
                  {(() => {
                    const selectedProducts = (formData.template && typeof formData.template === 'object' && 'products' in formData.template && Array.isArray(formData.template.products)) ? formData.template.products : [];
                    // Filter out "Lead to Account Matching" from the count
                    const filteredProducts = selectedProducts.filter((product: string) => 
                      product !== 'Lead to Account Matching'
                    );
                    const projectManagementProducts = selectedProducts.filter((product: string) => 
                      product === 'BookIt Handoff (with Smartrep)'
                    );
                    const totalProductCount = filteredProducts.length + projectManagementProducts.length;
                    
                    if (totalProductCount >= 3) {
                      return <li className="text-green-700"><strong>Project Manager:</strong> Auto-added as role (3+ products, excluding Lead to Account Matching)</li>;
                    }
                    return null;
                  })()}
                  {(() => {
                    const orchestrationUnits = parseInt(formData.template?.number_of_units || formData.template?.units_consumption || '0');
                    const bookitFormsUnits = parseInt(formData.template?.bookit_forms_units || '0');
                    const bookitLinksUnits = parseInt(formData.template?.bookit_links_units || '0');
                    const bookitHandoffUnits = parseInt(formData.template?.bookit_handoff_units || '0');
                    const totalUnits = orchestrationUnits + bookitFormsUnits + bookitLinksUnits + bookitHandoffUnits;
                    
                    if (totalUnits >= 200) {
                      return <li className="text-green-700"><strong>Project Manager:</strong> Consider adding (200+ users/endpoints)</li>;
                    }
                    return null;
                  })()}
                  <li><strong>Solution Architect:</strong> Add for Enterprise SOWs only</li>
                  <li><strong>Developer:</strong> Add only when technical development is required</li>
                </ul>
              </div>
            )}
            

            
            <button
              type="button"
              onClick={autoCalculateHours}
              disabled={!formData.template?.products || formData.template.products.length === 0}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Calculate Hours Based on Selected Products
            </button>
            
            {/* Show calculated hours summary if available */}
            {pricingRoles.some(role => role.totalHours > 0) && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
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
            
            {formData.template?.products && Array.isArray(formData.template.products) && formData.template.products.length === 0 && (
              <p className="text-sm text-blue-600 text-center">
                💡 Tip: Go to the Project Overview tab to select products and set units (users/endpoints)
              </p>
            )}
          </div>
        )}
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
      </div>

      {/* Pricing Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">Pricing Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Subtotal</div>
            <div className="text-xl font-bold text-gray-900">
              ${(formData.pricing?.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Discount</div>
            <div className="text-xl font-bold text-red-600">
              {formData.pricing?.discount_type === 'fixed' && formData.pricing?.discount_amount ? (
                `-$${formData.pricing.discount_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              ) : formData.pricing?.discount_type === 'percentage' && formData.pricing?.discount_percentage ? (
                `-${formData.pricing.discount_percentage}%`
              ) : (
                '$0.00'
              )}
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">Total Amount</div>
            <div className="text-xl font-bold text-green-600">
              ${(formData.pricing?.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>





      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">How it works</h3>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Hours are automatically calculated based on products selected in the <strong>Project Overview</strong> tab
              </p>
              <ul className="text-sm text-gray-700 space-y-2">
                <li><strong>Lead to Account Matching:</strong> 15 hours if standalone, 0 hours if with other products</li>
                <li><strong>Routing Objects:</strong> Lead/Contact Routing = 15 hours each (first), 5 hours each (additional)</li>
                <li><strong>BookIt for Forms:</strong> 10 hours</li>
                <li><strong>BookIt Links:</strong> 1 hour (no cost)</li>
                <li><strong>BookIt Handoff:</strong> 1 hour without Smartrep (no cost), 10 hours with Smartrep alone, 5 hours with Smartrep + other products</li>
                <li><strong>User Groups:</strong> Every 50 users/units adds 5 hours</li>
                <li><strong>All calculated hours are initially assigned to the Onboarding Specialist role</strong></li>
              </ul>
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
