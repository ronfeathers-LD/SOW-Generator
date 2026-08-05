import React from 'react';
import {
  type TimelinePhase,
  effectiveTimelinePhases,
  parseTimelineWeeks,
  phaseGeometry,
  packPhasesIntoRows,
  formatPhaseDuration,
  interiorWeekTicks,
} from '@/lib/sow/timeline-phases';

interface TimelinePhaseBarProps {
  phases?: TimelinePhase[] | null;
  timelineWeeks?: string | number | null;
}

// LeanData green used by every SOW table header (see .formatSOWTable in globals.css).
const GREEN = '#26D07C';
const GREEN_TINT = '#EAF9F1';
const GREEN_DARK = '#1FA866';
const GREEN_TEXT = '#1F7A4D';

// Keep block fills when the browser strips backgrounds in print; every block also
// has a solid border + its own text color so grayscale output stays legible.
const printExact: React.CSSProperties = {
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
};

/**
 * Horizontal project-timeline visual: a week-ruled strip with one labeled block per
 * phase (position = startWeek, width = durationWeeks), plus the numbered
 * Phase/Description/Duration table beneath (formatSOWTable, matching the other SOW tables).
 * Pure CSS/HTML so Puppeteer renders it; grayscale-safe (border + text, not color alone).
 * Overlapping/parallel phases stack onto separate rows.
 */
export default function TimelinePhaseBar({ phases, timelineWeeks }: TimelinePhaseBarProps) {
  const total = parseTimelineWeeks(timelineWeeks);
  const effective = effectiveTimelinePhases(phases ?? null, timelineWeeks);
  if (total <= 0 || effective.length === 0) return null;

  // Sort by startWeek ascending (stable copy) so custom user-reordered phases still pack
  // into the minimum number of rows and render left-to-right. packPhasesIntoRows itself
  // does not sort its input, so callers must sort first.
  const sorted = [...effective].sort((a, b) => a.startWeek - b.startWeek);

  // Solid/tint alternation follows chronological order, not row order, so adjacent
  // blocks contrast even after row-packing.
  const phaseOrder = new Map(sorted.map((p, i) => [p, i]));
  const rows = packPhasesIntoRows(sorted);
  const ticks = interiorWeekTicks(total);

  return (
    <div className="my-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Timeline</h3>

      {/* phase bar strip */}
      <div className="mb-4">
        <div className="relative">
          {ticks.map((w) => (
            <div
              key={`grid-${w}`}
              className="absolute inset-y-0 border-l border-dashed border-gray-300"
              style={{ left: `${(w / total) * 100}%` }}
            />
          ))}
          <div className="relative space-y-1.5">
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} className="relative h-11 w-full">
                {row.map((phase, i) => {
                  const solid = (phaseOrder.get(phase) ?? i) % 2 === 0;
                  const { leftPct, widthPct } = phaseGeometry(phase, total);
                  return (
                    <div
                      key={`${phase.name}-${i}`}
                      className="absolute top-0 flex h-11 flex-col justify-center overflow-hidden rounded px-2"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: solid ? GREEN : GREEN_TINT,
                        border: `1px solid ${GREEN_DARK}`,
                        ...printExact,
                      }}
                      title={`${phase.name} - ${formatPhaseDuration(phase.durationWeeks)}`}
                    >
                      <span
                        className="truncate text-[10px] font-bold uppercase tracking-wider leading-tight"
                        style={{ color: solid ? '#ffffff' : GREEN_TEXT }}
                      >
                        {phase.name}
                      </span>
                      <span
                        className="truncate text-[9px] leading-tight"
                        style={{ color: solid ? 'rgba(255,255,255,0.85)' : GREEN_TEXT }}
                      >
                        {formatPhaseDuration(phase.durationWeeks)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {/* week ruler */}
        <div className="relative mt-1.5 h-5 border-t border-gray-400">
          {ticks.map((w) => (
            <div
              key={`tick-${w}`}
              className="absolute top-0 h-1.5 w-px bg-gray-400"
              style={{ left: `${(w / total) * 100}%`, ...printExact }}
            />
          ))}
          <span className="absolute left-0 top-1.5 text-[10px] text-gray-500">Week 0</span>
          {ticks
            .filter((w) => w / total >= 0.06 && w / total <= 0.94)
            .map((w) => (
              <span
                key={`label-${w}`}
                className="absolute top-1.5 -translate-x-1/2 text-[10px] text-gray-500 tabular-nums"
                style={{ left: `${(w / total) * 100}%` }}
              >
                {w}
              </span>
            ))}
          <span className="absolute right-0 top-1.5 text-[10px] text-gray-500">
            Week {Math.round(total * 10) / 10}
          </span>
        </div>
      </div>

      {/* numbered phase table (green header via formatSOWTable, like the other SOW tables) */}
      <div className="formatSOWTable">
        <table>
          <thead>
            <tr>
              <th>Phase</th>
              <th>Description</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((phase, i) => (
              <tr key={`${phase.name}-row-${i}`}>
                <td className="whitespace-nowrap font-medium uppercase">{i + 1}. {phase.name}</td>
                <td>{phase.description}</td>
                <td className="whitespace-nowrap">{formatPhaseDuration(phase.durationWeeks)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
