import { anchorToRange } from './selection-anchor';

/**
 * Anchored-comment highlight resolution (#350, P5).
 *
 * Pure DOM helpers — no React, no CSS Custom Highlight API — so everything
 * here is unit-testable under jsdom. The painting/invalidation lifecycle
 * (CSS.highlights, fetch, event listeners) lives in
 * src/lib/hooks/useAnchoredHighlights.ts and stays deliberately thin.
 */

/** The subset of an approval-comment row anchor resolution needs. */
export interface AnchoredCommentRef {
  id: string;
  parent_id?: string | null;
  section_key?: string | null;
  quoted_text?: string | null;
  context_prefix?: string | null;
  context_suffix?: string | null;
  start_offset?: number | null;
  end_offset?: number | null;
  resolved_at?: string | null;
}

/**
 * Whether the anchor resolved against the CURRENT content. 'orphaned' means
 * the quoted text no longer occurs in its section (content was edited) — the
 * comment is never highlighted and the Comments tab badges it.
 */
export type AnchorResolutionStatus = 'resolved' | 'orphaned';

/** Top-level comments carrying an anchor (replies inherit their parent's). */
export function isAnchoredTopLevel(comment: AnchoredCommentRef): boolean {
  return !comment.parent_id && !!comment.section_key && !!comment.quoted_text;
}

export interface CommentAnchorResolution {
  /** comment id → live Range, for every anchor that resolved (incl. resolved
   *  threads — painting decides separately what to show). */
  ranges: Map<string, Range>;
  /**
   * comment id → status for every anchored comment whose section container is
   * mounted. Comments whose section is NOT in the DOM are absent (status
   * unknown — don't guess).
   */
  status: Map<string, AnchorResolutionStatus>;
}

/**
 * Resolve every anchored top-level comment against the rendered section
 * containers (`[data-section-key]`) under `root`, using anchorToRange's
 * exact → unique-quote → context precedence. Anchors that fail to resolve are
 * marked 'orphaned' and get NO range — never mis-highlight.
 */
export function resolveCommentAnchors(
  comments: readonly AnchoredCommentRef[],
  root: HTMLElement
): CommentAnchorResolution {
  const containers = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-section-key]').forEach((el) => {
    const key = el.getAttribute('data-section-key');
    if (key && !containers.has(key)) containers.set(key, el);
  });

  const ranges = new Map<string, Range>();
  const status = new Map<string, AnchorResolutionStatus>();

  for (const comment of comments) {
    if (!isAnchoredTopLevel(comment)) continue;
    const container = containers.get(comment.section_key!);
    if (!container) continue; // section not mounted → status unknown

    const range = anchorToRange(
      {
        quoted_text: comment.quoted_text!,
        context_prefix: comment.context_prefix,
        context_suffix: comment.context_suffix,
        start_offset: comment.start_offset,
        end_offset: comment.end_offset,
      },
      container
    );
    if (range) {
      ranges.set(comment.id, range);
      status.set(comment.id, 'resolved');
    } else {
      status.set(comment.id, 'orphaned');
    }
  }

  return { ranges, status };
}

/**
 * Caret boundary point at viewport coordinates, across engines:
 * `caretPositionFromPoint` (standard) with a `caretRangeFromPoint` (WebKit)
 * fallback. Null when the point hits no text.
 */
export function caretBoundaryFromPoint(
  doc: Document,
  x: number,
  y: number
): { node: Node; offset: number } | null {
  const d = doc as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (typeof d.caretPositionFromPoint === 'function') {
    const position = d.caretPositionFromPoint(x, y);
    if (position) return { node: position.offsetNode, offset: position.offset };
  }
  if (typeof d.caretRangeFromPoint === 'function') {
    const range = d.caretRangeFromPoint(x, y);
    if (range) return { node: range.startContainer, offset: range.startOffset };
  }
  return null;
}

/**
 * Which highlighted comment a caret boundary point falls inside. With
 * overlapping highlights, picks the INNERMOST one — the shortest containing
 * range (v1 decision: no visual stacking, shortest wins on click).
 */
export function findCommentAtBoundary(
  ranges: ReadonlyMap<string, Range>,
  node: Node,
  offset: number
): string | null {
  let bestId: string | null = null;
  let bestLength = Number.POSITIVE_INFINITY;
  // forEach rather than for..of: tsconfig targets es5 (no iterator protocol).
  ranges.forEach((range, id) => {
    let inside = false;
    try {
      inside = range.comparePoint(node, offset) === 0;
    } catch {
      inside = false; // point in a different tree/document than the range
    }
    if (!inside) return;
    const length = range.toString().length;
    if (length < bestLength) {
      bestLength = length;
      bestId = id;
    }
  });
  return bestId;
}
