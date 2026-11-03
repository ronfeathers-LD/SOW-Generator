import { describe, it, expect } from 'vitest';
import { describeRequiredApprovals } from './approval-workflow-rules';

describe('describeRequiredApprovals', () => {
  it('says no PMO review is needed when the SOW has no Project Manager hours', () => {
    const line = describeRequiredApprovals({
      pricing_roles: { roles: [{ role: 'Onboarding Specialist', totalHours: 30 }] },
    });
    expect(line).toBe('Professional Services, Sr. Leadership. No PMO review needed (no Project Manager hours).');
  });

  it('names the PMO stage when the SOW has Project Manager hours', () => {
    const line = describeRequiredApprovals({
      pricing_roles: [
        { role: 'Onboarding Specialist', totalHours: 40 },
        { role: 'Project Manager', totalHours: '12' },
      ],
    });
    expect(line).toBe('Professional Services, Project Management (PMO), Sr. Leadership');
  });

  it('treats a zero-hour Project Manager row as no PMO review', () => {
    const line = describeRequiredApprovals({
      pricing_roles: [{ role: 'Project Manager', totalHours: 0 }],
    });
    expect(line).toContain('No PMO review needed');
  });
});
