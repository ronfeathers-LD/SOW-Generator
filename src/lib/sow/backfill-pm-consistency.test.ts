import { describe, it, expect } from 'vitest';
import { classifySow } from './backfill-pm-consistency';
import { DEFAULT_SEGMENT_RULES } from '@/lib/segment-rules';

describe('classifySow', () => {
  it('flags an EE SOW where PM was removed but OS still carries the deduction', () => {
    const sow = {
      account_segment: 'EE',
      pm_hours_requirement_disabled: false,
      products: ['b1f01145-94a9-4000-9f89-59555afedf03','f59381c7-40b4-4def-b83f-053a2b6e48bd','6dde4839-6d67-4821-a7c7-18c227ffcc93','159b4183-ee40-4255-a7d0-968b1482e451'],
      orchestration_units: '19', bookit_forms_units: '19', bookit_handoff_units: '19',
      pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 27, ratePerHour: 250 }], discount_type: 'none' },
    };
    const r = classifySow(sow, DEFAULT_SEGMENT_RULES);
    expect(r.action).toBe('restore-os-set-flag');
    expect(r.osTarget).toBe(35);
  });

  it('leaves a consistent SOW alone', () => {
    const sow = { account_segment: 'EE', pm_hours_requirement_disabled: true, products: [], pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 35, ratePerHour: 250 }] } };
    expect(classifySow(sow, DEFAULT_SEGMENT_RULES).action).toBe('none');
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
    expect(classifySow(sow, DEFAULT_SEGMENT_RULES).action).toBe('none');
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
    expect(classifySow(sow, DEFAULT_SEGMENT_RULES).action).toBe('none');
  });

  it('flags a stranded SOW even when PM is not currently warranted (sequencing-trap fix)', () => {
    // Only 2 products (fewer than the 3-product PM threshold) and few units, so
    // shouldAddProjectManager is false today. That must NOT exempt this SOW:
    // with no PM row, OS should always carry the full base regardless of
    // whether PM happens to be warranted right now. Gating this classifier on
    // shouldAddProjectManager is exactly what let the GWI-style SOWs (stranded
    // by the BookIt-Links product-count bug) freeze at the wrong number forever
    // once that bug was fixed and shouldAddProjectManager started correctly
    // returning false for them. Shape matches "Verato" from the production
    // scan (2 products, 15-ish units, stale deduction that predates a product
    // change — not tied to any pmHours the current mix could ever produce).
    const sow = {
      account_segment: 'EE',
      pm_hours_requirement_disabled: false,
      products: ['b1f01145-94a9-4000-9f89-59555afedf03', '6dde4839-6d67-4821-a7c7-18c227ffcc93'],
      orchestration_units: '10',
      pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 20, ratePerHour: 250 }], discount_type: 'none' },
    };
    const r = classifySow(sow, DEFAULT_SEGMENT_RULES);
    expect(r.action).toBe('restore-os-set-flag');
    expect(r.osTarget).toBe(25); // 15 (routing) + 10 (forms)
    expect(r.pmHoursRemoved).toBe(10); // (25 - 20) * 2 — a derived reporting figure, not a validation gate
  });

  it('flags a stranded SOW with a single product, never PM-eligible even under the old buggy rule (Branch-style)', () => {
    // Shape matches "Branch" from the production scan: 1 product, 50 units.
    // Never crossed the 3-product threshold under either the old (buggy) or
    // fixed shouldAddProjectManager, and never crosses 200 units. The
    // classifier must not require the deduction to correspond to any
    // plausible pmHours/2 for the current (or any past) product mix — a
    // below-base OS with no PM row is stranded regardless of why it got there.
    const sow = {
      account_segment: 'LE',
      pm_hours_requirement_disabled: false,
      products: ['6dde4839-6d67-4821-a7c7-18c227ffcc93'], // BookIt for Forms only
      bookit_forms_units: '50',
      pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 10, ratePerHour: 250 }], discount_type: 'none' },
    };
    const r = classifySow(sow, DEFAULT_SEGMENT_RULES);
    expect(r.action).toBe('restore-os-set-flag');
    expect(r.osTarget).toBe(15); // 10 (forms) + 5 (50-unit user group)
    expect(r.pmHoursRemoved).toBe(10); // (15 - 10) * 2 — again just a reporting figure
  });

  it('the exact GWI regression case: Forms + Links + Handoff-with-SmartRep, 120 units, MM segment', () => {
    // Production evidence: SOW dbe7bba9-39ce-43f5-bcb4-f141d6d71ffc v3. Before
    // the BookIt-Links product-count fix, this SOW's shouldAddProjectManager
    // evaluated to true (Links wasn't excluded), so the deduction was applied
    // (base 31, pmHours 14, OS = 31 - 7 = 24) but the PM row was never written.
    // Post-fix, shouldAddProjectManager now correctly evaluates to false for
    // these 2 real products — the classifier must still catch this as stranded.
    const sow = {
      account_segment: 'MM',
      pm_hours_requirement_disabled: false,
      products: [
        '6dde4839-6d67-4821-a7c7-18c227ffcc93', // BookIt for Forms
        'dbe57330-23a9-42bc-bef2-5bbfbcef4e09', // BookIt Links
        '159b4183-ee40-4255-a7d0-968b1482e451', // BookIt Handoff (with SmartRep)
      ],
      bookit_forms_units: '120', bookit_links_units: '120', bookit_handoff_units: '120',
      pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 24, ratePerHour: 250 }], discount_type: 'none' },
    };
    const r = classifySow(sow, DEFAULT_SEGMENT_RULES);
    expect(r.action).toBe('restore-os-set-flag');
    expect(r.osTarget).toBe(31);
    expect(r.pmHoursRemoved).toBe(14);
  });

  it('leaves alone a stranded-looking SOW when pricing_roles.auto_calculated is explicitly false (manual edit)', () => {
    // Confirmed against the production scan: "Canva" is exactly this shape —
    // auto_calculated: false, with a below-base OS deficit that matches no
    // valid pmHours/2 for any product mix. Without this guard it would have
    // been a false positive; the manual edit fully explains the deficit, so
    // it must not be flagged. Same base shape as the sequencing-trap case
    // above, but the pricing table was hand-edited since the last auto-calc.
    const sow = {
      account_segment: 'EE',
      pm_hours_requirement_disabled: false,
      products: ['b1f01145-94a9-4000-9f89-59555afedf03', '6dde4839-6d67-4821-a7c7-18c227ffcc93'],
      orchestration_units: '10',
      pricing_roles: {
        roles: [{ role: 'Onboarding Specialist', totalHours: 20, ratePerHour: 250 }],
        discount_type: 'none',
        auto_calculated: false,
      },
    };
    expect(classifySow(sow, DEFAULT_SEGMENT_RULES).action).toBe('none');
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
    const r = classifySow(sow, DEFAULT_SEGMENT_RULES);
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
    expect(classifySow(sow, DEFAULT_SEGMENT_RULES).action).toBe('none');
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
    expect(classifySow(sow, DEFAULT_SEGMENT_RULES).action).toBe('none');
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
    expect(classifySow(sow, DEFAULT_SEGMENT_RULES).action).toBe('none');
  });
});
