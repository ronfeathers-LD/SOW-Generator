/** One phase in a SOW's project timeline. Weeks are relative to project start. */
export interface TimelinePhase {
  name: string;
  description: string;
  startWeek: number;
  durationWeeks: number;
}

/** Canonical six-phase split. Ratios are fractions of total timeline_weeks and sum to 1.
 * Names/descriptions preserve the historical timeline-table literals (title-cased). */
export const DEFAULT_TIMELINE_PHASE_SPEC: ReadonlyArray<{ name: string; description: string; ratio: number }> = [
  { name: 'Engage', description: 'Project kickoff and planning', ratio: 0.125 },
  { name: 'Discovery', description: 'Requirements gathering and analysis', ratio: 0.25 },
  { name: 'Build', description: 'Solution development and configuration', ratio: 0.25 },
  { name: 'Test', description: 'Quality assurance and validation', ratio: 0.125 },
  { name: 'Deploy', description: 'Production deployment and go-live', ratio: 0.125 },
  { name: 'Hypercare', description: 'Post-deployment support and transition', ratio: 0.125 },
];

/** Parse timeline_weeks (TEXT column; may be '', 'abc', legacy '999', or a number string). */
export function parseTimelineWeeks(timelineWeeks: string | number | null | undefined): number {
  const n = typeof timelineWeeks === 'number' ? timelineWeeks : parseFloat(String(timelineWeeks ?? ''));
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (String(timelineWeeks).trim() === '999') return 0; // legacy "unset" sentinel
  return n;
}

/** The default six phases derived from timeline_weeks, with sequential startWeek. Empty if unset. */
export function defaultTimelinePhases(timelineWeeks: string | number | null | undefined): TimelinePhase[] {
  const total = parseTimelineWeeks(timelineWeeks);
  if (total <= 0) return [];
  const phases: TimelinePhase[] = [];
  let cursor = 0;
  for (const spec of DEFAULT_TIMELINE_PHASE_SPEC) {
    const durationWeeks = total * spec.ratio;
    phases.push({ name: spec.name, description: spec.description, startWeek: cursor, durationWeeks });
    cursor += durationWeeks;
  }
  return phases;
}

/** Stored phases if present + non-empty; otherwise the computed default (fallback for existing SOWs). */
export function effectiveTimelinePhases(
  phases: TimelinePhase[] | null | undefined,
  timelineWeeks: string | number | null | undefined
): TimelinePhase[] {
  if (Array.isArray(phases) && phases.length > 0) return phases;
  return defaultTimelinePhases(timelineWeeks);
}

/** Human label for a duration in weeks: days when < 1 week, else weeks (1 decimal), singular/plural. */
export function formatPhaseDuration(weeks: number): string {
  if (!Number.isFinite(weeks) || weeks <= 0) return '0 weeks';
  if (weeks < 1) {
    const days = Math.ceil(weeks * 7);
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  const w = Math.round(weeks * 10) / 10;
  return `${w} week${w === 1 ? '' : 's'}`;
}

/** Position (left) + width as percentages of the total bar, clamped to [0, 100]. */
export function phaseGeometry(phase: TimelinePhase, totalWeeks: number): { leftPct: number; widthPct: number } {
  if (!Number.isFinite(totalWeeks) || totalWeeks <= 0) return { leftPct: 0, widthPct: 0 };
  const leftPct = Math.min(100, Math.max(0, (phase.startWeek / totalWeeks) * 100));
  const rawWidth = (phase.durationWeeks / totalWeeks) * 100;
  const widthPct = Math.min(100 - leftPct, Math.max(0, rawWidth));
  return { leftPct, widthPct };
}

/** Greedy row-packing: each phase goes on the first row where it does not overlap an existing phase. */
export function packPhasesIntoRows(phases: TimelinePhase[]): TimelinePhase[][] {
  const rows: TimelinePhase[][] = [];
  const end = (p: TimelinePhase) => p.startWeek + p.durationWeeks;
  const overlaps = (a: TimelinePhase, b: TimelinePhase) => a.startWeek < end(b) && b.startWeek < end(a);
  for (const phase of phases) {
    let placed = false;
    for (const row of rows) {
      if (!row.some((p) => overlaps(p, phase))) {
        row.push(phase);
        placed = true;
        break;
      }
    }
    if (!placed) rows.push([phase]);
  }
  return rows;
}

/** True when any phase ends past timeline_weeks (used for a non-blocking warning). */
export function timelinePhasesExceedWeeks(
  phases: TimelinePhase[],
  timelineWeeks: string | number | null | undefined
): boolean {
  const total = parseTimelineWeeks(timelineWeeks);
  if (total <= 0) return false;
  return phases.some((p) => p.startWeek + p.durationWeeks > total + 1e-9);
}
