import { describe, it, expect } from 'vitest';
import { STANDARD_CLIENT_ROLES, mergeStandardClientRoles } from './standard-client-roles';
import type { ClientRole } from '@/types/sow';

describe('STANDARD_CLIENT_ROLES', () => {
  it('has the seven slots, in order, with empty name/email and canned responsibilities', () => {
    expect(STANDARD_CLIENT_ROLES.map(r => r.role)).toEqual([
      'Executive Sponsor',
      'Project Manager',
      'LeanData Administrator',
      'Owner of Business Requirements',
      'SFDC System Team Point of Contact',
      'MAP Administrator',
      'Web Developer',
    ]);
    STANDARD_CLIENT_ROLES.forEach(r => {
      expect(r.name).toBe('');
      expect(r.email).toBe('');
      expect(r.responsibilities.length).toBeGreaterThan(0);
    });
  });

  it('includes the scheduling-project roles', () => {
    const names = STANDARD_CLIENT_ROLES.map(r => r.role);
    expect(names).toContain('MAP Administrator');
    expect(names).toContain('Web Developer');
    expect(names.indexOf('MAP Administrator')).toBeGreaterThan(names.indexOf('SFDC System Team Point of Contact'));
  });
});

describe('mergeStandardClientRoles', () => {
  it('returns all 7 standard slots in order when existing is empty', () => {
    const result = mergeStandardClientRoles([]);
    expect(result.map(r => r.role)).toEqual(STANDARD_CLIENT_ROLES.map(r => r.role));
  });

  it('adds only the missing standard slots when some already exist, matching case-insensitively on trimmed role', () => {
    const existing: ClientRole[] = [
      { role: '  executive sponsor  ', name: 'Jane Doe', email: 'jane@customer.com', responsibilities: 'Custom text' },
      { role: 'Some Custom Role', name: 'Bob', email: 'bob@customer.com', responsibilities: 'Does custom stuff' },
    ];

    const result = mergeStandardClientRoles(existing);

    // Existing entries untouched, in place, at the front.
    expect(result[0]).toEqual(existing[0]);
    expect(result[1]).toEqual(existing[1]);

    // Only the 6 missing standard slots were appended.
    expect(result.length).toBe(existing.length + 6);
    const appendedRoles = result.slice(existing.length).map(r => r.role);
    expect(appendedRoles).toEqual([
      'Project Manager',
      'LeanData Administrator',
      'Owner of Business Requirements',
      'SFDC System Team Point of Contact',
      'MAP Administrator',
      'Web Developer',
    ]);
  });

  it('returns the same array reference when all 7 standard slots are already present', () => {
    const existing: ClientRole[] = STANDARD_CLIENT_ROLES.map(r => ({ ...r, name: 'Someone' }));
    const result = mergeStandardClientRoles(existing);
    expect(result).toBe(existing);
  });

  it('never removes or reorders existing entries', () => {
    const existing: ClientRole[] = [
      { role: 'Owner of Business Requirements', name: 'Sam', email: 's@c.com', responsibilities: 'x' },
      { role: 'Random Role', name: '', email: '', responsibilities: '' },
      { role: 'Executive Sponsor', name: 'Sue', email: 'sue@c.com', responsibilities: 'y' },
    ];
    const result = mergeStandardClientRoles(existing);
    expect(result[0]).toEqual(existing[0]);
    expect(result[1]).toEqual(existing[1]);
    expect(result[2]).toEqual(existing[2]);
  });
});
