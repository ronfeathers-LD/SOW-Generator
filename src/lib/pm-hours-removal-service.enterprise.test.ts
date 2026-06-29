import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PMHoursRemovalService } from './pm-hours-removal-service';

interface PricingRole {
  role: string;
  totalHours: number;
  ratePerHour: number;
}

/**
 * Minimal mock of the query chains disablePMHoursRequirementDirect uses:
 *   from('sows').select('pricing_roles').eq('id', sowId).single()
 *   from('sows').update(payload).eq('id', sowId)
 *   from('pm_hours_audit_log').insert(row)
 *
 * Captures the update payload written to `sows` so the test can assert the
 * suppression flag and stripped pricing are persisted.
 */
function makeMockClient(pricingRoles: unknown) {
  const captured: { sowUpdate?: Record<string, unknown>; auditRow?: Record<string, unknown> } = {};

  const client = {
    from(table: string) {
      if (table === 'sows') {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    return { data: { pricing_roles: pricingRoles }, error: null };
                  },
                };
              },
            };
          },
          update(payload: Record<string, unknown>) {
            captured.sowUpdate = payload;
            return {
              async eq() {
                return { error: null };
              },
            };
          },
        };
      }
      if (table === 'pm_hours_audit_log') {
        return {
          async insert(row: Record<string, unknown>) {
            captured.auditRow = row;
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  return { client, captured };
}

describe('PMHoursRemovalService.disablePMHoursRequirementDirect (enterprise self-serve)', () => {
  const pricingWithPM = {
    roles: [
      { role: 'Onboarding Specialist', totalHours: 100, ratePerHour: 250 } as PricingRole,
      { role: 'Project Manager', totalHours: 40, ratePerHour: 250 } as PricingRole,
    ],
    discount_type: 'none',
  };

  it('persists the suppression flag so the removal survives a reload', async () => {
    const { client, captured } = makeMockClient(pricingWithPM);

    const result = await PMHoursRemovalService.disablePMHoursRequirementDirect(
      'sow-123',
      'user-456',
      client
    );

    expect(result.success).toBe(true);
    expect(captured.sowUpdate?.pm_hours_requirement_disabled).toBe(true);
  });

  it('strips the Project Manager role from the persisted pricing_roles', async () => {
    const { client, captured } = makeMockClient(pricingWithPM);

    await PMHoursRemovalService.disablePMHoursRequirementDirect('sow-123', 'user-456', client);

    const persisted = captured.sowUpdate?.pricing_roles as { roles: PricingRole[] };
    const roleNames = persisted.roles.map(r => r.role);
    expect(roleNames).not.toContain('Project Manager');
    expect(roleNames).toContain('Onboarding Specialist');
  });

  it('reports the number of PM hours that were removed', async () => {
    const { client, captured } = makeMockClient(pricingWithPM);

    const result = await PMHoursRemovalService.disablePMHoursRequirementDirect(
      'sow-123',
      'user-456',
      client
    );

    expect(result.pmHoursRemoved).toBe(40);
    expect(captured.sowUpdate?.pm_hours_removed).toBe(40);
  });
});
