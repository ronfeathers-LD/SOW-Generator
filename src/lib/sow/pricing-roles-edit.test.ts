import { describe, it, expect } from 'vitest';
import { removePmRoleRestoringOs } from './pricing-roles-edit';

interface Role {
  id: string;
  role: string;
  ratePerHour: number;
  defaultRate: number;
  totalHours: number;
  totalCost: number;
}

const makeRole = (over: Partial<Role> & Pick<Role, 'id' | 'role'>): Role => ({
  ratePerHour: 250,
  defaultRate: 250,
  totalHours: 0,
  totalCost: 0,
  ...over,
});

describe('removePmRoleRestoringOs', () => {
  it('removes the PM row and restores OS hours by pmHours/2 (mirrors server strip)', () => {
    const roles: Role[] = [
      makeRole({ id: 'os', role: 'Onboarding Specialist', totalHours: 27, totalCost: 27 * 250 }),
      makeRole({ id: 'pm', role: 'Project Manager', totalHours: 16, totalCost: 16 * 250 }),
    ];

    const result = removePmRoleRestoringOs(roles, 'pm');

    expect(result.find(r => r.role === 'Project Manager')).toBeUndefined();
    const os = result.find(r => r.role === 'Onboarding Specialist')!;
    // 27 + 16/2 = 35
    expect(os.totalHours).toBe(35);
    expect(os.totalCost).toBe(8750); // 35 * 250
  });

  it('removes the PM row even when there is no Onboarding Specialist row', () => {
    const roles: Role[] = [
      makeRole({ id: 'pm', role: 'Project Manager', totalHours: 16, totalCost: 16 * 250 }),
      makeRole({ id: 'tech', role: 'Technical Architect', totalHours: 10, totalCost: 10 * 300, ratePerHour: 300 }),
    ];

    const result = removePmRoleRestoringOs(roles, 'pm');

    expect(result.find(r => r.role === 'Project Manager')).toBeUndefined();
    expect(result).toHaveLength(1);
    // Non-OS rows are untouched.
    expect(result[0].totalHours).toBe(10);
    expect(result[0].totalCost).toBe(3000);
  });

  it('is a no-op when no PM row matches the given id', () => {
    const roles: Role[] = [
      makeRole({ id: 'os', role: 'Onboarding Specialist', totalHours: 35, totalCost: 35 * 250 }),
    ];

    const result = removePmRoleRestoringOs(roles, 'does-not-exist');

    expect(result).toHaveLength(1);
    expect(result[0].totalHours).toBe(35);
    expect(result[0].totalCost).toBe(8750);
  });
});
