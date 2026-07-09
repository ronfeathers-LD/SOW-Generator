import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TIMELINE_PHASE_SPEC,
  defaultTimelinePhases,
  effectiveTimelinePhases,
  formatPhaseDuration,
  phaseGeometry,
  packPhasesIntoRows,
  timelinePhasesExceedWeeks,
  renderTimelinePhaseBarHtml,
} from './timeline-phases';

describe('DEFAULT_TIMELINE_PHASE_SPEC', () => {
  it('is the six canonical phases in order with ratios summing to 1', () => {
    expect(DEFAULT_TIMELINE_PHASE_SPEC.map((p) => p.name)).toEqual([
      'Engage', 'Discovery', 'Build', 'Test', 'Deploy', 'Hypercare',
    ]);
    const sum = DEFAULT_TIMELINE_PHASE_SPEC.reduce((a, p) => a + p.ratio, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('defaultTimelinePhases', () => {
  it('derives sequential startWeek + durationWeeks from timeline_weeks', () => {
    const phases = defaultTimelinePhases('16');
    expect(phases).toHaveLength(6);
    expect(phases[0]).toMatchObject({ name: 'Engage', startWeek: 0, durationWeeks: 2 });      // 16*0.125
    expect(phases[1]).toMatchObject({ name: 'Discovery', startWeek: 2, durationWeeks: 4 });    // 16*0.25
    expect(phases[2]).toMatchObject({ name: 'Build', startWeek: 6, durationWeeks: 4 });
    expect(phases[5]).toMatchObject({ name: 'Hypercare', startWeek: 14, durationWeeks: 2 });
    // startWeeks accumulate to total
    const last = phases[5];
    expect(last.startWeek + last.durationWeeks).toBeCloseTo(16, 6);
  });

  it('returns an empty array for empty/invalid/zero timeline_weeks', () => {
    expect(defaultTimelinePhases('')).toEqual([]);
    expect(defaultTimelinePhases('999')).toEqual([]); // legacy sentinel treated as unset
    expect(defaultTimelinePhases('0')).toEqual([]);
    expect(defaultTimelinePhases('abc')).toEqual([]);
  });
});

describe('effectiveTimelinePhases', () => {
  it('uses stored phases when present and non-empty', () => {
    const stored = [{ name: 'A', description: '', startWeek: 0, durationWeeks: 3 }];
    expect(effectiveTimelinePhases(stored, '10')).toBe(stored);
  });
  it('falls back to the computed default when phases are null/empty', () => {
    expect(effectiveTimelinePhases(null, '8')).toHaveLength(6);
    expect(effectiveTimelinePhases([], '8')).toHaveLength(6);
    expect(effectiveTimelinePhases(undefined, '')).toEqual([]);
  });
});

describe('formatPhaseDuration', () => {
  it('renders weeks, or days when under one week, with singular/plural', () => {
    expect(formatPhaseDuration(2)).toBe('2 weeks');
    expect(formatPhaseDuration(1)).toBe('1 week');
    expect(formatPhaseDuration(2.5)).toBe('2.5 weeks');
    expect(formatPhaseDuration(0.5)).toBe('4 days');   // ceil(0.5*7)=4
    expect(formatPhaseDuration(1 / 7)).toBe('1 day');
  });
});

describe('phaseGeometry', () => {
  it('computes left/width percentages clamped to the bar', () => {
    expect(phaseGeometry({ name: '', description: '', startWeek: 2, durationWeeks: 4 }, 16))
      .toEqual({ leftPct: 12.5, widthPct: 25 });
    // clamps overflow so left+width never exceeds 100
    const g = phaseGeometry({ name: '', description: '', startWeek: 14, durationWeeks: 10 }, 16);
    expect(g.leftPct).toBeCloseTo(87.5, 6);
    expect(g.leftPct + g.widthPct).toBeLessThanOrEqual(100 + 1e-9);
  });
  it('returns zero-width for non-positive total', () => {
    expect(phaseGeometry({ name: '', description: '', startWeek: 0, durationWeeks: 1 }, 0))
      .toEqual({ leftPct: 0, widthPct: 0 });
  });
});

describe('packPhasesIntoRows', () => {
  it('keeps non-overlapping phases on one row', () => {
    const phases = [
      { name: 'A', description: '', startWeek: 0, durationWeeks: 2 },
      { name: 'B', description: '', startWeek: 2, durationWeeks: 2 },
    ];
    expect(packPhasesIntoRows(phases)).toHaveLength(1);
  });
  it('stacks overlapping phases onto separate rows (Veeam parallel pattern)', () => {
    const phases = [
      { name: 'A', description: '', startWeek: 0, durationWeeks: 5 },
      { name: 'B', description: '', startWeek: 2, durationWeeks: 5 },
    ];
    const rows = packPhasesIntoRows(phases);
    expect(rows).toHaveLength(2);
    expect(rows[0].map((p) => p.name)).toEqual(['A']);
    expect(rows[1].map((p) => p.name)).toEqual(['B']);
  });
});

describe('timelinePhasesExceedWeeks', () => {
  it('is true when any phase ends past timeline_weeks', () => {
    expect(timelinePhasesExceedWeeks([{ name: '', description: '', startWeek: 6, durationWeeks: 5 }], '10')).toBe(true);
    expect(timelinePhasesExceedWeeks([{ name: '', description: '', startWeek: 0, durationWeeks: 10 }], '10')).toBe(false);
  });
  it('is false when timeline_weeks is unset (nothing to exceed)', () => {
    expect(timelinePhasesExceedWeeks([{ name: '', description: '', startWeek: 0, durationWeeks: 5 }], '')).toBe(false);
  });
});

describe('renderTimelinePhaseBarHtml', () => {
  it('returns an empty string when timeline_weeks is unset/invalid', () => {
    expect(renderTimelinePhaseBarHtml(null, '')).toBe('');
    expect(renderTimelinePhaseBarHtml(null, '999')).toBe(''); // legacy sentinel
    expect(renderTimelinePhaseBarHtml(null, '0')).toBe('');
    expect(renderTimelinePhaseBarHtml(null, 'abc')).toBe('');
  });

  it('contains each default phase name for a 16-week timeline with no stored phases', () => {
    const html = renderTimelinePhaseBarHtml(null, '16');
    expect(html).not.toBe('');
    for (const spec of DEFAULT_TIMELINE_PHASE_SPEC) {
      expect(html).toContain(spec.name);
    }
    expect(html).toContain('Week 0');
    expect(html).toContain('Week 16');
  });

  it('HTML-escapes an injected phase name so it cannot break out as markup', () => {
    const phases = [
      { name: '<script>alert(1)</script>', description: 'x', startWeek: 0, durationWeeks: 16 },
    ];
    const html = renderTimelinePhaseBarHtml(phases, '16');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
