/**
 * Shared utility functions for calculating project hours
 * This centralizes all hours calculation logic to ensure consistency
 */

import { SOWTemplate } from '@/types/sow';
import { 
  PRODUCT_IDS, 
  PRODUCT_IDS_BY_CATEGORY,
  isRoutingProductById, 
  isLeadToAccountProductById, 
  isFormsProductById, 
  isLinksProductById, 
  isNoCostProductById 
} from '@/lib/constants/products';

export interface HoursCalculationResult {
  productHours: number;
  userGroupHours: number;
  accountSegmentHours: number;
  baseProjectHours: number;
  pmHours: number;
  totalUnits: number;
  shouldAddProjectManager: boolean;
}

export interface RoleHoursDistribution {
  onboardingSpecialistHours: number;
  projectManagerHours: number;
  totalProjectHours: number;
}

/**
 * Calculate hours for individual products based on business rules
 */
export function calculateProductHours(products: string[]): number {
  if (!products || products.length === 0) return 0;
  
  let totalHours = 0;
  
  // Lead to Account Matching: only if it's the only product (excluding BookIt Links)
  const productsExcludingBookItLinks = products.filter(product => !isLinksProductById(product));
  if (products.some(product => isLeadToAccountProductById(product)) && productsExcludingBookItLinks.length === 1) {
    totalHours += 15;
  } else {
    // Routing products: first = 15 hours, additional = 5 hours each (excluding Lead to Account Matching)
    const routingProducts = products.filter(product => isRoutingProductById(product) && !isLeadToAccountProductById(product));
    
    if (routingProducts.length > 0) {
      totalHours += 15 + (Math.max(0, routingProducts.length - 1) * 5);
    }
  }
  
  // BookIt products
  if (products.some(product => isFormsProductById(product))) {
    totalHours += 10;
    if (products.some(product => product === '159b4183-ee40-4255-a7d0-968b1482e451')) { // BookIt Handoff with SmartRep
      totalHours += 5;
    }
  }
  
  if (products.some(product => product === 'dbe57330-23a9-42bc-bef2-5bbfbcef4e09')) { // BookIt Links
    totalHours += 1;
  }
  
  if (products.some(product => product === '6698b269-10b0-485b-be59-ad9c3cc33368')) { // BookIt Handoff without SmartRep
    totalHours += 1;
  }
  
  return totalHours;
}

/**
 * Calculate user group hours (every 50 users/units adds 5 hours)
 * Note: BookIt products share the same user pool, so we use the maximum BookIt user count
 */
export function calculateUserGroupHours(template: Partial<SOWTemplate>): number {
  // Helper function to safely parse units, handling text values
  const safeParseUnits = (value: string | undefined): number => {
    if (!value) return 0;
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
  };
  
  // BookIt products share the same user pool, so use the maximum count
  const bookitFormsUnits = safeParseUnits(template?.bookit_forms_units);
  const bookitLinksUnits = safeParseUnits(template?.bookit_links_units);
  const bookitHandoffUnits = safeParseUnits(template?.bookit_handoff_units);
  const maxBookitUnits = Math.max(bookitFormsUnits, bookitLinksUnits, bookitHandoffUnits);
  
  const orchestrationUnits = safeParseUnits(template?.number_of_units) + 
                            safeParseUnits(template?.orchestration_units);
  
  // Take the maximum of orchestration and BookIt users (not the sum)
  const totalUnits = Math.max(orchestrationUnits, maxBookitUnits);
  
  if (totalUnits >= 50) {
    return Math.floor(totalUnits / 50) * 5;
  }
  return 0;
}

/**
 * Calculate total units from template
 * Note: BookIt products share the same user pool, so we use the maximum BookIt user count
 */
export function calculateTotalUnits(template: Partial<SOWTemplate>): number {
  // Helper function to safely parse units, handling text values
  const safeParseUnits = (value: string | undefined): number => {
    if (!value) return 0;
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
  };
  
  const orchestrationUnits = safeParseUnits(template?.number_of_units) || 
                            safeParseUnits(template?.orchestration_units);
  
  // BookIt products share the same user pool, so use the maximum count
  const bookitFormsUnits = safeParseUnits(template?.bookit_forms_units);
  const bookitLinksUnits = safeParseUnits(template?.bookit_links_units);
  const bookitHandoffUnits = safeParseUnits(template?.bookit_handoff_units);
  const maxBookitUnits = Math.max(bookitFormsUnits, bookitLinksUnits, bookitHandoffUnits);
  
  // Take the maximum of orchestration and BookIt users (not the sum)
  const total = Math.max(orchestrationUnits, maxBookitUnits);
  
  return total;
}

/**
 * Calculate account segment hours
 * MM (MidMarket) accounts get 5 additional hours
 * Note: The actual field name in Salesforce is Employee_Band__c
 */
export function calculateAccountSegmentHours(accountSegment?: string): number {
  if (accountSegment === 'MM' || accountSegment === 'MidMarket') {
    return 5;
  }
  return 0;
}

/**
 * Calculate base project hours (product hours + user group hours + account segment hours)
 */
export function calculateBaseProjectHours(template: Partial<SOWTemplate>, accountSegment?: string): number {
  const products = template?.products || [];
  const productHours = calculateProductHours(products);
  const userGroupHours = calculateUserGroupHours(template);
  const accountSegmentHours = calculateAccountSegmentHours(accountSegment);
  return productHours + userGroupHours + accountSegmentHours;
}

/**
 * Calculate PM hours (45% of total project hours, minimum 10)
 */
export function calculatePMHours(template: Partial<SOWTemplate>, accountSegment?: string): number {
  const baseProjectHours = calculateBaseProjectHours(template, accountSegment);
  return Math.max(10, Math.ceil(baseProjectHours * 0.45));
}

