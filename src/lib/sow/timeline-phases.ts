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

function escapePhaseHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** PDF/Puppeteer HTML-string mirror of TimelinePhaseBar (grayscale-safe, no JS). */
export function renderTimelinePhaseBarHtml(
  phases: TimelinePhase[] | null | undefined,
  timelineWeeks: string | number | null | undefined
): string {
  const total = parseTimelineWeeks(timelineWeeks);
  const effective = effectiveTimelinePhases(phases ?? null, timelineWeeks);
  if (total <= 0 || effective.length === 0) return '';

  // Sort by startWeek ascending (mirrors TimelinePhaseBar) so custom user-reordered
  // phases still pack into the minimum number of rows and render left-to-right.
  const sorted = [...effective].sort((a, b) => a.startWeek - b.startWeek);

  const rows = packPhasesIntoRows(sorted);
  const bars = rows.map((row) => {
    const blocks = row.map((phase) => {
      const { leftPct, widthPct } = phaseGeometry(phase, total);
      return `<div style="position:absolute;top:0;height:32px;left:${leftPct}%;width:${widthPct}%;border:1px solid #374151;background:#f3f4f6;padding:0 6px;display:flex;align-items:center;overflow:hidden;border-radius:3px;"><span style="font-size:11px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapePhaseHtml(phase.name)}</span></div>`;
    }).join('');
    return `<div style="position:relative;height:32px;width:100%;margin-bottom:8px;">${blocks}</div>`;
  }).join('');
  const descriptions = sorted.map((phase) =>
    `<li style="font-size:11px;color:#374151;margin-bottom:2px;"><strong>${escapePhaseHtml(phase.name)}</strong>${phase.description ? ' — ' + escapePhaseHtml(phase.description) : ''} <span style="color:#6b7280;">(${formatPhaseDuration(phase.durationWeeks)})</span></li>`
  ).join('');
  return `
    <h3 style="font-size:16px;font-weight:600;margin:16px 0 12px;">Project Timeline</h3>
    <div style="border:1px solid #d1d5db;border-radius:6px;padding:16px;">
      <div>${bars}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-top:4px;"><span>Week 0</span><span>Week ${Math.round(total * 10) / 10}</span></div>
      <ul style="margin-top:12px;padding-left:0;list-style:none;">${descriptions}</ul>
    </div>`;
}
