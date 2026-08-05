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

/** Interior whole-week tick positions for the bar's ruler (excludes 0 and the final week).
 * Steps up for long timelines so labels don't crowd. */
export function interiorWeekTicks(totalWeeks: number): number[] {
  if (!Number.isFinite(totalWeeks) || totalWeeks <= 0) return [];
  const step = totalWeeks > 16 ? Math.ceil(totalWeeks / 8) : 1;
  const ticks: number[] = [];
  for (let w = step; w < totalWeeks - 1e-9; w += step) ticks.push(w);
  return ticks;
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

/** PDF/Puppeteer HTML-string mirror of TimelinePhaseBar (grayscale-safe, no JS).
 * Colors match .formatSOWTable's LeanData-green table headers so the visual and
 * the phase table read as one system in the PDF. */
export function renderTimelinePhaseBarHtml(
  phases: TimelinePhase[] | null | undefined,
  timelineWeeks: string | number | null | undefined
): string {
  const total = parseTimelineWeeks(timelineWeeks);
  const effective = effectiveTimelinePhases(phases ?? null, timelineWeeks);
  if (total <= 0 || effective.length === 0) return '';

  const GREEN = '#26D07C';
  const GREEN_TINT = '#EAF9F1';
  const GREEN_DARK = '#1FA866';
  const GREEN_TEXT = '#1F7A4D';
  const exact = '-webkit-print-color-adjust:exact;print-color-adjust:exact;';

  // Sort by startWeek ascending (mirrors TimelinePhaseBar) so custom user-reordered
  // phases still pack into the minimum number of rows and render left-to-right.
  const sorted = [...effective].sort((a, b) => a.startWeek - b.startWeek);

  // Solid/tint alternation follows chronological order, not row order (mirrors TimelinePhaseBar).
  const phaseOrder = new Map(sorted.map((p, i) => [p, i]));
  const rows = packPhasesIntoRows(sorted);
  const ticks = interiorWeekTicks(total);

  const gridlines = ticks.map((w) =>
    `<div style="position:absolute;top:0;bottom:0;left:${(w / total) * 100}%;border-left:1px dashed #d1d5db;"></div>`
  ).join('');
  const bars = rows.map((row, rowIdx) => {
    const blocks = row.map((phase, i) => {
      const solid = (phaseOrder.get(phase) ?? i) % 2 === 0;
      const { leftPct, widthPct } = phaseGeometry(phase, total);
      const bg = solid ? GREEN : GREEN_TINT;
      const nameColor = solid ? '#ffffff' : GREEN_TEXT;
      const durColor = solid ? 'rgba(255,255,255,0.85)' : GREEN_TEXT;
      return `<div style="position:absolute;top:0;height:36px;left:${leftPct}%;width:${widthPct}%;border:1px solid ${GREEN_DARK};background:${bg};${exact}padding:0 6px;display:flex;flex-direction:column;justify-content:center;overflow:hidden;border-radius:3px;box-sizing:border-box;"><span style="font-size:9px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${nameColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;">${escapePhaseHtml(phase.name)}</span><span style="font-size:8px;color:${durColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;">${formatPhaseDuration(phase.durationWeeks)}</span></div>`;
    }).join('');
    const mb = rowIdx < rows.length - 1 ? 'margin-bottom:6px;' : '';
    return `<div style="position:relative;height:36px;width:100%;${mb}">${blocks}</div>`;
  }).join('');
  const tickMarks = ticks.map((w) =>
    `<div style="position:absolute;top:0;left:${(w / total) * 100}%;height:6px;width:1px;background:#9ca3af;${exact}"></div>`
  ).join('');
  const tickLabels = ticks.filter((w) => w / total >= 0.06 && w / total <= 0.94).map((w) =>
    `<span style="position:absolute;top:7px;left:${(w / total) * 100}%;transform:translateX(-50%);font-size:9px;color:#6b7280;">${w}</span>`
  ).join('');
  const phaseRows = sorted.map((phase, i) =>
    `<tr><td style="border-bottom:1px solid #e5e7eb;padding:10px 12px;color:#374151;vertical-align:top;white-space:nowrap;text-transform:uppercase;font-weight:500;">${i + 1}. ${escapePhaseHtml(phase.name)}</td><td style="border-bottom:1px solid #e5e7eb;padding:10px 12px;color:#374151;vertical-align:top;">${escapePhaseHtml(phase.description)}</td><td style="border-bottom:1px solid #e5e7eb;padding:10px 12px;color:#374151;vertical-align:top;white-space:nowrap;">${formatPhaseDuration(phase.durationWeeks)}</td></tr>`
  ).join('');
  return `
    <h3>Project Timeline</h3>
    <div style="margin-bottom:14px;">
      <div style="position:relative;">${gridlines}<div style="position:relative;">${bars}</div></div>
      <div style="position:relative;height:18px;margin-top:6px;border-top:1px solid #9ca3af;">
        ${tickMarks}
        <span style="position:absolute;top:7px;left:0;font-size:9px;color:#6b7280;">Week 0</span>
        ${tickLabels}
        <span style="position:absolute;top:7px;right:0;font-size:9px;color:#6b7280;">Week ${Math.round(total * 10) / 10}</span>
      </div>
    </div>
    <table class="content-table">
      <thead>
        <tr style="background-color: #26D07C; color: #ffffff;">
          <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Phase</th>
          <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Description</th>
          <th style="border-bottom: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold; color: #ffffff; text-transform: uppercase; font-size: 12px;">Duration</th>
        </tr>
      </thead>
      <tbody>${phaseRows}</tbody>
    </table>`;
}
