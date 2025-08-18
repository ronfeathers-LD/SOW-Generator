import React, { useState, useCallback, useEffect } from 'react';
import { SOWData } from '@/types/sow';
import PricingCalculator from '@/components/sow/PricingCalculator';
import PricingRolesAndDiscount from '@/components/sow/PricingRolesAndDiscount';
import LoadingModal from '@/components/ui/LoadingModal';

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

interface BillingPaymentTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  onBeforeSave?: (pricingData: {
    roles: Array<{ role: string; rate_per_hour: number; total_hours: number }>;
    discount_type: 'none' | 'fixed' | 'percentage';
    discount_amount: number;
    discount_percentage: number;
    subtotal: number;
    discount_total: number;
    total_amount: number;
    auto_calculated: boolean;
    last_calculated: string;
  }) => void;
}

// Standard LeanData roles with default rates (2025 rates)
const STANDARD_ROLES = [
  { role: 'Onboarding Specialist', ratePerHour: 250, defaultHours: 0 },
];

export default function BillingPaymentTab({
  formData,
  setFormData,
  onBeforeSave,
}: BillingPaymentTabProps) {
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
  
  const [isAutoCalculating, setIsAutoCalculating] = useState(false);

  // Load saved pricing data when component mounts
  useEffect(() => {
    if (formData.pricing) {
      // Load discount configuration
      if (!discountConfig.initialized) {
        setDiscountConfig({
          type: formData.pricing.discount_type || 'none',
          amount: formData.pricing.discount_amount || 0,
          percentage: formData.pricing.discount_percentage || 0,
          initialized: true,
        });
      }

      // Load saved pricing roles
      // Check if roles is an object with a roles array property, or if it's directly an array
      let rolesArray: Array<{ role: string; ratePerHour?: number; rate_per_hour?: number; totalHours?: number; total_hours?: number }> = [];
      
      if (formData.pricing.roles && typeof formData.pricing.roles === 'object' && !Array.isArray(formData.pricing.roles)) {
        // If roles is an object, look for the roles array property
        const rolesObj = formData.pricing.roles as { roles?: Array<{ role: string; ratePerHour?: number; rate_per_hour?: number; totalHours?: number; total_hours?: number }> };
        rolesArray = rolesObj.roles || [];
      } else if (Array.isArray(formData.pricing.roles)) {
        // If roles is directly an array, use it
        rolesArray = formData.pricing.roles as Array<{ role: string; ratePerHour?: number; rate_per_hour?: number; totalHours?: number; total_hours?: number }>;
      }
      
      if (rolesArray && rolesArray.length > 0) {
        const savedRoles = rolesArray.map((role) => ({
          id: Math.random().toString(36).substr(2, 9), // Generate new ID for each role
          role: role.role,
          ratePerHour: role.ratePerHour || role.rate_per_hour || 0,
          totalHours: role.totalHours || role.total_hours || 0,
          totalCost: (role.ratePerHour || role.rate_per_hour || 0) * (role.totalHours || role.total_hours || 0),
        }));
        
        // Simply use the saved roles directly - no need for complex merging
        setPricingRoles(savedRoles);
      }
    }
  }, [formData.pricing, discountConfig.initialized]); // Removed pricingRoles from dependencies to avoid circular dependency

  // Sync pricing roles when form data changes (for auto-calculate updates)
  useEffect(() => {
    if (formData.pricing?.roles && Array.isArray(formData.pricing.roles)) {
      const rolesArray = formData.pricing.roles;
      if (rolesArray.length > 0) {
        const updatedRoles = rolesArray.map((role) => ({
          id: Math.random().toString(36).substr(2, 9),
          role: role.role,
          ratePerHour: role.rate_per_hour || 0,
          totalHours: role.total_hours || 0,
          totalCost: (role.rate_per_hour || 0) * (role.total_hours || 0),
        }));
        
        // Only update if the roles have actually changed
        setPricingRoles(prev => {
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(updatedRoles);
          if (hasChanged) {
    
            return updatedRoles;
          }
          return prev;
        });
      }
    }
  }, [formData.pricing?.roles]);



  // Single calculation function used by all other functions
  const calculateTotals = useCallback(() => {
    const rolesData = pricingRoles
      .filter(role => role.role.trim() !== '' && role.totalHours > 0)
      .map(role => ({
        role: role.role,
        rate_per_hour: role.ratePerHour,
        total_hours: role.totalHours,
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
        // Preserve existing billing info if it exists, or provide default
        billing: formData.pricing?.billing || {
          company_name: '',
          billing_contact: '',
          billing_address: '',
          billing_email: '',
          po_number: '',
        },
        // Auto-save tracking fields
        auto_calculated: true,
        last_calculated: new Date().toISOString(),
      },
    });

    return { newSubtotal, newDiscountTotal, newTotalAmount };
  }, [pricingRoles, discountConfig, formData, setFormData]);

  // Function to ensure form data is up to date before saving
  const ensureFormDataUpToDate = useCallback(() => {
    // Calculate current totals
    const totals = calculateTotals();
    
    // Prepare current pricing data
    const currentPricingData = {
      roles: pricingRoles
        .filter(role => role.role.trim() !== '' && role.totalHours > 0)
        .map(role => ({
          role: role.role,
          rate_per_hour: role.ratePerHour,
          total_hours: role.totalHours,
        })),
      discount_type: discountConfig.type,
      discount_amount: discountConfig.amount,
      discount_percentage: discountConfig.percentage,
      subtotal: totals.newSubtotal,
      discount_total: totals.newDiscountTotal,
      total_amount: totals.newTotalAmount,
      auto_calculated: true,
      last_calculated: new Date().toISOString(),
    };
    
    // Call the onBeforeSave callback to update main form data
    if (onBeforeSave) {
      onBeforeSave(currentPricingData);
    }
  }, [calculateTotals, pricingRoles, discountConfig, onBeforeSave]);

  // Auto-calculate hours based on selected products and units
  const autoCalculateHours = useCallback(async () => {
    
    
    if (!formData.template?.products || formData.template.products.length === 0) {
      
      return;
    }
    
    setIsAutoCalculating(true);
    
    try {

    const selectedProducts = formData.template.products;
    let totalProjectHours = 0;

    // Group routing objects together
    const routingProducts = ['Lead Routing', 'Contact Routing', 'Account Routing'];
    const hasRoutingProducts = routingProducts.some(product => selectedProducts.includes(product));
    
    if (hasRoutingProducts) {
      // Count routing objects (first = 15 hours, additional = 5 hours each)
      const routingObjectCount = routingProducts.filter(product => selectedProducts.includes(product)).length;
      if (routingObjectCount > 0) {
        totalProjectHours += 15 + (Math.max(0, routingObjectCount - 1) * 5);

      }
    }

    // Handle Lead to Account Matching (conditional - only if it's the only product)
    if (selectedProducts.includes('Lead to Account Matching') && selectedProducts.length === 1) {
      totalProjectHours += 15; // 15 hours if standalone
      
    }

    // Handle BookIt products
    if (selectedProducts.includes('BookIt for Forms')) {
      totalProjectHours += 10; // Base BookIt for Forms hours
      
      
      // BookIt Handoff adds 5 hours when combined with BookIt for Forms
      if (selectedProducts.includes('BookIt Handoff (with Smartrep)')) {
        totalProjectHours += 5;

      }
    }

    // Handle other BookIt products (no-cost items, but count hours)
    if (selectedProducts.includes('BookIt Links')) {
      totalProjectHours += 1;
      
    }
    if (selectedProducts.includes('BookIt Handoff (without Smartrep)')) {
      totalProjectHours += 1;
      
    }

    // Add user group hours (every 50 users/units adds 5 hours)
    const totalUnits = parseInt(formData.template?.number_of_units || formData.template?.units_consumption || '0') +
                      parseInt(formData.template?.bookit_forms_units || '0') +
                      parseInt(formData.template?.bookit_links_units || '0') +
                      parseInt(formData.template?.bookit_handoff_units || '0');
    
    if (totalUnits >= 50) {
      const userGroupHours = Math.floor(totalUnits / 50) * 5;
      totalProjectHours += userGroupHours;
      
    }

    // Calculate PM hours (25% of total project hours, rounded up, minimum 10 hours)
    const pmHours = Math.max(10, Math.ceil(totalProjectHours * 0.25));
    

    // Update the Onboarding Specialist role with calculated hours
    const updatedRoles = pricingRoles.map(role => {
      if (role.role === 'Onboarding Specialist') {
        return {
          ...role,
          ratePerHour: 250, // Set the base rate for Onboarding Specialist
          totalHours: totalProjectHours,
          totalCost: 250 * totalProjectHours,
        };
      }
      return role;
    });

    // Check if we need to add a Project Manager role
    const hasProjectManager = updatedRoles.some(role => role.role === 'Project Manager');
    const shouldAddProjectManager = selectedProducts.length >= 3 || totalUnits >= 200;

    if (shouldAddProjectManager && !hasProjectManager) {
      const pmRole: PricingRole = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'Project Manager',
        ratePerHour: 250, // Standard PM rate
        totalHours: pmHours,
        totalCost: 250 * pmHours,
      };
      updatedRoles.push(pmRole);
      
    }

      
      
      // Update pricing roles and then calculate totals in the same render cycle
      setPricingRoles(updatedRoles);
      
      // Calculate totals immediately with the updated roles
      const newSubtotal = updatedRoles.reduce((sum, role) => sum + role.totalCost, 0);
      let newDiscountTotal = 0;
      if (discountConfig.type === 'fixed') {
        newDiscountTotal = discountConfig.amount;
      } else if (discountConfig.type === 'percentage') {
        newDiscountTotal = newSubtotal * (discountConfig.percentage / 100);
      }
      const newTotalAmount = newSubtotal - newDiscountTotal;
      
      // Update form data directly
      const updatedFormData: Partial<SOWData> = {
        ...formData,
        pricing: {
          ...(formData.pricing || {}),
          roles: updatedRoles.map(role => ({
            role: role.role,
            rate_per_hour: role.ratePerHour,
            total_hours: role.totalHours,
          })),
          discount_type: discountConfig.type,
          discount_amount: discountConfig.amount,
          discount_percentage: discountConfig.percentage,
          subtotal: newSubtotal,
          discount_total: newDiscountTotal,
          total_amount: newTotalAmount,
          billing: formData.pricing?.billing || {
            company_name: '',
            billing_contact: '',
            billing_address: '',
            billing_email: '',
            po_number: '',
          },
          auto_calculated: true,
          last_calculated: new Date().toISOString(),
        },
      };
      setFormData(updatedFormData);
      
      
    } catch (error) {
      console.error('❌ Error during auto-calculate:', error);
    } finally {
      setIsAutoCalculating(false);
    }
  }, [formData.template?.products, formData.template?.number_of_units, formData.template?.units_consumption, formData.template?.bookit_forms_units, formData.template?.bookit_links_units, formData.template?.bookit_handoff_units, calculateTotals, discountConfig.type, discountConfig.amount, discountConfig.percentage, setFormData, pricingRoles, formData]);

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Pricing</h2>
      
      {/* Single Column Layout */}
      <div className="space-y-6">
        {/* Pricing Roles and Discount */}
        <PricingRolesAndDiscount
          formData={formData as SOWData}
          pricingRoles={pricingRoles}
          setPricingRoles={setPricingRoles}
          discountConfig={discountConfig}
          setDiscountConfig={setDiscountConfig}
          autoCalculateHours={autoCalculateHours}
          ensureFormDataUpToDate={ensureFormDataUpToDate}
          isAutoCalculating={isAutoCalculating}
        />

        {/* Pricing Calculator */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Pricing Calculator</h3>
          <PricingCalculator 
            formData={formData as SOWData}
          />
        </div>


      </div>
      
      {/* Loading Modal for Auto-Calculate */}
      <LoadingModal 
        isOpen={isAutoCalculating} 
        operation="processing"
        message="Calculating project hours based on selected products and units..."
      />
    </section>
  );
} 