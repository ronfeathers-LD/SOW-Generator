'use client';

import { useMemo } from 'react';
import { calculateAllHours, HOURS_CALCULATION_RULES } from '@/lib/hours-calculation-utils';

interface CalculatorData {
  products: string[];
  number_of_units: string;
  orchestration_units: string;
  bookit_forms_units: string;
  bookit_links_units: string;
  bookit_handoff_units: string;
  account_segment?: string;
  pm_hours_removed?: boolean;
  discount_type?: 'none' | 'fixed' | 'percentage';
  discount_amount?: number;
  discount_percentage?: number;
}

interface PricingCalculatorResultsProps {
  data: CalculatorData;
  scenarios: CalculatorData[];
}

interface PricingRole {
  role: string;
  ratePerHour: number;
  totalHours: number;
  totalCost: number;
}

const STANDARD_ROLES: Omit<PricingRole, 'totalHours' | 'totalCost'>[] = [
  { role: 'Onboarding Specialist', ratePerHour: 250 },
  { role: 'Project Manager', ratePerHour: 250 },
  { role: 'Technical Lead', ratePerHour: 200 },
  { role: 'Developer', ratePerHour: 150 },
  { role: 'QA Engineer', ratePerHour: 125 },
];

export default function PricingCalculatorResults({ data, scenarios }: PricingCalculatorResultsProps) {
  // Convert CalculatorData to SOWTemplate format for calculations
  const templateData = useMemo(() => ({
    products: data.products,
    number_of_units: data.number_of_units,
    orchestration_units: data.orchestration_units,
    bookit_forms_units: data.bookit_forms_units,
    bookit_links_units: data.bookit_links_units,
    bookit_handoff_units: data.bookit_handoff_units,
  }), [data]);

  // Calculate hours using the existing utility
  const hoursResult = useMemo(() => 
    calculateAllHours(templateData, data.account_segment),
    [templateData, data.account_segment]
  );

  const { productHours, userGroupHours, accountSegmentHours, baseProjectHours, pmHours, totalUnits, shouldAddProjectManager } = hoursResult;

  // Calculate pricing roles
  const pricingRoles = useMemo((): PricingRole[] => {
    const roles: PricingRole[] = [];
    
    // Onboarding Specialist gets base project hours
    const onboardingSpecialist = STANDARD_ROLES.find(r => r.role === 'Onboarding Specialist');
    if (onboardingSpecialist) {
      // When PM hours are removed, Onboarding Specialist gets the full base hours
      // When PM hours are included, Onboarding Specialist gets base hours (PM gets the additional hours)
      const onboardingHours = data.pm_hours_removed && shouldAddProjectManager 
        ? baseProjectHours + pmHours  // Full hours when PM removed
        : baseProjectHours;           // Base hours when PM included
      
      roles.push({
        ...onboardingSpecialist,
        totalHours: onboardingHours,
        totalCost: onboardingHours * onboardingSpecialist.ratePerHour
      });
    }

    // Project Manager gets PM hours if conditions are met and not removed
    if (shouldAddProjectManager && !data.pm_hours_removed) {
      const projectManager = STANDARD_ROLES.find(r => r.role === 'Project Manager');
      if (projectManager) {
        roles.push({
          ...projectManager,
          totalHours: pmHours,
          totalCost: pmHours * projectManager.ratePerHour
        });
      }
    }

    return roles;
  }, [baseProjectHours, pmHours, shouldAddProjectManager, data.pm_hours_removed]);

  const subtotal = pricingRoles.reduce((sum, role) => sum + role.totalCost, 0);
  const totalHours = data.pm_hours_removed && shouldAddProjectManager 
    ? baseProjectHours + pmHours  // Full hours when PM removed (Onboarding Specialist gets them)
    : baseProjectHours + (shouldAddProjectManager ? pmHours : 0);  // Normal calculation when PM included
  
  // Calculate discount
  const discountTotal = useMemo(() => {
    if (data.discount_type === 'fixed' && data.discount_amount) {
      return data.discount_amount;
    } else if (data.discount_type === 'percentage' && data.discount_percentage) {
      return subtotal * (data.discount_percentage / 100);
    }
    return 0;
  }, [data.discount_type, data.discount_amount, data.discount_percentage, subtotal]);
  
  const totalAmount = subtotal - discountTotal;

  // Calculate scenario comparisons
  const scenarioComparisons = useMemo(() => {
    return scenarios.map((scenario, index) => {
      const scenarioTemplate = {
        products: scenario.products,
        number_of_units: scenario.number_of_units,
        orchestration_units: scenario.orchestration_units,
        bookit_forms_units: scenario.bookit_forms_units,
        bookit_links_units: scenario.bookit_links_units,
        bookit_handoff_units: scenario.bookit_handoff_units,
      };
      
      const scenarioHours = calculateAllHours(scenarioTemplate, scenario.account_segment);
      const scenarioRoles: PricingRole[] = [];
      
      // Onboarding Specialist
      const onboardingSpecialist = STANDARD_ROLES.find(r => r.role === 'Onboarding Specialist');
      if (onboardingSpecialist) {
        // When PM hours are removed, Onboarding Specialist gets the full base hours
        const onboardingHours = scenario.pm_hours_removed && scenarioHours.shouldAddProjectManager 
          ? scenarioHours.baseProjectHours + scenarioHours.pmHours  // Full hours when PM removed
          : scenarioHours.baseProjectHours;  // Base hours when PM included
        
        scenarioRoles.push({
          ...onboardingSpecialist,
          totalHours: onboardingHours,
          totalCost: onboardingHours * onboardingSpecialist.ratePerHour
        });
      }

      // Project Manager
      if (scenarioHours.shouldAddProjectManager && !scenario.pm_hours_removed) {
        const projectManager = STANDARD_ROLES.find(r => r.role === 'Project Manager');
        if (projectManager) {
          scenarioRoles.push({
            ...projectManager,
            totalHours: scenarioHours.pmHours,
            totalCost: scenarioHours.pmHours * projectManager.ratePerHour
          });
        }
      }

      const scenarioSubtotal = scenarioRoles.reduce((sum, role) => sum + role.totalCost, 0);
      const scenarioTotalHours = scenario.pm_hours_removed && scenarioHours.shouldAddProjectManager 
        ? scenarioHours.baseProjectHours + scenarioHours.pmHours  // Full hours when PM removed
        : scenarioHours.baseProjectHours + (scenarioHours.shouldAddProjectManager ? scenarioHours.pmHours : 0);  // Normal calculation
      
      // Calculate scenario discount
      let scenarioDiscountTotal = 0;
      if (scenario.discount_type === 'fixed' && scenario.discount_amount) {
        scenarioDiscountTotal = scenario.discount_amount;
      } else if (scenario.discount_type === 'percentage' && scenario.discount_percentage) {
        scenarioDiscountTotal = scenarioSubtotal * (scenario.discount_percentage / 100);
      }
      
      const scenarioTotalAmount = scenarioSubtotal - scenarioDiscountTotal;

      return {
        index: index + 1,
        totalHours: scenarioTotalHours,
        subtotal: scenarioSubtotal,
        totalAmount: scenarioTotalAmount,
        discountTotal: scenarioDiscountTotal,
        roles: scenarioRoles,
        hours: scenarioHours
      };
    });
  }, [scenarios]);

  if (data.products.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No products selected</h3>
        <p className="mt-1 text-sm text-gray-500">Select products and configure units to see calculations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Configuration Results */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Configuration</h3>
        
        {/* Hours Breakdown */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">
              {data.products.length} products:
            </span>
            <span className="font-medium">{productHours} hours</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-700">
              {totalUnits} users ({Math.ceil(totalUnits / 50)} × 50):
            </span>
            <span className="font-medium">{userGroupHours} hours</span>
          </div>
          
          {accountSegmentHours > 0 && (
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Account Segment ({data.account_segment}):</span>
              <span className="font-semibold text-gray-900">+{accountSegmentHours} hours</span>
            </div>
          )}
          
          <div className="flex justify-between items-center border-t pt-3">
            <span className="font-medium text-gray-900">Base Hours:</span>
            <span className="font-semibold text-gray-900">{baseProjectHours} hours</span>
          </div>

          {shouldAddProjectManager && !data.pm_hours_removed && (
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Project Manager (45%):</span>
              <span className="font-semibold text-gray-900">{pmHours} hours</span>
            </div>
          )}

          {shouldAddProjectManager && data.pm_hours_removed && (
            <div className="flex justify-between items-center text-gray-500">
              <span className="font-medium">Project Manager (45%):</span>
              <span className="font-medium line-through">{pmHours} hours (removed)</span>
            </div>
          )}

          <div className="flex justify-between items-center border-t pt-3">
            <span className="font-semibold text-lg text-gray-900">Total Hours:</span>
            <span className="font-bold text-lg text-gray-900">{totalHours} hours</span>
          </div>
        </div>

        {/* Role Costs */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Role Costs:</h4>
          {pricingRoles.map((role, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="text-gray-700">{role.role}:</span>
              <span className="font-medium">${role.totalCost.toLocaleString()}</span>
            </div>
          ))}
          
          <div className="flex justify-between items-center border-t pt-2">
            <span className="font-medium text-gray-700">Subtotal:</span>
            <span className="font-medium text-gray-700">${subtotal.toLocaleString()}</span>
          </div>

          {/* Discount */}
          {data.discount_type && data.discount_type !== 'none' && discountTotal > 0 && (
            <div className="flex justify-between items-center text-green-600">
              <span className="font-medium">
                Discount {data.discount_type === 'fixed' ? '($)' : '(%)'}:
              </span>
              <span className="font-medium">
                {data.discount_type === 'fixed' 
                  ? `-$${discountTotal.toLocaleString()}` 
                  : `-${data.discount_percentage}%`
                }
              </span>
            </div>
          )}

          <div className="flex justify-between items-center border-t pt-2 font-semibold">
            <span className="text-gray-900">Total Cost:</span>
            <span className="text-gray-900">${totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Scenario Comparisons */}
      {scenarioComparisons.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Scenario Comparisons</h3>
          {scenarioComparisons.map((scenario) => (
            <div key={scenario.index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Scenario {scenario.index}</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Hours:</span>
                  <span className="ml-2 font-medium">{scenario.totalHours}</span>
                </div>
                <div>
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="ml-2 font-medium">${scenario.subtotal.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Products:</span>
                  <span className="ml-2 font-medium">{scenario.hours.productHours > 0 ? 'Yes' : 'No'}</span>
                </div>
                <div>
                  <span className="text-gray-600">PM Required:</span>
                  <span className="ml-2 font-medium">{scenario.hours.shouldAddProjectManager ? 'Yes' : 'No'}</span>
                </div>
                {scenario.discountTotal > 0 && (
                  <>
                    <div>
                      <span className="text-gray-600">Discount:</span>
                      <span className="ml-2 font-medium text-green-600">-${scenario.discountTotal.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="ml-2 font-medium">${scenario.totalAmount.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calculation Rules */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Calculation Rules</h4>
        <div className="text-sm text-gray-700 space-y-2">
          <div><strong>Routing Products:</strong> {HOURS_CALCULATION_RULES.routing.description}</div>
          <div><strong>Lead to Account Matching:</strong> {HOURS_CALCULATION_RULES.leadToAccount.description}</div>
          <div><strong>BookIt for Forms:</strong> {HOURS_CALCULATION_RULES.bookitForms.description}</div>
          <div><strong>BookIt Handoff (with Smartrep):</strong> {HOURS_CALCULATION_RULES.bookitHandoffWithSmartrep.description}</div>
          <div><strong>BookIt Links/Handoff (without Smartrep):</strong> {HOURS_CALCULATION_RULES.bookitLinks.description}</div>
          <div><strong>User Groups:</strong> {HOURS_CALCULATION_RULES.userGroups.description}</div>
          <div><strong>Project Manager:</strong> {HOURS_CALCULATION_RULES.projectManager.description}</div>
        </div>
      </div>
    </div>
  );
}
