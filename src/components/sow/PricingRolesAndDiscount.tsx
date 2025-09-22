import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PMHoursRequirementDisableRequest } from '@/types/sow';
import PMHoursRemovalModal from './PMHoursRemovalModal';
import PMHoursRemovalApprovalOverlay from './PMHoursRemovalApprovalOverlay';
import { calculateAllHours, calculateRoleHoursDistribution, HOURS_CALCULATION_RULES, calculateProductHoursForProduct } from '@/lib/hours-calculation-utils';
import { getDefaultRateForRole } from '@/lib/pricing-roles-config';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  sort_order: number;
}

interface PricingRole {
  id: string;
  role: string;
  ratePerHour: number;
  defaultRate: number;
  totalHours: number;
  totalCost: number;
}

interface PricingRolesAndDiscountProps {
  formData: {
    id?: string;
    template?: {
      products?: string[];
      number_of_units?: string;
      orchestration_units?: string;
      units_consumption?: string;
      bookit_forms_units?: string;
      bookit_links_units?: string;
      bookit_handoff_units?: string;
      other_products_units?: string;
    };
    [key: string]: unknown;
  };
  pricingRoles: PricingRole[];
  setPricingRoles: (roles: PricingRole[]) => void;
  discountConfig: {
    type: 'none' | 'fixed' | 'percentage';
    amount?: number;
    percentage?: number;
    initialized?: boolean;
  };
  setDiscountConfig: (config: {
    type: 'none' | 'fixed' | 'percentage';
    amount?: number;
    percentage?: number;
    initialized?: boolean;
  }) => void;
  autoCalculateHours: () => Promise<void>;
  isAutoCalculating: boolean;
  onHoursCalculated?: () => void;
  selectedAccount?: { Employee_Band__c?: string } | null;
  pricingRolesConfig?: Array<{ role_name: string; default_rate: number; is_active: boolean }>;
}

