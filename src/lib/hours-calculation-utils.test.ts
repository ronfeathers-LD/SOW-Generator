import { describe, expect, it } from 'vitest';
import { DEFAULT_SEGMENT_RULES, rowsToRulesMap } from './segment-rules';
import { calculateAccountSegmentHours, calculateAllHours, shouldAddProjectManager } from './hours-calculation-utils';
import { PRODUCT_IDS_BY_CATEGORY } from './constants/products';

const [LEAD_ROUTING, CONTACT_ROUTING, ACCOUNT_ROUTING] = PRODUCT_IDS_BY_CATEGORY.routing;
const [BOOKIT_FORMS, BOOKIT_LINKS, BOOKIT_HANDOFF_SMARTREP] = PRODUCT_IDS_BY_CATEGORY.bookit;

describe('calculateAccountSegmentHours', () => {
  it('preserves legacy behavior at default rules', () => {
    expect(calculateAccountSegmentHours('MM', DEFAULT_SEGMENT_RULES)).toBe(5);
    expect(calculateAccountSegmentHours('MidMarket', DEFAULT_SEGMENT_RULES)).toBe(5);
    expect(calculateAccountSegmentHours('LE', DEFAULT_SEGMENT_RULES)).toBe(0);
    expect(calculateAccountSegmentHours('EE', DEFAULT_SEGMENT_RULES)).toBe(0);
    expect(calculateAccountSegmentHours('EC', DEFAULT_SEGMENT_RULES)).toBe(0);
    expect(calculateAccountSegmentHours(undefined, DEFAULT_SEGMENT_RULES)).toBe(0);
  });

  it('is genuinely config-driven: a changed rule changes the result', () => {
    const custom = rowsToRulesMap([
      { segment: 'MM', display_name: 'Mid-Market', pm_removal_self_serve: false, extra_hours: 10 },
    ]);
    expect(calculateAccountSegmentHours('MM', custom)).toBe(10);
  });
});

describe('calculateAllHours', () => {
  it('includes segment hours in baseProjectHours', () => {
    const result = calculateAllHours({}, 'MM', DEFAULT_SEGMENT_RULES);
    expect(result.accountSegmentHours).toBe(5);
    expect(result.baseProjectHours).toBe(5); // empty template: only the segment bump
  });

  it('gives zero segment hours for enterprise segments', () => {
    const result = calculateAllHours({}, 'LE', DEFAULT_SEGMENT_RULES);
    expect(result.accountSegmentHours).toBe(0);
  });
});

describe('shouldAddProjectManager', () => {
  // Regression coverage for the GWI incident: BookIt Links must be excluded from
  // the product count via the UUID helper (isLinksProductById), not the
  // PRODUCT_IDS slug map — template.products holds UUIDs, so a slug comparison
  // is a permanent no-op and silently counts Links toward the 3-product threshold.
  it('excludes BookIt Links from the product count: 3 products incl. Links → false', () => {
    const template = { products: [BOOKIT_FORMS, BOOKIT_LINKS, BOOKIT_HANDOFF_SMARTREP] };
    expect(shouldAddProjectManager(template)).toBe(false);
  });

  it('3 non-Links products → true', () => {
    const template = { products: [LEAD_ROUTING, CONTACT_ROUTING, ACCOUNT_ROUTING] };
    expect(shouldAddProjectManager(template)).toBe(true);
  });

  it('2 products with 200+ units → true', () => {
    const template = { products: [LEAD_ROUTING, CONTACT_ROUTING], orchestration_units: '200' };
    expect(shouldAddProjectManager(template)).toBe(true);
  });

  it('2 products with <200 units → false', () => {
    const template = { products: [LEAD_ROUTING, CONTACT_ROUTING], orchestration_units: '50' };
    expect(shouldAddProjectManager(template)).toBe(false);
  });
});
