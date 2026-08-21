import { describe, it, expect } from 'vitest';
import { applyCalculatedHours, type CalculatedPricingRole } from './apply-calculated-hours';
import { calculateAllHours } from '@/lib/hours-calculation-utils';
import { DEFAULT_SEGMENT_RULES } from '@/lib/segment-rules';
import { PRODUCT_IDS_BY_CATEGORY } from '@/lib/constants/products';

const [BOOKIT_FORMS, BOOKIT_LINKS, BOOKIT_HANDOFF_SMARTREP] = PRODUCT_IDS_BY_CATEGORY.bookit;

const makeRole = (
  over: Partial<CalculatedPricingRole> & Pick<CalculatedPricingRole, 'id' | 'role'>
): CalculatedPricingRole => ({
  ratePerHour: 250,
  defaultRate: 250,
  totalHours: 0,
  totalCost: 0,
  ...over,
});

// Deterministic id generator so assertions on the newly-created row don't have
// to special-case a random id.
let idCounter = 0;
const testGenerateId = () => `generated-${++idCounter}`;

describe('applyCalculatedHours', () => {
  it('warranted PM + no existing PM row: OS deducted AND a PM row is added with pmHours', () => {
    const result = applyCalculatedHours({
      roles: [],
      baseProjectHours: 40,
      pmHours: 18,
      shouldAddProjectManager: true,
      pmRemoval: {},
      pricingRolesConfig: [],
      generateId: testGenerateId,
    });

    const os = result.find(r => r.role === 'Onboarding Specialist')!;
    const pm = result.find(r => r.role === 'Project Manager')!;
    expect(os).toBeDefined();
    expect(pm).toBeDefined();
    expect(os.totalHours).toBe(40 - 18 / 2); // 31
    expect(pm.totalHours).toBe(18);
    expect(pm.totalCost).toBe(pm.ratePerHour * 18);
  });

  it('warranted PM + existing PM row with a custom rate: hours updated, custom rate preserved', () => {
    const roles: CalculatedPricingRole[] = [
      makeRole({ id: 'os', role: 'Onboarding Specialist', totalHours: 10, ratePerHour: 275, totalCost: 2750 }),
      makeRole({ id: 'pm', role: 'Project Manager', totalHours: 5, ratePerHour: 300, totalCost: 1500 }),
    ];

    const result = applyCalculatedHours({
      roles,
      baseProjectHours: 40,
      pmHours: 18,
      shouldAddProjectManager: true,
      pmRemoval: {},
      pricingRolesConfig: [],
      generateId: testGenerateId,
    });

    const os = result.find(r => r.role === 'Onboarding Specialist')!;
    const pm = result.find(r => r.role === 'Project Manager')!;
    expect(os.ratePerHour).toBe(275); // custom rate preserved
    expect(os.totalHours).toBe(31);
    expect(pm.ratePerHour).toBe(300); // custom rate preserved
    expect(pm.totalHours).toBe(18);
    expect(pm.totalCost).toBe(300 * 18);
    expect(result).toHaveLength(2); // no duplicate PM row added
  });

  it('PM removed via pm_hours_requirement_disabled: OS gets full base, no deduction, existing PM row untouched', () => {
    const roles: CalculatedPricingRole[] = [
      makeRole({ id: 'os', role: 'Onboarding Specialist', totalHours: 10, totalCost: 2500 }),
    ];

    const result = applyCalculatedHours({
      roles,
      baseProjectHours: 40,
      pmHours: 18,
      shouldAddProjectManager: true,
      pmRemoval: { pm_hours_requirement_disabled: true },
      pricingRolesConfig: [],
      generateId: testGenerateId,
    });

    const os = result.find(r => r.role === 'Onboarding Specialist')!;
    expect(os.totalHours).toBe(40);
    expect(result.some(r => r.role === 'Project Manager')).toBe(false);
  });

  it('PM removed via pm_hours_removal_approved (no requirement-disabled flag yet): OS still gets full base', () => {
    const result = applyCalculatedHours({
      roles: [],
      baseProjectHours: 40,
      pmHours: 18,
      shouldAddProjectManager: true,
      pmRemoval: { pm_hours_removal_approved: true },
      pricingRolesConfig: [],
      generateId: testGenerateId,
    });

    const os = result.find(r => r.role === 'Onboarding Specialist')!;
    expect(os.totalHours).toBe(40);
    expect(result.some(r => r.role === 'Project Manager')).toBe(false);
  });

  it('not warranted: OS gets full base, no PM row added', () => {
    const result = applyCalculatedHours({
      roles: [],
      baseProjectHours: 22,
      pmHours: 0,
      shouldAddProjectManager: false,
      pmRemoval: {},
      pricingRolesConfig: [],
      generateId: testGenerateId,
    });

    const os = result.find(r => r.role === 'Onboarding Specialist')!;
    expect(os.totalHours).toBe(22);
    expect(result.some(r => r.role === 'Project Manager')).toBe(false);
  });

  it('does not delete an existing PM row when PM is no longer warranted (removal is the explicit flow\'s job)', () => {
    const roles: CalculatedPricingRole[] = [
      makeRole({ id: 'os', role: 'Onboarding Specialist', totalHours: 22, totalCost: 5500 }),
      makeRole({ id: 'pm', role: 'Project Manager', totalHours: 18, totalCost: 4500 }),
    ];

    const result = applyCalculatedHours({
      roles,
      baseProjectHours: 22,
      pmHours: 0,
      shouldAddProjectManager: false,
      pmRemoval: {},
      pricingRolesConfig: [],
      generateId: testGenerateId,
    });

    // OS gets the full base (not warranted → no deduction applied), and the
    // PM row is left exactly as it was — this function never deletes roles.
    const os = result.find(r => r.role === 'Onboarding Specialist')!;
    const pm = result.find(r => r.role === 'Project Manager')!;
    expect(os.totalHours).toBe(22);
    expect(pm).toEqual(roles[1]);
  });

  it('preserves custom (non-PM/OS) roles untouched and in position', () => {
    const roles: CalculatedPricingRole[] = [
      makeRole({ id: 'tech', role: 'Technical Architect', totalHours: 12, ratePerHour: 300, totalCost: 3600 }),
      makeRole({ id: 'os', role: 'Onboarding Specialist', totalHours: 10, totalCost: 2500 }),
      makeRole({ id: 'ae', role: 'Account Executive', totalHours: 0, ratePerHour: 0, totalCost: 0 }),
    ];

    const result = applyCalculatedHours({
      roles,
      baseProjectHours: 40,
      pmHours: 18,
      shouldAddProjectManager: true,
      pmRemoval: {},
      pricingRolesConfig: [],
      generateId: testGenerateId,
    });

    expect(result[0]).toEqual(roles[0]); // Technical Architect untouched, still first
    expect(result.find(r => r.role === 'Account Executive')).toEqual(roles[2]);
    expect(result).toHaveLength(4); // + the newly-added PM row
  });

  // --- The invariant, checked directly -------------------------------------

  it('invariant: there is no output where OS < base and no PM row exists', () => {
    const baseProjectHours = 31;
    const pmHours = 14;

    const scenarios: Array<Parameters<typeof applyCalculatedHours>[0]> = [
      { roles: [], baseProjectHours, pmHours, shouldAddProjectManager: true, pmRemoval: {}, pricingRolesConfig: [] },
      { roles: [], baseProjectHours, pmHours, shouldAddProjectManager: true, pmRemoval: { pm_hours_requirement_disabled: true }, pricingRolesConfig: [] },
      { roles: [], baseProjectHours, pmHours, shouldAddProjectManager: true, pmRemoval: { pm_hours_removal_approved: true }, pricingRolesConfig: [] },
      { roles: [], baseProjectHours, pmHours, shouldAddProjectManager: true, pmRemoval: { pm_hours_removed: 14 }, pricingRolesConfig: [] },
      { roles: [], baseProjectHours: 22, pmHours: 0, shouldAddProjectManager: false, pmRemoval: {}, pricingRolesConfig: [] },
      {
        roles: [makeRole({ id: 'pm', role: 'Project Manager', totalHours: 14 })],
        baseProjectHours,
        pmHours,
        shouldAddProjectManager: true,
        pmRemoval: {},
        pricingRolesConfig: [],
      },
    ];

    for (const scenario of scenarios) {
      const result = applyCalculatedHours(scenario);
      const os = result.find(r => r.role === 'Onboarding Specialist');
      const hasPM = result.some(r => r.role === 'Project Manager');
      if (os && os.totalHours < scenario.baseProjectHours) {
        expect(hasPM).toBe(true);
      }
    }
  });

  // --- The exact GWI regression case ---------------------------------------

  it('GWI regression: Forms + Links + Handoff-with-SmartRep (UUIDs), 120 units, MM segment → OS 31, no PM row, total 31', () => {
    const template = {
      products: [BOOKIT_FORMS, BOOKIT_LINKS, BOOKIT_HANDOFF_SMARTREP],
      bookit_forms_units: '120',
      bookit_links_units: '120',
      bookit_handoff_units: '120',
    };

    const { baseProjectHours, pmHours, shouldAddProjectManager } = calculateAllHours(
      template,
      'MM',
      DEFAULT_SEGMENT_RULES
    );

    // Sanity-check the inputs match the production evidence before asserting
    // on applyCalculatedHours' output.
    expect(baseProjectHours).toBe(31);
    expect(shouldAddProjectManager).toBe(false); // Links correctly excluded post-fix

    const result = applyCalculatedHours({
      roles: [],
      baseProjectHours,
      pmHours,
      shouldAddProjectManager,
      pmRemoval: {},
      pricingRolesConfig: [],
      generateId: testGenerateId,
    });

    const os = result.find(r => r.role === 'Onboarding Specialist')!;
    expect(os.totalHours).toBe(31);
    expect(result.some(r => r.role === 'Project Manager')).toBe(false);
    expect(result.reduce((sum, r) => sum + r.totalHours, 0)).toBe(31);
  });
});
