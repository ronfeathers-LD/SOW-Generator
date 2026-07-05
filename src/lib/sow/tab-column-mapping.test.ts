import { describe, expect, it } from 'vitest';
import { buildTabColumnUpdate } from './tab-column-mapping';

describe('buildTabColumnUpdate — Billing Information — payment_terms', () => {
  it('maps top-level payment_terms onto the sows.payment_terms column', () => {
    const result = buildTabColumnUpdate(
      'Billing Information',
      { payment_terms: 'Net 30' },
      {},
    );
    expect(result.payment_terms).toBe('Net 30');
  });

  it('omits payment_terms from the update when not present in the payload', () => {
    const result = buildTabColumnUpdate(
      'Billing Information',
      { template: { billing_company_name: 'Acme Co' } },
      {},
    );
    expect(result).not.toHaveProperty('payment_terms');
  });

  it('maps payment_terms alongside the billing_info JSONB merge without interference', () => {
    const result = buildTabColumnUpdate(
      'Billing Information',
      {
        template: {
          billing_contact_name: 'Jane Doe',
          purchase_order_number: 'PO-123',
        },
        payment_terms: 'Due upon receipt',
      },
      { billing_info: { billing_email: 'existing@example.com' } },
    );

    expect(result.payment_terms).toBe('Due upon receipt');
    expect(result.billing_info).toMatchObject({
      billing_contact: 'Jane Doe',
      po_number: 'PO-123',
      billing_email: 'existing@example.com',
    });
  });

  it('passes an empty-string payment_terms through (explicit clear, not dropped)', () => {
    const result = buildTabColumnUpdate(
      'Billing Information',
      { payment_terms: '' },
      {},
    );
    expect(result.payment_terms).toBe('');
  });
});
