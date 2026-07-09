import { describe, expect, it } from 'vitest';
import { mapApiResponseToSOWData, SowApiResponse } from './map-api-response';

// Minimal API response: only the fields the mapper reads. Cast keeps the test
// honest about what we assert without fabricating the full API response shape.
function responseWith(overrides: Record<string, unknown>): SowApiResponse {
  return { id: 'test-id', created_at: '2026-01-01', updated_at: '2026-01-01', ...overrides };
}

describe('mapApiResponseToSOWData payment_terms', () => {
  it('passes a real payment_terms value through unchanged', () => {
    const result = mapApiResponseToSOWData(
      responseWith({ payment_terms: 'Billed monthly, as incurred; payment due upon receipt.' })
    );
    expect(result.payment_terms).toBe(
      'Billed monthly, as incurred; payment due upon receipt.'
    );
  });

  it('defaults a missing payment_terms field to empty string', () => {
    const result = mapApiResponseToSOWData(responseWith({}));
    expect(result.payment_terms).toBe('');
  });

  it('defaults an empty payment_terms field to empty string', () => {
    const result = mapApiResponseToSOWData(responseWith({ payment_terms: '' }));
    expect(result.payment_terms).toBe('');
  });
});

describe('mapApiResponseToSOWData ai_generated_scope_content', () => {
  it('maps ai_generated_scope_content through', () => {
    const result = mapApiResponseToSOWData(
      responseWith({ ai_generated_scope_content: '<h3>Acquire</h3>' })
    );
    expect(result.ai_generated_scope_content).toBe('<h3>Acquire</h3>');
  });
});
