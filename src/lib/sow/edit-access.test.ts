import { describe, it, expect } from 'vitest';
import {
  resolveRestrictedTab,
  canEditSigners,
  resolveEditAccess,
} from './edit-access';

describe('resolveRestrictedTab', () => {
  it('maps the pricing param', () => {
    expect(resolveRestrictedTab('pricing')).toBe('Pricing');
  });
  it('maps the signers param', () => {
    expect(resolveRestrictedTab('signers')).toBe('Signers & Roles');
  });
  it('returns null for anything else', () => {
    expect(resolveRestrictedTab(undefined)).toBeNull();
    expect(resolveRestrictedTab(null)).toBeNull();
    expect(resolveRestrictedTab('objectives')).toBeNull();
  });
});

describe('canEditSigners', () => {
  it('allows the author regardless of role', () => {
    expect(canEditSigners({ role: 'user', isAuthor: true })).toBe(true);
  });
  it('allows elevated roles', () => {
    expect(canEditSigners({ role: 'admin', isAuthor: false })).toBe(true);
    expect(canEditSigners({ role: 'manager', isAuthor: false })).toBe(true);
    expect(canEditSigners({ role: 'pmo', isAuthor: false })).toBe(true);
  });
  it('denies a non-author plain user', () => {
    expect(canEditSigners({ role: 'user', isAuthor: false })).toBe(false);
    expect(canEditSigners({ role: null, isAuthor: false })).toBe(false);
  });
});

describe('resolveEditAccess', () => {
  it('opens normally (full form) for non-locked statuses', () => {
    expect(
      resolveEditAccess({ status: 'draft', requestedTab: null, role: 'user', isAuthor: true }),
    ).toEqual({ allowed: true, formRestrictedTab: null });
    expect(
      resolveEditAccess({ status: 'in_review', requestedTab: null, role: 'user', isAuthor: true }),
    ).toEqual({ allowed: true, formRestrictedTab: null });
  });

  // Pricing behavior must be preserved exactly.
  it('lets an admin into pricing-only mode on an approved SOW', () => {
    expect(
      resolveEditAccess({ status: 'approved', requestedTab: 'Pricing', role: 'admin', isAuthor: false }),
    ).toEqual({ allowed: true, formRestrictedTab: 'Pricing' });
  });
  it('blocks a non-admin from pricing on an approved SOW', () => {
    expect(
      resolveEditAccess({ status: 'approved', requestedTab: 'Pricing', role: 'manager', isAuthor: true }),
    ).toEqual({ allowed: false, formRestrictedTab: null });
  });
  it('blocks an approved SOW opened with no restricted tab', () => {
    expect(
      resolveEditAccess({ status: 'approved', requestedTab: null, role: 'admin', isAuthor: true }),
    ).toEqual({ allowed: false, formRestrictedTab: null });
  });

  // New signers behavior.
  it('lets the author into signers-only mode on an approved SOW', () => {
    expect(
      resolveEditAccess({ status: 'approved', requestedTab: 'Signers & Roles', role: 'user', isAuthor: true }),
    ).toEqual({ allowed: true, formRestrictedTab: 'Signers & Roles' });
  });
  it('lets an elevated non-author into signers-only mode', () => {
    expect(
      resolveEditAccess({ status: 'approved', requestedTab: 'Signers & Roles', role: 'pmo', isAuthor: false }),
    ).toEqual({ allowed: true, formRestrictedTab: 'Signers & Roles' });
  });
  it('blocks a non-author plain user from signers on an approved SOW', () => {
    expect(
      resolveEditAccess({ status: 'approved', requestedTab: 'Signers & Roles', role: 'user', isAuthor: false }),
    ).toEqual({ allowed: false, formRestrictedTab: null });
  });

  // Rejected: preserve current semantics — admin+pricing gets in but form is NOT
  // restricted (formRestrictedTab is null unless status is exactly 'approved').
  it('admin+pricing on a rejected SOW is allowed but not restricted', () => {
    expect(
      resolveEditAccess({ status: 'rejected', requestedTab: 'Pricing', role: 'admin', isAuthor: false }),
    ).toEqual({ allowed: true, formRestrictedTab: null });
  });
  it('signers on a rejected SOW is allowed but not restricted', () => {
    expect(
      resolveEditAccess({ status: 'rejected', requestedTab: 'Signers & Roles', role: 'user', isAuthor: true }),
    ).toEqual({ allowed: true, formRestrictedTab: null });
  });
});
