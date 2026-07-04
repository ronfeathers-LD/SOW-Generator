import { describe, it, expect } from 'vitest';
import { escapeCsvCell, toCsvRow } from './csv';

describe('escapeCsvCell (#150 formula injection + quoting)', () => {
  it('neutralizes formula-triggering leading characters', () => {
    expect(escapeCsvCell('=1+1')).toBe(`"'=1+1"`);
    expect(escapeCsvCell('+SUM(A1)')).toBe(`"'+SUM(A1)"`);
    expect(escapeCsvCell('-2')).toBe(`"'-2"`);
    expect(escapeCsvCell('@cmd')).toBe(`"'@cmd"`);
  });

  it('quotes and escapes commas, quotes, and newlines', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('leaves plain values untouched', () => {
    expect(escapeCsvCell('Ron Feathers')).toBe('Ron Feathers');
    expect(escapeCsvCell('approved')).toBe('approved');
    expect(escapeCsvCell(42)).toBe('42');
  });

  it('renders null/undefined as empty', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('toCsvRow escapes every cell so a comma cannot shift columns', () => {
    expect(toCsvRow(['a,b', 'c', '=x'])).toBe(`"a,b",c,"'=x"`);
  });
});