/**
 * Calculate all hours components for a given template
 * Returns a comprehensive result object
 */
export function calculateAllHours(template: Partial<SOWTemplate>, accountSegment?: string): HoursCalculationResult {
  const products = template?.products || [];
  const productHours = calculateProductHours(products);
  const userGroupHours = calculateUserGroupHours(template);
  const accountSegmentHours = calculateAccountSegmentHours(accountSegment);
  const baseProjectHours = productHours + userGroupHours + accountSegmentHours;
  const totalUnits = calculateTotalUnits(template);
  const shouldAddPM = shouldAddProjectManager(template);
  const pmHours = shouldAddPM ? Math.max(10, Math.ceil(baseProjectHours * 0.45)) : 0;
  
  
  return {
    productHours,
    userGroupHours,
    accountSegmentHours,
    baseProjectHours,
    pmHours,
    totalUnits,
    shouldAddProjectManager: shouldAddPM
  };
}

/**
 * Check if Project Manager should be added based on business rules
 * PM is added when: 3+ products OR 200+ units
 * Note: BookIt Links is excluded from product count as it's not counted as an object
 */
export function shouldAddProjectManager(template: Partial<SOWTemplate>): boolean {
  const products = (template?.products || []).filter(product => product !== PRODUCT_IDS.BOOKIT_LINKS);
  const totalUnits = calculateTotalUnits(template);
  return products.length >= 3 || totalUnits >= 200;
}

/**
 * Calculate role hours distribution between Onboarding Specialist and Project Manager
 * When PM is added: Onboarding Specialist loses half of PM hours, PM gets full PM hours
 * When PM is removed: Onboarding Specialist gets full base hours, PM gets 0
 */
export function calculateRoleHoursDistribution(
  baseProjectHours: number,
  pmHours: number,
  shouldAddPM: boolean,
  pmHoursRemoved: boolean = false
): RoleHoursDistribution {
  if (!shouldAddPM || pmHoursRemoved) {
    // No PM or PM removed: Onboarding Specialist gets full base hours
    return {
      onboardingSpecialistHours: baseProjectHours,
      projectManagerHours: 0,
      totalProjectHours: baseProjectHours
    };
  } else {
    // PM added: Onboarding Specialist loses half of PM hours, PM gets full PM hours
    const onboardingHours = baseProjectHours - (pmHours / 2);
    return {
      onboardingSpecialistHours: onboardingHours,
      projectManagerHours: pmHours,
      totalProjectHours: baseProjectHours + (pmHours / 2)
    };
  }
}

/**
 * Calculate hours for a specific product (used in PricingCalculator)
 */
export function calculateProductHoursForProduct(product: string, allProducts: string[]): number {
  let hours = 0;
  
  if (isLeadToAccountProductById(product)) {
    // Lead to Account Matching: 15 hours ONLY if it's the only product (excluding BookIt Links)
    const productsExcludingBookItLinks = allProducts.filter(p => !isLinksProductById(p));
    if (productsExcludingBookItLinks.length === 1) {
      hours = 15;
    } else {
      // If there are multiple products, Lead to Account Matching gets 0 hours
      hours = 0;
    }
  } else if (isRoutingProductById(product)) {
    // Routing products: first = 15 hours, additional = 5 hours each
    const routingProducts = allProducts.filter(p => isRoutingProductById(p));
    
    // Sort routing products in the same order as the UI to ensure consistent first/additional logic
    // Use centralized category mapping for maintainability
    const routingOrder = PRODUCT_IDS_BY_CATEGORY.routing; // Include all routing products in order
    const sortedRoutingProducts = routingProducts.sort((a, b) => {
      const aIndex = routingOrder.indexOf(a as typeof routingOrder[number]);
      const bIndex = routingOrder.indexOf(b as typeof routingOrder[number]);
      return aIndex - bIndex;
    });
    
    const routingIndex = sortedRoutingProducts.indexOf(product);
    if (routingIndex === 0) {
      hours = 15; // First routing product
    } else {
      hours = 5; // Additional routing products
    }
  } else if (isFormsProductById(product)) {
    hours = 10; // Base BookIt for Forms hours
  } else if (product === '159b4183-ee40-4255-a7d0-968b1482e451') { // BookIt Handoff with SmartRep
    // Only add hours if BookIt for Forms is also selected
    if (allProducts.some(p => isFormsProductById(p))) {
      hours = 5;
    }
  } else if (isNoCostProductById(product)) {
    hours = 1; // No-cost items, but count hours
  }
  
  return hours;
}

/**
 * Business rules documentation for reference
 */
export const HOURS_CALCULATION_RULES = {
  routing: {
    first: 15,
    additional: 5,
    description: "Routing products: First = 15 hours, Additional = 5 hours each"
  },
  leadToAccount: {
    hours: 15,
    condition: "only if single product",
    description: "Lead to Account Matching: 15 hours (only if single product)"
  },
  bookitForms: {
    hours: 10,
    description: "Forms products: 10 hours"
  },
  bookitHandoffWithSmartrep: {
    hours: 5,
    condition: "requires Forms products",
    description: "Handoff products (with Smartrep): 5 hours (requires Forms products)"
  },
  bookitLinks: {
    hours: 1,
    description: "Links/Handoff products (without Smartrep): 1 hour each"
  },
  userGroups: {
    hoursPerGroup: 5,
    unitsPerGroup: 50,
    description: "User groups: 5 hours per 50 users/endpoints"
  },
  projectManager: {
    percentage: 45,
    minimum: 10,
    description: "Project Manager: 45% of total hours (minimum 10)"
  }
} as const;
