/**
 * Shared utility functions for calculating project hours
 * This centralizes all hours calculation logic to ensure consistency
 */

import { SOWTemplate } from '@/types/sow';

export interface HoursCalculationResult {
  productHours: number;
  userGroupHours: number;
  accountSegmentHours: number;
  baseProjectHours: number;
  pmHours: number;
  totalUnits: number;
  shouldAddProjectManager: boolean;
}

/**
 * Calculate hours for individual products based on business rules
 */
export function calculateProductHours(products: string[]): number {
  if (!products || products.length === 0) return 0;
  
  let totalHours = 0;
  
  // Routing products: first = 15 hours, additional = 5 hours each
  const routingProducts = products.filter((product: string) => 
    ['Lead Routing', 'Contact Routing', 'Account Routing', 'Opportunity Routing', 'Case Routing'].includes(product)
  );
  
  if (routingProducts.length > 0) {
    totalHours += 15 + (Math.max(0, routingProducts.length - 1) * 5);
  }
  
  // Lead to Account Matching: only if it's the only product (excluding BookIt Links)
  const productsExcludingBookItLinks = products.filter(product => product !== 'BookIt Links');
  if (products.includes('Lead to Account Matching') && productsExcludingBookItLinks.length === 1) {
    totalHours += 15;
  }
  
  // BookIt products
  if (products.includes('BookIt for Forms')) {
    totalHours += 10;
    if (products.includes('BookIt Handoff (with Smartrep)')) {
      totalHours += 5;
    }
  }
  
  if (products.includes('BookIt Links')) {
    totalHours += 1;
  }
  
  if (products.includes('BookIt Handoff (without Smartrep)')) {
    totalHours += 1;
  }
  
  return totalHours;
}

/**
 * Calculate user group hours (every 50 users/units adds 5 hours)
 */
export function calculateUserGroupHours(template: Partial<SOWTemplate>): number {
  // Helper function to safely parse units, handling text values
  const safeParseUnits = (value: string | undefined): number => {
    if (!value) return 0;
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
  };
  
  const totalUnits = safeParseUnits(template?.number_of_units) + 
                    safeParseUnits(template?.orchestration_units) + 
                    safeParseUnits(template?.bookit_forms_units) +
                    safeParseUnits(template?.bookit_links_units) +
                    safeParseUnits(template?.bookit_handoff_units);
  
  if (totalUnits >= 50) {
    return Math.floor(totalUnits / 50) * 5;
  }
  return 0;
}

/**
 * Calculate total units from template
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
  const bookitFormsUnits = safeParseUnits(template?.bookit_forms_units);
  const bookitLinksUnits = safeParseUnits(template?.bookit_links_units);
  const bookitHandoffUnits = safeParseUnits(template?.bookit_handoff_units);
  
  const total = orchestrationUnits + bookitFormsUnits + bookitLinksUnits + bookitHandoffUnits;
  
  
  return total;
}

/**
 * Calculate account segment hours
 * MM (MidMarket) accounts get 5 additional hours
 * Note: The actual field name in Salesforce is Segment__c, not Account_Segment__c
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
  const products = (template?.products || []).filter(product => product !== 'BookIt Links');
  const totalUnits = calculateTotalUnits(template);
  return products.length >= 3 || totalUnits >= 200;
}

/**
 * Calculate hours for a specific product (used in PricingCalculator)
 */
export function calculateProductHoursForProduct(product: string, allProducts: string[]): number {
  let hours = 0;
  
  if (product === 'Lead to Account Matching') {
    // Only count if it's the only product
    if (allProducts.length === 1) {
      hours = 15;
    }
  } else if (['Lead Routing', 'Contact Routing', 'Account Routing', 'Opportunity Routing', 'Case Routing'].includes(product)) {
    // Routing products: first = 15 hours, additional = 5 hours each
    const routingProducts = allProducts.filter(p => 
      ['Lead Routing', 'Contact Routing', 'Account Routing', 'Opportunity Routing', 'Case Routing'].includes(p)
    );
    const routingIndex = routingProducts.indexOf(product);
    if (routingIndex === 0) {
      hours = 15; // First routing product
    } else {
      hours = 5; // Additional routing products
    }
  } else if (product === 'BookIt for Forms') {
    hours = 10; // Base BookIt for Forms hours
  } else if (product === 'BookIt Handoff (with Smartrep)') {
    // Only add hours if BookIt for Forms is also selected
    if (allProducts.includes('BookIt for Forms')) {
      hours = 5;
    }
  } else if (['BookIt Links', 'BookIt Handoff (without Smartrep)'].includes(product)) {
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
    description: "BookIt for Forms: 10 hours"
  },
  bookitHandoffWithSmartrep: {
    hours: 5,
    condition: "requires BookIt for Forms",
    description: "BookIt Handoff (with Smartrep): 5 hours (requires BookIt for Forms)"
  },
  bookitLinks: {
    hours: 1,
    description: "BookIt Links/Handoff (without Smartrep): 1 hour each"
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
