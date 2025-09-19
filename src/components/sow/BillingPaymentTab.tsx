import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { SOWData } from '@/types/sow';
import PricingRolesAndDiscount from '@/components/sow/PricingRolesAndDiscount';
import LoadingModal from '@/components/ui/LoadingModal';
import { calculateAllHours, calculateRoleHoursDistribution } from '@/lib/hours-calculation-utils';
import { getPricingRolesConfig, getDefaultRateForRole, PricingRoleConfig } from '@/lib/pricing-roles-config';

interface PricingRole {
  id: string;
  role: string;
  ratePerHour: number;
  defaultRate: number;
  totalHours: number;
  totalCost: number;
}

interface DiscountConfig {
  type: 'none' | 'fixed' | 'percentage';
  amount?: number;
  percentage?: number;
  initialized?: boolean;
}

interface BillingPaymentTabProps {
  formData: Partial<SOWData>;
  setFormData: (data: Partial<SOWData>) => void;
  selectedAccount?: { Employee_Band__c?: string } | null;
}

// Standard LeanData roles with default rates (2025 rates)
const STANDARD_ROLES = [
  { role: 'Onboarding Specialist', ratePerHour: 250, defaultRate: 250, defaultHours: 0 },
];

interface PricingData {
  roles: Array<{ role: string; ratePerHour: number; defaultRate: number; totalHours: number }>;
  discount_type: string;
  discount_amount: number | null;
  discount_percentage: number | null;
  subtotal: number;
  discount_total: number;
  total_amount: number;
  auto_calculated: boolean;
  last_calculated: string;
}

