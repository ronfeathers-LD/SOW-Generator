import { describe, expect, it } from 'vitest';
import { DEFAULT_SEGMENT_RULES, rowsToRulesMap } from './segment-rules';
import { calculateAccountSegmentHours, calculateAllHours } from './hours-calculation-utils';

describe('calculateAccountSegmentHours', () => {
  it('preserves legacy behavior at default rules', () => {
    expect(calculateAccountSegmentHours('MM', DEFAULT_SEGMENT_RULES)).toBe(5);
    expect(calculateAccountSegmentHours('MidMarket', DEFAULT_SEGMENT_RULES)).toBe(5);
    expect(calculateAccountSegmentHours('LE', DEFAULT_SEGMENT_RULES)).toBe(0);
    expect(calculateAccountSegmentHours('EE', DEFAULT_SEGMENT_RULES)).toBe(0);
    expect(calculateAccountSegmentHours('EC', DEFAULT_SEGMENT_RULES)).toBe(0);
    expect(calculateAccountSegmentHours(undefined, DEFAULT_SEGMENT_RULES)).toBe(0);
  });

  it('is genuinely config-driven: a changed rule changes the result', () => {
    const custom = rowsToRulesMap([
      { segment: 'MM', display_name: 'Mid-Market', pm_removal_self_serve: false, extra_hours: 10 },
    ]);
    expect(calculateAccountSegmentHours('MM', custom)).toBe(10);
  });
});

describe('calculateAllHours', () => {
  it('includes segment hours in baseProjectHours', () => {
    const result = calculateAllHours({}, 'MM', DEFAULT_SEGMENT_RULES);
    expect(result.accountSegmentHours).toBe(5);
    expect(result.baseProjectHours).toBe(5); // empty template: only the segment bump
  });

  it('gives zero segment hours for enterprise segments', () => {
    const result = calculateAllHours({}, 'LE', DEFAULT_SEGMENT_RULES);
    expect(result.accountSegmentHours).toBe(0);
  });
});
