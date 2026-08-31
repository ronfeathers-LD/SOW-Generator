import { describe, it, expect } from 'vitest';
import { validateSOWForApproval } from './validation-utils';

/**
 * A blank customer signer must not block submission (approvers are warned
 * instead — see @/lib/sow/signer-status). The LeanData signatory stays required.
 */
describe('validateSOWForApproval — customer signer is not a gate', () => {
  it('does not report a blank customer signer as missing', () => {
    const { missingFields } = validateSOWForApproval({
      client_signer_name: '',
      template: { customer_signature: '' },
    });
    expect(missingFields).not.toContain('Customer Signer');
    expect(missingFields).not.toContain('Customer Signer Title');
  });

  it('does not report a filled customer signer either', () => {
    const { missingFields } = validateSOWForApproval({
      client_signer_name: 'Dana Reyes',
      template: { customer_signature: 'VP RevOps' },
    });
    expect(missingFields).not.toContain('Customer Signer');
  });

  it('still requires the LeanData signatory', () => {
    expect(
      validateSOWForApproval({ template: { lean_data_name: 'None Selected' } }).missingFields
    ).toContain('LeanData Signatory');
    expect(
      validateSOWForApproval({ template: { lean_data_name: 'Ron Feathers' } }).missingFields
    ).not.toContain('LeanData Signatory');
  });
});