export default forwardRef<{ getCurrentPricingData?: () => PricingData }, BillingPaymentTabProps>(function BillingPaymentTab({
  formData,
  setFormData,
  selectedAccount,
}, ref) {
  const [pricingRolesConfig, setPricingRolesConfig] = useState<PricingRoleConfig[]>([]);
  const [pricingRoles, setPricingRoles] = useState<PricingRole[]>(STANDARD_ROLES.map(role => ({
    ...role,
    id: Math.random().toString(36).substr(2, 9),
    defaultRate: 250, // Default rate
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

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    getCurrentPricingData: () => {
      const subtotal = pricingRoles.reduce((sum, role) => sum + role.totalCost, 0);
      let discountTotal = 0;
      if (discountConfig.type === 'fixed') {
        discountTotal = discountConfig.amount || 0;
      } else if (discountConfig.type === 'percentage') {
        discountTotal = subtotal * ((discountConfig.percentage || 0) / 100);
      }
      const totalAmount = subtotal - discountTotal;
      
      return {
        roles: pricingRoles.map(role => ({
          role: role.role,
          ratePerHour: role.ratePerHour,
          defaultRate: role.defaultRate,
          totalHours: role.totalHours,
        })),
        discount_type: discountConfig.type,
        discount_amount: discountConfig.type === 'fixed' ? (discountConfig.amount || null) : null,
        discount_percentage: discountConfig.type === 'percentage' ? (discountConfig.percentage || null) : null,
        subtotal,
        discount_total: discountTotal,
        total_amount: totalAmount,
        auto_calculated: true,
        last_calculated: new Date().toISOString(),
      };
    }
  }), [pricingRoles, discountConfig]);

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
      let rolesArray: Array<{ role: string; ratePerHour?: number; defaultRate?: number; totalHours?: number }> = [];
      
      if (formData.pricing.roles && typeof formData.pricing.roles === 'object' && !Array.isArray(formData.pricing.roles)) {
        // If roles is an object, look for the roles array property
        const rolesObj = formData.pricing.roles as { roles?: Array<{ role: string; ratePerHour?: number; defaultRate?: number; totalHours?: number }> };
        rolesArray = rolesObj.roles || [];
      } else if (Array.isArray(formData.pricing.roles)) {
        // If roles is directly an array, use it
        rolesArray = formData.pricing.roles as Array<{ role: string; ratePerHour?: number; defaultRate?: number; totalHours?: number }>;
      }
      
      if (rolesArray && rolesArray.length > 0) {
        const savedRoles = rolesArray.map((role) => ({
          id: Math.random().toString(36).substr(2, 9), // Generate new ID for each role
          role: role.role,
          ratePerHour: role.ratePerHour || 0,
          defaultRate: role.defaultRate || getDefaultRateForRole(role.role, pricingRolesConfig) || 250,
          totalHours: role.totalHours || 0,
          totalCost: (role.ratePerHour || 0) * (role.totalHours || 0),
        }));
        
        // Simply use the saved roles directly - no need for complex merging
        // Don't filter out Project Manager role here - let the UI components handle display logic
        setPricingRoles(savedRoles);
      }
    }
  }, [formData.pricing, discountConfig.initialized, formData.pm_hours_requirement_disabled, pricingRolesConfig]); // Include pricingRolesConfig to ensure it's loaded

  // This effect was causing infinite re-renders - removed

  // Auto-save pricing roles when they change (debounced to prevent infinite re-renders)
  useEffect(() => {
    if (formData.id && pricingRoles.length > 0) {
      const savePricingRoles = async () => {
        try {
          const subtotal = pricingRoles.reduce((sum, role) => sum + role.totalCost, 0);
          let discountTotal = 0;
          if (discountConfig.type === 'fixed') {
            discountTotal = discountConfig.amount || 0;
          } else if (discountConfig.type === 'percentage') {
            discountTotal = subtotal * ((discountConfig.percentage || 0) / 100);
          }
          const totalAmount = subtotal - discountTotal;

          const requestBody = {
            tab: 'Pricing',
            data: {
              pricing: {
                roles: pricingRoles.map(role => ({
                  role: role.role,
                  ratePerHour: role.ratePerHour,
                  defaultRate: role.defaultRate,
                  totalHours: role.totalHours,
                })),
                discount_type: discountConfig.type,
                discount_amount: discountConfig.type === 'fixed' ? (discountConfig.amount || null) : null,
                discount_percentage: discountConfig.type === 'percentage' ? (discountConfig.percentage || null) : null,
                subtotal,
                discount_total: discountTotal,
                total_amount: totalAmount,
                auto_calculated: false,
                last_calculated: new Date().toISOString(),
              }
            }
          };


          const response = await fetch(`/api/sow/${formData.id}/tab-update`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            console.error('Failed to save pricing roles:', response.statusText);
          }
        } catch (error) {
          console.error('Error saving pricing roles:', error);
        }
      };

      // Debounce the save operation to avoid too many API calls
      const timeoutId = setTimeout(savePricingRoles, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [pricingRoles, formData.id, discountConfig]);

  // Auto-calculate hours based on selected products and units
  const autoCalculateHours = async () => {
    if (!formData.template?.products || formData.template.products.length === 0) {
      return;
    }
    
    setIsAutoCalculating(true);
    
    try {
      // Use shared utility to calculate all hours
      const hoursResult = calculateAllHours(formData.template, selectedAccount?.Employee_Band__c);
      const { baseProjectHours, pmHours, shouldAddProjectManager: shouldAddPM } = hoursResult;
      
      // Calculate role hours distribution
      const roleDistribution = calculateRoleHoursDistribution(
        baseProjectHours,
        pmHours,
        shouldAddPM,
        formData.pm_hours_requirement_disabled
      );
      
      // If no roles exist, create default roles
      let updatedRoles = pricingRoles.length === 0 ? [] : [...pricingRoles];
      
      // Ensure Onboarding Specialist exists
      const hasOnboardingSpecialist = updatedRoles.some(role => role.role === 'Onboarding Specialist');
      if (!hasOnboardingSpecialist) {
        const defaultRate = getDefaultRateForRole('Onboarding Specialist', pricingRolesConfig);
        const onboardingRole: PricingRole = {
          id: Math.random().toString(36).substr(2, 9),
          role: 'Onboarding Specialist',
          ratePerHour: defaultRate,
          defaultRate: defaultRate,
          totalHours: roleDistribution.onboardingSpecialistHours,
          totalCost: defaultRate * roleDistribution.onboardingSpecialistHours,
        };
        updatedRoles.push(onboardingRole);
      } else {
        // Update existing Onboarding Specialist role
        updatedRoles = updatedRoles.map(role => {
          if (role.role === 'Onboarding Specialist') {
            // Onboarding Specialist gets distributed hours
            const defaultRate = getDefaultRateForRole('Onboarding Specialist', pricingRolesConfig);
            // Preserve the user's custom rate (don't override it with default)
            const currentRate = role.ratePerHour;
            return {
              ...role,
              ratePerHour: currentRate,
              defaultRate: defaultRate,
              totalHours: roleDistribution.onboardingSpecialistHours,
              totalCost: currentRate * roleDistribution.onboardingSpecialistHours,
            };
          }
          return role;
        });
      }

      // Check if we need to add or update a Project Manager role
      const hasProjectManager = updatedRoles.some(role => role.role === 'Project Manager');


      if (shouldAddPM && !formData.pm_hours_requirement_disabled) {
        if (!hasProjectManager) {
          // Add new Project Manager role
          const defaultRate = getDefaultRateForRole('Project Manager', pricingRolesConfig);
          const pmRole: PricingRole = {
            id: Math.random().toString(36).substr(2, 9),
            role: 'Project Manager',
            ratePerHour: defaultRate,
            defaultRate: defaultRate,
            totalHours: roleDistribution.projectManagerHours,
            totalCost: defaultRate * roleDistribution.projectManagerHours,
          };
          updatedRoles.push(pmRole);
        } else {
          // Update existing Project Manager role
          const defaultRate = getDefaultRateForRole('Project Manager', pricingRolesConfig);
          updatedRoles = updatedRoles.map(role => {
            if (role.role === 'Project Manager') {
              return {
                ...role,
                totalHours: roleDistribution.projectManagerHours,
                totalCost: defaultRate * roleDistribution.projectManagerHours,
              };
            }
            return role;
          });
        }
      }

      // Update pricing roles and then calculate totals in the same render cycle
      setPricingRoles(updatedRoles);
      
      // Calculate totals immediately with the updated roles
      const newSubtotal = updatedRoles.reduce((sum, role) => sum + role.totalCost, 0);
      let newDiscountTotal = 0;
      if (discountConfig.type === 'fixed') {
        newDiscountTotal = discountConfig.amount || 0;
      } else if (discountConfig.type === 'percentage') {
        newDiscountTotal = newSubtotal * ((discountConfig.percentage || 0) / 100);
      }
      const newTotalAmount = newSubtotal - newDiscountTotal;
      
      // Update form data directly
      const updatedFormData: Partial<SOWData> = {
        ...formData,
        pricing: {
          ...(formData.pricing || {}),
          roles: updatedRoles.map(role => ({
            role: role.role,
            ratePerHour: role.ratePerHour,
            defaultRate: role.defaultRate,
            totalHours: role.totalHours,
          })),
          discount_type: discountConfig.type,
                discount_amount: discountConfig.type === 'fixed' ? (discountConfig.amount || null) : null,
                discount_percentage: discountConfig.type === 'percentage' ? (discountConfig.percentage || null) : null,
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
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Pricing</h2>
      
      {/* Single Column Layout */}
      <div className="space-y-6">
        {/* Pricing Roles and Discount */}
        <PricingRolesAndDiscount
          formData={formData as SOWData & Record<string, unknown>}
          pricingRoles={pricingRoles}
          setPricingRoles={setPricingRoles}
          discountConfig={discountConfig}
          setDiscountConfig={setDiscountConfig}
          autoCalculateHours={autoCalculateHours}
          isAutoCalculating={isAutoCalculating}
          onHoursCalculated={() => {
            // This callback is called after hours are calculated
            // The UI components now handle PM role display logic properly
          }}
          selectedAccount={selectedAccount}
          pricingRolesConfig={pricingRolesConfig}
        />

      </div>
      
      {/* Loading Modal for Auto-Calculate */}
      <LoadingModal 
        isOpen={isAutoCalculating} 
        operation="processing"
        message="Calculating project hours based on selected products and units..."
      />
    </section>
  );
});