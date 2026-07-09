import React from 'react';
import {
  type TimelinePhase,
  effectiveTimelinePhases,
  parseTimelineWeeks,
  phaseGeometry,
  packPhasesIntoRows,
  formatPhaseDuration,
} from '@/lib/sow/timeline-phases';

interface TimelinePhaseBarProps {
  phases?: TimelinePhase[] | null;
  timelineWeeks?: string | number | null;
}

/**
 * Horizontal project-timeline visual: a week-axis strip with one labeled block per
 * phase (position = startWeek, width = durationWeeks), descriptions listed beneath.
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

  const rows = packPhasesIntoRows(sorted);

  return (
    <div className="my-4">
      <h3 className="text-lg font-semibold mb-3">Project Timeline</h3>
      <div className="rounded border border-gray-300 p-4">
        {/* phase bars */}
        <div className="space-y-2">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="relative h-9 w-full">
              {row.map((phase, i) => {
                const { leftPct, widthPct } = phaseGeometry(phase, total);
                return (
                  <div
                    key={`${phase.name}-${i}`}
                    className="absolute top-0 h-9 rounded border border-gray-700 bg-gray-100 px-2 flex items-center overflow-hidden"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`${phase.name} - ${formatPhaseDuration(phase.durationWeeks)}`}
                  >
                    <span className="text-xs font-semibold text-gray-800 truncate">{phase.name}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {/* week axis */}
        <div className="mt-2 flex justify-between text-[10px] text-gray-500">
          <span>Week 0</span>
          <span>Week {Math.round(total * 10) / 10}</span>
        </div>
        {/* descriptions */}
        <ul className="mt-3 space-y-1">
          {sorted.map((phase, i) => (
            <li key={`${phase.name}-desc-${i}`} className="text-xs text-gray-700">
              <span className="font-semibold">{phase.name}</span>
              {phase.description ? ` - ${phase.description}` : ''}
              {' '}<span className="text-gray-500">({formatPhaseDuration(phase.durationWeeks)})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
