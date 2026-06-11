import { resolveAnchorInText, type AnchorQuery } from './comment-anchors';

/**
 * Orphaned-anchor original context (#351).
 *
 * When an anchored comment no longer resolves against the CURRENT content
 * (the text was edited), the Comments tab can show what the passage looked
 * like when the comment was filed, using the section's content snapshot from
 * the submission the comment is linked to (`snapshot_id`).
 *
 * The snapshot endpoint (GET /api/sow/[id]/content-snapshots/[snapshotId])
 * returns the snapshot's ANCHOR TEXT (htmlToAnchorText runs server-side so
 * isomorphic-dompurify's jsdom never ships to the client); this module does
 * the remaining PURE string work: locate the quote in that text via the same
 * resolution semantics as live highlighting (exact offsets → unique quote →
 * context disambiguation) and slice a readable window around it.
 */

/** Characters of original text shown on each side of the quote. */
export const ORPHAN_SNIPPET_CONTEXT_LENGTH = 120;

export interface OrphanContextSnippet {
  /** Original text immediately before the quote ('' at the section start). */
  prefix: string;
  /** The quoted text as it sat in the snapshot. */
  quoted: string;
  /** Original text immediately after the quote ('' at the section end). */
  suffix: string;
  /** True when `prefix` was truncated (render a leading ellipsis). */
  truncatedStart: boolean;
  /** True when `suffix` was truncated (render a trailing ellipsis). */
  truncatedEnd: boolean;
}

/**
 * Compute the original-context snippet for an orphaned anchor against the
 * snapshot's anchor text. Returns null when the quote does not occur in the
 * snapshot either (e.g. the comment was filed against content newer than the
 * last submission snapshot) — callers fall back to showing just the quote.
 */
export function computeOrphanContextSnippet(
  snapshotAnchorText: string,
  anchor: AnchorQuery,
  contextLength: number = ORPHAN_SNIPPET_CONTEXT_LENGTH
): OrphanContextSnippet | null {
  const resolved = resolveAnchorInText(snapshotAnchorText, anchor);
  if (!resolved) return null;

  const prefixStart = Math.max(0, resolved.start_offset - contextLength);
  const suffixEnd = Math.min(
    snapshotAnchorText.length,
    resolved.end_offset + contextLength
  );

  return {
    prefix: snapshotAnchorText.slice(prefixStart, resolved.start_offset),
    quoted: snapshotAnchorText.slice(resolved.start_offset, resolved.end_offset),
    suffix: snapshotAnchorText.slice(resolved.end_offset, suffixEnd),
    truncatedStart: prefixStart > 0,
    truncatedEnd: suffixEnd < snapshotAnchorText.length,
  };
}
