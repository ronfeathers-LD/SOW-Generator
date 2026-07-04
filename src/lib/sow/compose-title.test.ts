import { describe, expect, it } from 'vitest';
import { composeSowTitle } from './compose-title';

describe('composeSowTitle', () => {
  it('appends the account when the opportunity name does not contain it', () => {
    expect(composeSowTitle('Buying Groups Implementation', 'Veeam')).toBe(
      'Buying Groups Implementation - Veeam'
    );
  });

  it('does not duplicate the account name when already present', () => {
    expect(
      composeSowTitle('OpenAI OpCo, LLC. - Renewal - 2026-10-01', 'OpenAI OpCo, LLC.')
    ).toBe('OpenAI OpCo, LLC. - Renewal - 2026-10-01');
  });

  it('is case-insensitive when detecting the account name', () => {
    expect(composeSowTitle('ACME renewal', 'Acme')).toBe('ACME renewal');
  });

  it('handles empty inputs', () => {
    expect(composeSowTitle('', 'Acme')).toBe('Acme');
    expect(composeSowTitle('Renewal 2026', '')).toBe('Renewal 2026');
    expect(composeSowTitle('  Renewal 2026  ', ' Acme ')).toBe('Renewal 2026 - Acme');
  });
});