const PricingRolesAndDiscount: React.FC<PricingRolesAndDiscountProps> = React.memo(({
  formData,
  pricingRoles,
  setPricingRoles,
  discountConfig,
  setDiscountConfig,
  autoCalculateHours,
  isAutoCalculating,
  onHoursCalculated,
  selectedAccount,
  pricingRolesConfig: _pricingRolesConfig = [] // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());


  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.role-dropdown-container')) {
        setOpenDropdowns(new Set());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  // Helper function to safely get products array
  const getProducts = () => {
    const template = formData.template;
    return template?.products && Array.isArray(template.products) ? template.products : [];
  };

  const [pendingPMHoursRequest, setPendingPMHoursRequest] = useState<PMHoursRequirementDisableRequest | null>(null);
  const [approvedPMHoursRequest, setApprovedPMHoursRequest] = useState<PMHoursRequirementDisableRequest | null>(null);
  const [showPricingCalculator, setShowPricingCalculator] = useState(false);
  const [showPMHoursRemovalModal, setShowPMHoursRemovalModal] = useState(false);
  const [showPMHoursApprovalOverlay, setShowPMHoursApprovalOverlay] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isManuallyEditing, setIsManuallyEditing] = useState(false);
  const hasAutoCalculated = useRef(false);

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, []);

  // Use shared utility to calculate all hours - memoized to prevent recalculation
  const hoursResult = useMemo(() => 
    calculateAllHours(formData.template || {}, selectedAccount?.Employee_Band__c),
    [formData.template, selectedAccount?.Employee_Band__c]
  );
  const { productHours, userGroupHours, accountSegmentHours, baseProjectHours, pmHours, totalUnits, shouldAddProjectManager } = hoursResult;

  // Debug logging removed to prevent console spam

  // Helper function to get units for a specific product
  const getProductUnits = (product: string): string => {
    // Check if it's a routing product (by ID)
    if (product === 'b1f01145-94a9-4000-9f89-59555afedf03' || // Lead Routing
        product === 'f59381c7-40b4-4def-b83f-053a2b6e48bd' || // Contact Routing
        product === 'a9f4cc66-5649-4ae4-a7b5-cbfe89b2ef60' || // Account Routing
        product === 'c980026d-08e0-49da-be39-fe37c40f47c7' || // Opportunity Routing
        product === '5d83b73b-363b-4983-be2d-31d53058633e' || // Case Routing
        product === '88415274-4cb2-409c-8c01-1c37f3a122bc' || // Any Object (custom) Routing
        product === '4a3f2862-dbf2-4558-8b66-67701cbbee14') { // Lead to Account Matching
      return formData.template?.orchestration_units || formData.template?.number_of_units || formData.template?.units_consumption || '0';
    } else if (product === '6dde4839-6d67-4821-a7c7-18c227ffcc93') { // BookIt for Forms
      return (formData.template?.bookit_forms_units || '0');
    } else if (product === '6698b269-10b0-485b-be59-ad9c3cc33368' || // BookIt Handoff (without Smartrep)
               product === '159b4183-ee40-4255-a7d0-968b1482e451') { // BookIt Handoff (with Smartrep)
      return (formData.template?.bookit_handoff_units || '0');
    } else if (product === 'c417d9e5-4792-40c2-b461-b8fec985948a') { // NotifyPlus
      return (formData.template?.other_products_units || '0');
    }
    
    return '0';
  };

  // Get total units for display
  const getTotalUnits = useCallback((): number => {
    return hoursResult.totalUnits;
  }, [hoursResult.totalUnits]);

  // Check PM hours removal status
  const checkPMHoursStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/pm-hours-removal?sowId=${formData.id}`);
      if (response.ok) {
        const data = await response.json();
        const pendingRequest = data.requests.find((req: PMHoursRequirementDisableRequest) => req.status === 'pending');
        const approvedRequest = data.requests.find((req: PMHoursRequirementDisableRequest) => req.status === 'approved');
        
        if (pendingRequest) {
          setPendingPMHoursRequest(pendingRequest);
        }
        if (approvedRequest) {
          setApprovedPMHoursRequest(approvedRequest);
        }
      }
    } catch (error) {
      console.error('Error checking PM hours status:', error);
    }
  }, [formData.id]);

  useEffect(() => {
    checkPMHoursStatus();
  }, [checkPMHoursStatus]);

  // Reset auto-calculate flag when form data changes
  useEffect(() => {
    hasAutoCalculated.current = false;
  }, [formData.id]);

  // Auto-calculate hours on page load if they haven't been calculated yet
  useEffect(() => {
    const shouldAutoCalculate = () => {
      // Don't auto-calculate if we've already done it
      if (hasAutoCalculated.current) {
        return false;
      }

      // TEMPORARILY DISABLE AUTO-CALCULATE TO PREVENT OVERRIDING USER RATES
      // Only allow manual calculation via "Reset Role Hours" button
      return false;

      // Check if we have products selected
      const products = getProducts();
      if (!products || products.length === 0) {
        return false;
      }

      // Check if pricing roles are empty or don't have calculated hours
      if (pricingRoles.length === 0) {
        return true;
      }

      // Check if Onboarding Specialist exists and has hours
      const onboardingSpecialist = pricingRoles.find(role => role.role === 'Onboarding Specialist');
      if (!onboardingSpecialist || onboardingSpecialist?.totalHours === 0) {
        return true;
      }

      // Don't auto-calculate if user has manually set custom rates
      // Check if the rate is different from the expected default (250 for Onboarding Specialist)
      const expectedDefaultRate = 250; // Default rate for Onboarding Specialist
      if (onboardingSpecialist?.ratePerHour !== expectedDefaultRate) {
        return false;
      }

      // Check if Project Manager should exist but doesn't
      const shouldHavePM = products.length >= 3 || getTotalUnits() >= 200;
      const hasPM = pricingRoles.some(role => role.role === 'Project Manager');
      if (shouldHavePM && !hasPM && !approvedPMHoursRequest) {
        return true;
      }

      return false;
    };

    if (shouldAutoCalculate() && !isAutoCalculating) {
      hasAutoCalculated.current = true;
      handleRecalculateHours();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.template, approvedPMHoursRequest, isAutoCalculating]);

  // Calculate role hours distribution - memoized to prevent recalculation
  const roleDistribution = useMemo(() => 
    calculateRoleHoursDistribution(
      baseProjectHours,
      pmHours,
      shouldAddProjectManager,
      !!approvedPMHoursRequest
    ),
    [baseProjectHours, pmHours, shouldAddProjectManager, approvedPMHoursRequest]
  );

  // Auto-sync role hours based on calculated distribution
  // Only run this when baseProjectHours changes or when PM hours status changes, not when pricingRoles change
  // Skip this if user is manually editing to prevent overriding manual changes
  useEffect(() => {
    if (pricingRoles.length > 0 && !isManuallyEditing) {
      const updatedRoles = pricingRoles.map(role => {
        if (role.role === 'Onboarding Specialist') {
          // Onboarding Specialist gets distributed hours
          return {
            ...role,
            totalHours: roleDistribution.onboardingSpecialistHours,
            totalCost: roleDistribution.onboardingSpecialistHours * role.ratePerHour
          };
        } else if (role.role === 'Project Manager') {
          // Project Manager gets distributed hours (0 if PM removed)
          return {
            ...role,
            totalHours: roleDistribution.projectManagerHours,
            totalCost: roleDistribution.projectManagerHours * role.ratePerHour
          };
        }
        return role;
      });
      
      // Only update if there are actual changes to prevent infinite loop
      const hasChanges = updatedRoles.some((role, index) => {
        const originalRole = pricingRoles[index];
        return role.totalHours !== originalRole.totalHours || role.totalCost !== originalRole.totalCost;
      });
      
      if (hasChanges) {
        setPricingRoles(updatedRoles);
      }
    }
  }, [roleDistribution, pricingRoles, isManuallyEditing, setPricingRoles]);

  // Wrapper for autoCalculateHours that triggers PM status check
  const handleRecalculateHours = useCallback(async () => {
    // Reset manual editing flag when auto-calculating
    setIsManuallyEditing(false);
    
    // Only recalculate the base hours and role assignments
    // Don't recalculate costs - those are handled separately
    await autoCalculateHours();
    
    // After recalculating hours, ensure PM removal status is respected
    if (approvedPMHoursRequest && pricingRoles.length > 0) {
      const updatedRoles = pricingRoles.map(role => {
        if (role.role === 'Onboarding Specialist') {
          // When PM hours are removed, Onboarding Specialist gets full base hours
          const baseHours = baseProjectHours;
          return {
            ...role,
            totalHours: baseHours,
            totalCost: baseHours * role.ratePerHour
          };
        } else if (role.role === 'Project Manager') {
          // Project Manager gets 0 hours when PM hours are removed
          return {
            ...role,
            totalHours: 0,
            totalCost: 0
          };
        }
        return role;
      });
      
      setPricingRoles(updatedRoles);
    }
    
    if (onHoursCalculated) {
      onHoursCalculated();
    }
  }, [autoCalculateHours, approvedPMHoursRequest, pricingRoles, baseProjectHours, setPricingRoles, onHoursCalculated]);



  // Handle PM hours removal request submission
  const handlePMHoursRemovalRequestSubmitted = () => {
    // Refresh PM hours status after request is submitted
    checkPMHoursStatus();
  };

  // Update role
  const updateRole = (id: string, field: keyof PricingRole, value: string | number) => {
    // Set manual editing flag when user changes hours or rates
    if (field === 'totalHours' || field === 'ratePerHour') {
      setIsManuallyEditing(true);
    }
    
    setPricingRoles(pricingRoles.map(role => {
      if (role.id === id) {
        const updatedRole = { ...role, [field]: value };
        
        // Recalculate total cost if rate or hours changed
        if (field === 'ratePerHour' || field === 'totalHours') {
          updatedRole.totalCost = updatedRole.ratePerHour * updatedRole.totalHours;
        }
        
        // Special handling for Onboarding Specialist when PM hours are removed
        // Only apply this logic if the user is not manually editing the hours
        if (role.role === 'Onboarding Specialist' && field === 'totalHours' && approvedPMHoursRequest) {
          // When PM hours are removed, Onboarding Specialist should get full base hours
          const baseHours = baseProjectHours;
          updatedRole.totalHours = baseHours;
          updatedRole.totalCost = baseHours * updatedRole.ratePerHour;
        }
        
        return updatedRole;
      }
      return role;
    }));
  };

  // Add new role
  const addRole = () => {
    const defaultRate = 250; // Default fallback rate
    const newRole: PricingRole = {
      id: Math.random().toString(36).substr(2, 9),
      role: '',
      ratePerHour: defaultRate,
      defaultRate: defaultRate,
      totalHours: 0,
      totalCost: 0,
    };
    setPricingRoles([...pricingRoles, newRole]);
  };

  // Remove role
  const removeRole = (id: string) => {
    const roleToRemove = pricingRoles.find(role => role.id === id);
    
    if (roleToRemove?.role === 'Project Manager') {
      // For Project Manager, only allow PM Hours Removal for EC and MM accounts
      if (selectedAccount?.Employee_Band__c === 'EC' || selectedAccount?.Employee_Band__c === 'MM') {
        setShowPMHoursRemovalModal(true);
      } else {
        // For other account segments, just remove the role directly
        setPricingRoles(pricingRoles.filter(role => role.id !== id));
      }
    } else {
      // For other roles, just remove them from the table
      setPricingRoles(pricingRoles.filter(role => role.id !== id));
    }
  };

  // Calculate total cost
  const calculateTotalCost = (): number => {
    return pricingRoles.reduce((sum, role) => {
      // If PM hours are removed by approval, don't include Project Manager role
      if (role.role === 'Project Manager' && approvedPMHoursRequest) {
        return sum;
      }
      return sum + role.totalCost;
    }, 0);
  };

  // Get current calculations using role distribution
  const totalHours = roleDistribution.totalProjectHours;

  return (
    <div className="space-y-6">
      {/* Calculate Hours Button */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <button
          type="button"
          onClick={handleRecalculateHours}
          disabled={getProducts().length === 0 || isAutoCalculating}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAutoCalculating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculating Hours...
            </>
          ) : (
            'Reset Role Hours'
          )}
        </button>
        
        {(!formData.template?.products || formData.template.products.length === 0) && (
          <p className="text-sm text-blue-600 text-center mt-2">
            💡 Tip: Go to the Project Overview tab to select products and set units (users/endpoints)
          </p>
        )}
      </div>

      {/* PM Hours Status */}
      {(pendingPMHoursRequest || approvedPMHoursRequest) && (
        <div className={`p-3 rounded-lg border ${
          pendingPMHoursRequest 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center text-sm">
            <svg className={`w-4 h-4 mr-2 ${
              pendingPMHoursRequest ? 'text-blue-600' : 'text-green-600'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                pendingPMHoursRequest 
                  ? "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  : "M5 13l4 4L19 7"
              } />
            </svg>
            <span className={pendingPMHoursRequest ? 'text-blue-800' : 'text-green-800'}>
              {pendingPMHoursRequest 
                ? 'PM Hours Removal Request Pending Approval'
                : 'PM Hours Removed by Approval'
              }
            </span>
            {approvedPMHoursRequest && (
              <a 
                href={`/pmo/pm-hours-removal?id=${approvedPMHoursRequest.id}`}
                className="ml-2 text-blue-600 hover:text-blue-800 underline"
              >
                View approval details
              </a>
            )}
          </div>
        </div>
      )}

      {/* Integrated Project Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Project Summary
          </h3>
        </div>

        {/* Hours Breakdown and Discount Configuration - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Hours Breakdown - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                {formData.template?.products?.length || 0} objects 
                <button 
                  onClick={() => setShowPricingCalculator(true)}
                  className="ml-1 text-blue-600 hover:text-blue-800 underline"
                >
                  (Details)
                </button>
                :
              </span>
              <span className="font-medium">{productHours} hours</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                {totalUnits} users ({Math.ceil(totalUnits / 50)} × 50):
              </span>
              <span className="font-medium">{userGroupHours} hours</span>
            </div>
            
            
            
            {/* Account Segment Hours Breakdown */}
            {accountSegmentHours > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Account Segment ({selectedAccount?.Employee_Band__c}):</span>
                <span className="font-semibold text-gray-900">+{accountSegmentHours} hours</span>
              </div>
            )}
            
            <div className="flex justify-between items-center border-t pt-3">
              <span className="font-medium text-gray-900">Base Hours:</span>
              <span className="font-semibold text-gray-900">{baseProjectHours} hours</span>
            </div>

            {roleDistribution.projectManagerHours > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Onboarding Specialist Deduction:</span>
                  <span className="font-semibold text-red-600">-{pmHours / 2} hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Onboarding Specialist (final):</span>
                  <span className="font-semibold text-gray-900">{roleDistribution.onboardingSpecialistHours} hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">Project Manager (45%):</span>
                    {(selectedAccount?.Employee_Band__c === 'EC' || selectedAccount?.Employee_Band__c === 'MM' || !selectedAccount?.Employee_Band__c) && (
                      pendingPMHoursRequest ? (
                        <button
                          onClick={() => setShowPMHoursApprovalOverlay(true)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          (Request Pending)
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowPMHoursRemovalModal(true)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          (Request Removal)
                        </button>
                      )
                    )}
                  </div>
                  <span className="font-semibold text-gray-900">{roleDistribution.projectManagerHours} hours</span>
                </div>
              </>
            )}

            {!roleDistribution.projectManagerHours && shouldAddProjectManager && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Onboarding Specialist:</span>
                <span className="font-semibold text-gray-900">{roleDistribution.onboardingSpecialistHours} hours</span>
              </div>
            )}

            <div className="flex justify-between items-center border-t pt-3">
              <span className="font-semibold text-lg text-gray-900">Total Hours:</span>
              <span className="font-bold text-lg text-gray-900">{totalHours} hours</span>
            </div>

            {/* Total Cost - Added here after Total Hours */}
            <div className="space-y-2">
              {/* Subtotal */}
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Subtotal:</span>
                <span className="font-medium text-gray-700">${calculateTotalCost().toLocaleString()}</span>
              </div>

              {/* Discount */}
              {discountConfig?.type && discountConfig.type !== 'none' && ((discountConfig.type === 'fixed' && discountConfig.amount && discountConfig.amount > 0) || (discountConfig.type === 'percentage' && discountConfig.percentage && discountConfig.percentage > 0)) && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-medium">Discount {discountConfig.type === 'fixed' ? '($)' : '(%)'}:</span>
                  <span className="font-medium">
                    {discountConfig.type === 'fixed' 
                      ? `-$${(discountConfig.amount || 0).toLocaleString()}` 
                      : `-${discountConfig.percentage || 0}%`
                    }
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center border-t pt-2">
                <span className="font-semibold text-lg text-gray-900">Total:</span>
                <span className="font-bold text-lg text-gray-900">
                  ${(() => {
                    const subtotal = calculateTotalCost();
                    if (discountConfig?.type === 'fixed' && discountConfig.amount && discountConfig.amount > 0) {
                      return Math.max(0, subtotal - discountConfig.amount).toLocaleString();
                    } else if (discountConfig?.type === 'percentage' && discountConfig.percentage && discountConfig.percentage > 0) {
                      return Math.max(0, subtotal * (1 - discountConfig.percentage / 100)).toLocaleString();
                    }
                    return subtotal.toLocaleString();
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Discount Configuration - Takes 1 column */}
          <div className="lg:col-span-1 ">
            <h2 className="font-medium text-gray-900 mb-4">Discount Configuration</h2>
            <div className="space-y-4 shadow-md p-4 rounded-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                <select
                  value={discountConfig?.type || 'none'}
                  onChange={(e) => setDiscountConfig({ ...discountConfig, type: e.target.value as 'none' | 'fixed' | 'percentage' })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">No Discount</option>
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              
              {(discountConfig?.type === 'fixed' || discountConfig?.type === 'percentage') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {discountConfig.type === 'fixed' ? 'Discount Amount ($)' : 'Discount Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    value={discountConfig?.amount || ''}
                    onChange={(e) => setDiscountConfig({ ...discountConfig, amount: parseFloat(e.target.value) || 0 })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder={discountConfig.type === 'fixed' ? '0.00' : '0'}
                    step={discountConfig.type === 'fixed' ? '0.01' : '0.1'}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Role Costs Table */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-4">Role Costs:</h4>
          
          <div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">ROLE</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">DEFAULT RATE ($)</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">DISCOUNTED RATE ($)</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">TOTAL HOURS</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">TOTAL COST ($)</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pricingRoles.map(role => {
                  const isPMRemoved = role.role === 'Project Manager' && approvedPMHoursRequest;
                  const isPMPending = role.role === 'Project Manager' && pendingPMHoursRequest;
                  return (
                    <tr key={role.id} className={
                      isPMRemoved ? 'bg-gray-50' : 
                      isPMPending ? 'bg-blue-50 border-l-4 border-blue-400' : ''
                    }>
                      <td className="px-3 py-4 whitespace-nowrap w-64">
                        <div className="flex items-center space-x-2">
                          <div className="relative w-full role-dropdown-container">
                            <div className="relative">
                              <input
                                type="text"
                                value={role.role}
                                onChange={(e) => {
                                  const newRoleName = e.target.value;
                                  updateRole(role.id, 'role', newRoleName);
                                  
                                  // Auto-update default rate when role name changes
                                  const defaultRate = getDefaultRateForRole(newRoleName, _pricingRolesConfig);
                                  if (defaultRate !== role.defaultRate) {
                                    updateRole(role.id, 'defaultRate', defaultRate);
                                    updateRole(role.id, 'ratePerHour', defaultRate);
                                  }
                                }}
                                onFocus={() => setOpenDropdowns(prev => new Set(prev).add(role.id))}
                                className={`block w-full pr-10 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                                  isPMRemoved || isPMPending ? 'bg-gray-100 text-gray-500' : ''
                                }`}
                                disabled={!!isPMRemoved || !!isPMPending}
                                placeholder={_pricingRolesConfig.length === 0 ? "Loading roles..." : "Enter role name or select from list"}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newSet = new Set(openDropdowns);
                                  if (newSet.has(role.id)) {
                                    newSet.delete(role.id);
                                  } else {
                                    newSet.add(role.id);
                                  }
                                  setOpenDropdowns(newSet);
                                }}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                disabled={!!isPMRemoved || !!isPMPending || _pricingRolesConfig.length === 0}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                            
                            {/* Custom dropdown */}
                            {openDropdowns.has(role.id) && _pricingRolesConfig.length > 0 && (
                              <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-xl" style={{ zIndex: 9999, maxHeight: '200px', overflowY: 'auto', minWidth: 'max-content', width: '250px' }}>
                                {_pricingRolesConfig.map((config) => {
                                  return (
                                    <button
                                      key={config.role_name}
                                      type="button"
                                      onClick={() => {
                                        updateRole(role.id, 'role', config.role_name);
                                        const defaultRate = getDefaultRateForRole(config.role_name, _pricingRolesConfig);
                                        if (defaultRate !== role.defaultRate) {
                                          updateRole(role.id, 'defaultRate', defaultRate);
                                          updateRole(role.id, 'ratePerHour', defaultRate);
                                        }
                                        setOpenDropdowns(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(role.id);
                                          return newSet;
                                        });
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                                      disabled={!!isPMRemoved || !!isPMPending}
                                      style={{ display: 'block', minHeight: '40px' }}
                                    >
                                      {config.role_name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {isPMPending && (
                            <div className="flex items-center text-blue-600 text-xs">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Pending
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 w-32">
                        ${role.defaultRate}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap w-32">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={role.ratePerHour}
                            onChange={(e) => updateRole(role.id, 'ratePerHour', parseFloat(e.target.value) || 0)}
                            className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                              isPMRemoved || isPMPending ? 'bg-gray-100 text-gray-500' : ''
                            }`}
                            disabled={!!isPMRemoved || !!isPMPending}
                            placeholder="Enter overridden rate"
                          />
                          {role.ratePerHour !== role.defaultRate && !isPMRemoved && !isPMPending && (
                            <button
                              type="button"
                              onClick={() => updateRole(role.id, 'ratePerHour', role.defaultRate)}
                              className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border border-gray-300"
                              title="Clear override and reset to default rate"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap w-24">
                        <input
                          type="number"
                          value={role.totalHours}
                          onChange={(e) => updateRole(role.id, 'totalHours', parseFloat(e.target.value) || 0)}
                          className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                            isPMRemoved || isPMPending ? 'bg-gray-100 text-gray-500' : ''
                          }`}
                          disabled={!!isPMRemoved || !!isPMPending}
                        />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 w-32">
                        ${role.totalCost.toLocaleString()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium w-20">
                        {isPMRemoved ? (
                          <span className="text-gray-400 text-xs">Removed by approval</span>
                        ) : isPMPending ? (
                          <button
                            type="button"
                            onClick={() => setShowPMHoursApprovalOverlay(true)}
                            className="text-blue-600 hover:text-blue-800 text-xs underline bg-transparent border-none cursor-pointer"
                          >
                            Request pending
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeRole(role.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Add Role Button */}
          <div className="mt-4">
            <button
              type="button"
              onClick={addRole}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Role
            </button>
          </div>
        </div>

        {/* Recalculate Button */}
        <div className="flex justify-end">
                      <button
              type="button"
              onClick={handleRecalculateHours}
              disabled={!formData.template?.products || formData.template.products.length === 0 || isAutoCalculating}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset Role Hours
            </button>
        </div>

        {/* Info Note */}
        <div className="mt-4 bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="flex items-center text-sm text-green-800">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            💡 The calculated hours have been assigned to the Onboarding Specialist role. Project Manager role is auto-added for 3+ products. You can manually adjust the distribution or add additional roles as needed. Use the &quot;Add Role&quot; button to create custom roles, and select from predefined roles or enter custom role names.
          </div>
        </div>
      </div>

    

      {/* Pricing Calculator Modal */}
      {showPricingCalculator && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Pricing Calculator Details</h3>
                <button
                  onClick={() => setShowPricingCalculator(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Selected Products & Units:</h4>
                  <div className="space-y-2">
                    {formData.template?.products?.map((product: string) => {
                      const productUnits = getProductUnits(product);
                      const individualProductHours = calculateProductHoursForProduct(product, formData.template?.products || []);
                      
                      // Get product name from products array
                      const getProductName = (productId: string): string => {
                        const product = products.find(p => p.id === productId);
                        return product?.name || productId;
                      };
                      
                      return (
                        <div key={product} className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="font-medium text-gray-700">{getProductName(product)}</span>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              <div>Units: {productUnits} {productUnits === '1' ? 'user/endpoint' : 'users/endpoints'}</div>
                              <div className="text-blue-600 font-medium">
                                Hours: {individualProductHours} {individualProductHours === 1 ? 'hr' : 'hrs'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p><strong>Calculation Rules:</strong></p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>{HOURS_CALCULATION_RULES.routing.description}</li>
                    <li>{HOURS_CALCULATION_RULES.leadToAccount.description}</li>
                    <li>{HOURS_CALCULATION_RULES.bookitForms.description}</li>
                    <li>{HOURS_CALCULATION_RULES.bookitHandoffWithSmartrep.description}</li>
                    <li>{HOURS_CALCULATION_RULES.bookitLinks.description}</li>
                    <li>{HOURS_CALCULATION_RULES.userGroups.description}</li>
                    <li>{HOURS_CALCULATION_RULES.projectManager.description}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PM Hours Removal Modal */}
      <PMHoursRemovalModal
        isOpen={showPMHoursRemovalModal}
        onClose={() => setShowPMHoursRemovalModal(false)}
        sowId={formData.id || ''}
        currentPMHours={roleDistribution.projectManagerHours}
        onRequestSubmitted={handlePMHoursRemovalRequestSubmitted}
      />

      {/* PM Hours Removal Approval Overlay */}
      {pendingPMHoursRequest && (
        <PMHoursRemovalApprovalOverlay
          isOpen={showPMHoursApprovalOverlay}
          onClose={() => setShowPMHoursApprovalOverlay(false)}
          requestId={pendingPMHoursRequest.id}
          onStatusChange={handlePMHoursRemovalRequestSubmitted}
        />
      )}
    </div>
  );
});

PricingRolesAndDiscount.displayName = 'PricingRolesAndDiscount';

export default PricingRolesAndDiscount;
