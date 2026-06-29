import { describe, it, expect } from 'vitest';
import { classifySow } from './backfill-pm-consistency';

describe('classifySow', () => {
  it('flags an EE SOW where PM was removed but OS still carries the deduction', () => {
    const sow = {
      account_segment: 'EE',
      pm_hours_requirement_disabled: false,
      products: ['b1f01145-94a9-4000-9f89-59555afedf03','f59381c7-40b4-4def-b83f-053a2b6e48bd','6dde4839-6d67-4821-a7c7-18c227ffcc93','159b4183-ee40-4255-a7d0-968b1482e451'],
      orchestration_units: '19', bookit_forms_units: '19', bookit_handoff_units: '19',
      pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 27, ratePerHour: 250 }], discount_type: 'none' },
    };
    const r = classifySow(sow);
    expect(r.action).toBe('restore-os-set-flag');
    expect(r.osTarget).toBe(35);
  });

  it('leaves a consistent SOW alone', () => {
    const sow = { account_segment: 'EE', pm_hours_requirement_disabled: true, products: [], pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 35, ratePerHour: 250 }] } };
    expect(classifySow(sow).action).toBe('none');
  });

  it('leaves alone a SOW where OS hours are already at base (clean removal)', () => {
    // PM removed, flag not set, but OS was already restored to full base → no issue
    const sow = {
      account_segment: 'EE',
      pm_hours_requirement_disabled: false,
      products: ['b1f01145-94a9-4000-9f89-59555afedf03','f59381c7-40b4-4def-b83f-053a2b6e48bd','6dde4839-6d67-4821-a7c7-18c227ffcc93','159b4183-ee40-4255-a7d0-968b1482e451'],
      orchestration_units: '19', bookit_forms_units: '19', bookit_handoff_units: '19',
      pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 35, ratePerHour: 250 }], discount_type: 'none' },
    };
    expect(classifySow(sow).action).toBe('none');
  });

  it('leaves alone a SOW that has a PM row (PM not removed)', () => {
    const sow = {
      account_segment: 'EE',
      pm_hours_requirement_disabled: false,
      products: ['b1f01145-94a9-4000-9f89-59555afedf03','f59381c7-40b4-4def-b83f-053a2b6e48bd','6dde4839-6d67-4821-a7c7-18c227ffcc93','159b4183-ee40-4255-a7d0-968b1482e451'],
      orchestration_units: '19', bookit_forms_units: '19', bookit_handoff_units: '19',
      pricing_roles: { roles: [
        { role: 'Onboarding Specialist', totalHours: 27, ratePerHour: 250 },
        { role: 'Project Manager', totalHours: 16, ratePerHour: 250 },
      ], discount_type: 'none' },
    };
    expect(classifySow(sow).action).toBe('none');
  });

  it('leaves alone a SOW that does not require PM (fewer than 3 products)', () => {
    const sow = {
      account_segment: 'EE',
      pm_hours_requirement_disabled: false,
      products: ['b1f01145-94a9-4000-9f89-59555afedf03', '6dde4839-6d67-4821-a7c7-18c227ffcc93'],
      orchestration_units: '10',
      pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 20, ratePerHour: 250 }], discount_type: 'none' },
    };
    expect(classifySow(sow).action).toBe('none');
  });

  it('computes pmHoursRemoved correctly as (base - currentOsHours) * 2', () => {
    // base = 35, currentOsHours = 27 → pmHoursRemoved = 16
    const sow = {
      account_segment: 'EE',
      pm_hours_requirement_disabled: false,
      products: ['b1f01145-94a9-4000-9f89-59555afedf03','f59381c7-40b4-4def-b83f-053a2b6e48bd','6dde4839-6d67-4821-a7c7-18c227ffcc93','159b4183-ee40-4255-a7d0-968b1482e451'],
      orchestration_units: '19', bookit_forms_units: '19', bookit_handoff_units: '19',
      pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 27, ratePerHour: 250 }], discount_type: 'none' },
    };
    const r = classifySow(sow);
    expect(r.pmHoursRemoved).toBe(16);
  });

  // --- False-positive guard: empty / no-OS pricing should never be flagged ---

  it('leaves alone a SOW with completely empty pricing_roles (no roles array)', () => {
    // Anthropic / TimeScaleDB pattern: pricing never entered → pricing_roles is
    // empty or null.  OS hours resolve to 0 which is < base, but that is NOT a
    // stranded deduction — there is no OS row to restore.
    const sow = {
      account_segment: 'EE',
      pm_hours_requirement_disabled: false,
      products: ['b1f01145-94a9-4000-9f89-59555afedf03','f59381c7-40b4-4def-b83f-053a2b6e48bd','6dde4839-6d67-4821-a7c7-18c227ffcc93','159b4183-ee40-4255-a7d0-968b1482e451'],
      orchestration_units: '19', bookit_forms_units: '19', bookit_handoff_units: '19',
      pricing_roles: { roles: [], discount_type: 'none' },
    };
    expect(classifySow(sow).action).toBe('none');
  });

  it('leaves alone a SOW where pricing has roles but no Onboarding Specialist row', () => {
    // Roles were entered but OS was never added.  Missing OS → OS hours = 0,
    // not a stranded deduction.
    const sow = {
      account_segment: 'EE',
      pm_hours_requirement_disabled: false,
      products: ['b1f01145-94a9-4000-9f89-59555afedf03','f59381c7-40b4-4def-b83f-053a2b6e48bd','6dde4839-6d67-4821-a7c7-18c227ffcc93','159b4183-ee40-4255-a7d0-968b1482e451'],
      orchestration_units: '19', bookit_forms_units: '19', bookit_handoff_units: '19',
      pricing_roles: { roles: [{ role: 'Implementation Engineer', totalHours: 20, ratePerHour: 200 }], discount_type: 'none' },
    };
    expect(classifySow(sow).action).toBe('none');
  });

  it('leaves alone a SOW where the Onboarding Specialist row has 0 hours', () => {
    // OS row present but hours = 0 is not a valid stranded deduction.
    const sow = {
      account_segment: 'EE',
      pm_hours_requirement_disabled: false,
      products: ['b1f01145-94a9-4000-9f89-59555afedf03','f59381c7-40b4-4def-b83f-053a2b6e48bd','6dde4839-6d67-4821-a7c7-18c227ffcc93','159b4183-ee40-4255-a7d0-968b1482e451'],
      orchestration_units: '19', bookit_forms_units: '19', bookit_handoff_units: '19',
      pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 0, ratePerHour: 250 }], discount_type: 'none' },
    };
    expect(classifySow(sow).action).toBe('none');
  });
});
