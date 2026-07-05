import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEGMENT_RULES,
  getExtraHours,
  isSelfServePmRemoval,
  normalizeSegment,
  rowsToRulesMap,
} from './segment-rules';

describe('normalizeSegment', () => {
  it('maps legacy MidMarket to MM', () => {
    expect(normalizeSegment('MidMarket')).toBe('MM');
  });
  it('trims and passes canonical codes through', () => {
    expect(normalizeSegment(' LE ')).toBe('LE');
    expect(normalizeSegment('EC')).toBe('EC');
  });
  it('returns empty string for null/undefined/empty', () => {
    expect(normalizeSegment(null)).toBe('');
    expect(normalizeSegment(undefined)).toBe('');
    expect(normalizeSegment('')).toBe('');
  });
});

describe('isSelfServePmRemoval', () => {
  it('is true for LE and EE at defaults', () => {
    expect(isSelfServePmRemoval(DEFAULT_SEGMENT_RULES, 'LE')).toBe(true);
    expect(isSelfServePmRemoval(DEFAULT_SEGMENT_RULES, 'EE')).toBe(true);
  });
  it('is false for MM, EC, unknown, and null (safe default: requires approval)', () => {
    expect(isSelfServePmRemoval(DEFAULT_SEGMENT_RULES, 'MM')).toBe(false);
    expect(isSelfServePmRemoval(DEFAULT_SEGMENT_RULES, 'EC')).toBe(false);
    expect(isSelfServePmRemoval(DEFAULT_SEGMENT_RULES, 'ZZ')).toBe(false);
    expect(isSelfServePmRemoval(DEFAULT_SEGMENT_RULES, null)).toBe(false);
  });
  it('follows the rules data, not hardcoded segments', () => {
    const custom = rowsToRulesMap([
      { segment: 'EC', display_name: 'Commercial', pm_removal_self_serve: true, extra_hours: 0 },
    ]);
    expect(isSelfServePmRemoval(custom, 'EC')).toBe(true);
  });
});

describe('getExtraHours', () => {
  it('gives MM +5 at defaults, including legacy MidMarket spelling', () => {
    expect(getExtraHours(DEFAULT_SEGMENT_RULES, 'MM')).toBe(5);
    expect(getExtraHours(DEFAULT_SEGMENT_RULES, 'MidMarket')).toBe(5);
  });
  it('gives 0 for LE/EE/EC/unknown/null at defaults', () => {
    expect(getExtraHours(DEFAULT_SEGMENT_RULES, 'LE')).toBe(0);
    expect(getExtraHours(DEFAULT_SEGMENT_RULES, 'EC')).toBe(0);
    expect(getExtraHours(DEFAULT_SEGMENT_RULES, 'ZZ')).toBe(0);
    expect(getExtraHours(DEFAULT_SEGMENT_RULES, undefined)).toBe(0);
  });
  it('follows the rules data (config-driven, not hardcoded)', () => {
    const custom = rowsToRulesMap([
      { segment: 'MM', display_name: 'Mid-Market', pm_removal_self_serve: false, extra_hours: 10 },
    ]);
    expect(getExtraHours(custom, 'MM')).toBe(10);
  });
});

describe('rowsToRulesMap', () => {
  it('keys rules by segment code with camelCase fields', () => {
    const map = rowsToRulesMap([
      { segment: 'LE', display_name: 'Large Enterprise', pm_removal_self_serve: true, extra_hours: 0 },
    ]);
    expect(map.LE).toEqual({
      segment: 'LE',
      displayName: 'Large Enterprise',
      pmRemovalSelfServe: true,
      extraHours: 0,
    });
  });
});
