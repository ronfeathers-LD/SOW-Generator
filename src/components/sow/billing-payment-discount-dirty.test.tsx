// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BillingPaymentTab from './BillingPaymentTab';
import type { SOWData } from '@/types/sow';

// Mount-time deps of PricingRolesAndDiscount (and BillingPaymentTab itself) — stub
// so the discount UI renders without needing real network/config data.
vi.mock('@/lib/pricing-roles-config', () => ({
  getPricingRolesConfig: vi.fn().mockResolvedValue([]),
  getDefaultRateForRole: vi.fn().mockReturnValue(250),
  getDescriptionForRole: vi.fn().mockReturnValue(''),
}));

vi.mock('@/lib/segment-rules', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/segment-rules')>();
  return {
    ...actual,
    fetchSegmentRules: vi.fn().mockResolvedValue(actual.DEFAULT_SEGMENT_RULES),
  };
});

// PricingRolesAndDiscount's PM-hours-status check hits /api/pm-hours-removal on
// mount; a rejected/falsy response makes it a no-op for this test.
global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setNativeInputValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function setNativeSelectValue(el: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('BillingPaymentTab discount edits mark the form dirty', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('writes discount edits through to formData.pricing and marks dirty', async () => {
    const setFormData = vi.fn();
    const formData: Partial<SOWData> = {
      id: 'sow-1',
      pricing: {
        roles: [
          { role: 'Onboarding Specialist', ratePerHour: 250, totalHours: 40 },
        ],
        billing: {
          company_name: 'Acme Inc',
          billing_contact: 'Jane Doe',
          billing_address: '123 Main St',
          billing_email: 'jane@acme.com',
          po_number: 'PO-1',
        },
        discount_type: 'none',
        discount_amount: null,
        discount_percentage: null,
      },
    };

    await act(async () => {
      root = createRoot(container);
      root.render(
        <BillingPaymentTab formData={formData} setFormData={setFormData} selectedAccount={null} />
      );
    });
    // Let mount-time async effects (getPricingRolesConfig, fetchSegmentRules, fetch)
    // settle before we start asserting on setFormData calls.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Mount-time write-backs (e.g. auto-calc) shouldn't pollute the discount-edit
    // assertions below.
    setFormData.mockClear();

    const select = container.querySelector('select');
    expect(select).not.toBeNull();

    act(() => {
      setNativeSelectValue(select as HTMLSelectElement, 'fixed');
    });

    const amountInput = container.querySelector('input[placeholder="0.00"]');
    expect(amountInput).not.toBeNull();

    act(() => {
      setNativeInputValue(amountInput as HTMLInputElement, '2500');
    });

    expect(setFormData).toHaveBeenCalled();

    const lastCall = setFormData.mock.calls[setFormData.mock.calls.length - 1];
    const [lastArg] = lastCall;
    expect(lastArg.pricing?.discount_type).toBe('fixed');
    expect(lastArg.pricing?.discount_amount).toBe(2500);

    for (const call of setFormData.mock.calls) {
      const options = call[1];
      expect(options === undefined || options.markDirty !== false).toBe(true);
    }
  });
});
