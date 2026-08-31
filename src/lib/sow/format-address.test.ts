import { describe, it, expect } from 'vitest';
import { formatAddressLines } from './format-address';

describe('formatAddressLines', () => {
  it('merges city, state and ZIP onto one line (the Salesforce field order)', () => {
    expect(
      formatAddressLines('1 Billing Lane, San Jose, CA, 94070, United States')
    ).toEqual(['1 Billing Lane', 'San Jose, CA 94070', 'United States']);
  });

  it('handles a state and ZIP already combined in one part', () => {
    expect(
      formatAddressLines('123 Market St, Suite 400, San Francisco, CA 94105')
    ).toEqual(['123 Market St', 'Suite 400', 'San Francisco, CA 94105']);
  });

  it('keeps multiple street lines on their own lines', () => {
    expect(
      formatAddressLines('500 Main St, Building C, Floor 3, Austin, TX, 78701')
    ).toEqual(['500 Main St', 'Building C', 'Floor 3', 'Austin, TX 78701']);
  });

  it('works without a country', () => {
    expect(formatAddressLines('1 Billing Lane, San Jose, CA, 94070')).toEqual([
      '1 Billing Lane',
      'San Jose, CA 94070',
    ]);
  });

  it('works without a region', () => {
    expect(formatAddressLines('1 Billing Lane, San Jose, 94070')).toEqual([
      '1 Billing Lane',
      'San Jose 94070',
    ]);
  });

  it('handles a ZIP+4', () => {
    expect(formatAddressLines('1 Billing Lane, San Jose, CA, 94070-1234')).toEqual([
      '1 Billing Lane',
      'San Jose, CA 94070-1234',
    ]);
  });

  it('handles a Canadian postal code', () => {
    expect(formatAddressLines('55 Front St, Toronto, ON, K1A 0B1, Canada')).toEqual([
      '55 Front St',
      'Toronto, ON K1A 0B1',
      'Canada',
    ]);
  });

  it('handles a UK postcode', () => {
    expect(formatAddressLines('10 Downing St, London, SW1A 2AA, United Kingdom')).toEqual([
      '10 Downing St',
      'London SW1A 2AA',
      'United Kingdom',
    ]);
  });

  it('handles a bare numeric postal code', () => {
    expect(formatAddressLines('1 Rue de Rivoli, Paris, 75001, France')).toEqual([
      '1 Rue de Rivoli',
      'Paris 75001',
      'France',
    ]);
  });

  it('does not mistake a street number for a postal code', () => {
    expect(formatAddressLines('94070 Industrial Way, San Jose, CA, 95110')).toEqual([
      '94070 Industrial Way',
      'San Jose, CA 95110',
    ]);
  });

  it('respects author-supplied line breaks instead of re-flowing', () => {
    expect(formatAddressLines('Acme Tower\n1 Billing Lane\nSan Jose, CA 94070')).toEqual([
      'Acme Tower',
      '1 Billing Lane',
      'San Jose, CA 94070',
    ]);
  });

  it('leaves an unstructured address one part per line', () => {
    expect(formatAddressLines('Attn: Accounts Payable, see invoice for details')).toEqual([
      'Attn: Accounts Payable',
      'see invoice for details',
    ]);
  });

  it('returns a single part untouched', () => {
    expect(formatAddressLines('1 Billing Lane')).toEqual(['1 Billing Lane']);
  });

  it('returns nothing for blank input', () => {
    expect(formatAddressLines('')).toEqual([]);
    expect(formatAddressLines('   ')).toEqual([]);
    expect(formatAddressLines(null)).toEqual([]);
    expect(formatAddressLines(undefined)).toEqual([]);
  });

  it('drops empty parts from doubled commas and trailing separators', () => {
    expect(formatAddressLines('1 Billing Lane,, San Jose, CA, 94070,')).toEqual([
      '1 Billing Lane',
      'San Jose, CA 94070',
    ]);
  });
});
