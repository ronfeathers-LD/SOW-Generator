'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  resolveCommentAnchors,
  caretBoundaryFromPoint,
  findCommentAtBoundary,
  isAnchoredTopLevel,
  type AnchoredCommentRef,
  type AnchorResolutionStatus,
} from '@/lib/anchored-highlights';

/**
 * Highlight names registered with `CSS.highlights` — styled in
 * src/app/globals.css via `::highlight(...)` rules.
 */
export const COMMENT_HIGHLIGHT_NAME = 'sow-comment';
export const ACTIVE_COMMENT_HIGHLIGHT_NAME = 'sow-comment-active';

let loggedNoHighlightApi = false;

/**
 * Feature-detect the CSS Custom Highlight API. When unsupported, highlights
 * and click-to-thread are skipped ENTIRELY (no DOM-wrapping fallback in v1) —
 * anchored comments stay fully usable from the Comments tab. Anchor
 * RESOLUTION still runs so orphan badges work everywhere.
 */
function highlightApiSupported(): boolean {
  const supported =
    typeof CSS !== 'undefined' &&
    'highlights' in CSS &&
    typeof Highlight !== 'undefined';
  if (!supported && !loggedNoHighlightApi) {
    loggedNoHighlightApi = true;
    console.info(
      '[anchored-comments] CSS Custom Highlight API is not supported in this browser; ' +
        'in-content comment highlights are disabled. Comments remain available from the Comments tab.'
    );
  }
  return supported;
}

export interface ActiveAnchoredThread<T> {
  comment: T;
  /** Where the user clicked, in viewport coordinates (popover anchor point). */
  rect: DOMRect;
}

export interface UseAnchoredHighlightsResult<T> {
  /**
   * comment id → 'resolved' | 'orphaned' for anchored threads whose section
   * containers have been mounted; absent = unknown. Retained across tab
   * switches (the SOW view is read-only, so a computed status stays valid).
   */
  anchorStatus: ReadonlyMap<string, AnchorResolutionStatus>;
  /** Refetch comments and re-resolve/repaint (after post/resolve/reply). */
  refresh: () => void;
  /** The thread opened by clicking a highlight, if any. */
  activeThread: ActiveAnchoredThread<T> | null;
  closeThread: () => void;
}

/**
 * Anchored-comment highlights over the rendered SOW content (#350, P5).
 *
 * While `enabled` (Content tab active), fetches the SOW's comment threads,
 * resolves each anchored top-level comment to a live DOM Range
 * (anchorToRange: exact → unique quote → context; orphans get nothing), and
 * paints OPEN (unresolved) threads via the CSS Custom Highlight API.
 *
 * Click-to-thread: the Highlight API has no per-highlight event targets, so a
 * click listener on the content container hit-tests the click's caret
 * position against the painted ranges (innermost/shortest range wins) and
 * reports the matching thread as `activeThread`. A rAF-throttled pointermove
 * listener applies a pointer cursor while hovering a highlighted range.
 *
 * Invalidation is explicit (`refresh()`) — no polling. Re-resolution happens
 * when the tab activates, after a new anchored comment is posted, and on
 * resolve/unresolve.
 */
export function useAnchoredHighlights<T extends AnchoredCommentRef>(options: {
  sowId: string;
  /** The element containing the rendered `[data-section-key]` sections. */
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}): UseAnchoredHighlightsResult<T> {
  const { sowId, containerRef, enabled } = options;

  const [comments, setComments] = useState<T[]>([]);
  const [loadVersion, setLoadVersion] = useState(0);
  const [anchorStatus, setAnchorStatus] = useState<
    ReadonlyMap<string, AnchorResolutionStatus>
  >(new Map());
  const [active, setActive] = useState<{ id: string; rect: DOMRect } | null>(null);
  /** Ranges of PAINTED (open, resolved-anchor) threads — the click targets. */
  const paintedRangesRef = useRef<Map<string, Range>>(new Map());

  const refresh = useCallback(() => setLoadVersion((v) => v + 1), []);
  const closeThread = useCallback(() => setActive(null), []);

  // Leaving the content tab dismisses any open thread popover — otherwise it
  // would silently reappear on the next visit.
  useEffect(() => {
    if (!enabled) setActive(null);
  }, [enabled]);

  // ── Fetch threads when the content tab activates / on invalidation ──
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/sow/${sowId}/approval-comments`);
        if (!response.ok) return;
        const data = (await response.json()) as T[];
        if (!cancelled && Array.isArray(data)) setComments(data);
      } catch (error) {
        console.error('Error loading anchored comments:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sowId, enabled, loadVersion]);

  // ── Resolve anchors against the mounted sections; paint open threads ──
  useEffect(() => {
    if (!enabled) return;
    const root = containerRef.current;
    if (!root) return;

    const anchored = comments.filter(isAnchoredTopLevel);
    const { ranges, status } = resolveCommentAnchors(anchored, root);

    // Status survives tab switches: merge over previous knowledge so the
    // Comments tab keeps badges after the content containers unmount.
    setAnchorStatus((previous) => {
      const merged = new Map(previous);
      status.forEach((value, id) => merged.set(id, value));
      return merged;
    });

    const painted = new Map<string, Range>();
    for (const comment of anchored) {
      const range = ranges.get(comment.id);
      if (range && !comment.resolved_at) painted.set(comment.id, range);
    }
    paintedRangesRef.current = painted;

    if (!highlightApiSupported()) return;
    if (painted.size > 0) {
      CSS.highlights.set(
        COMMENT_HIGHLIGHT_NAME,
        new Highlight(...Array.from(painted.values()))
      );
    } else {
      CSS.highlights.delete(COMMENT_HIGHLIGHT_NAME);
    }
    return () => {
      CSS.highlights.delete(COMMENT_HIGHLIGHT_NAME);
      CSS.highlights.delete(ACTIVE_COMMENT_HIGHLIGHT_NAME);
      paintedRangesRef.current = new Map();
    };
  }, [comments, enabled, containerRef]);

  // ── Distinct stronger style for the clicked/focused thread ──
  useEffect(() => {
    if (!highlightApiSupported()) return;
    const range = active ? paintedRangesRef.current.get(active.id) : undefined;
    if (range) {
      CSS.highlights.set(ACTIVE_COMMENT_HIGHLIGHT_NAME, new Highlight(range));
    } else {
      CSS.highlights.delete(ACTIVE_COMMENT_HIGHLIGHT_NAME);
    }
    return () => {
      CSS.highlights.delete(ACTIVE_COMMENT_HIGHLIGHT_NAME);
    };
  }, [active, comments, enabled]);

  // ── Click-to-thread + hover cursor affordance ──
  useEffect(() => {
    if (!enabled) return;
    const root = containerRef.current;
    if (!root || !highlightApiSupported()) return;

    const hitTest = (x: number, y: number): string | null => {
      if (paintedRangesRef.current.size === 0) return null;
      const point = caretBoundaryFromPoint(root.ownerDocument, x, y);
      if (!point || !root.contains(point.node)) return null;
      return findCommentAtBoundary(paintedRangesRef.current, point.node, point.offset);
    };

    const onClick = (event: MouseEvent) => {
      // A click that concludes a text-selection drag is not a thread-open.
      const selection = root.ownerDocument.getSelection();
      if (selection && !selection.isCollapsed) return;
      const id = hitTest(event.clientX, event.clientY);
      if (!id) return;
      setActive({ id, rect: new DOMRect(event.clientX, event.clientY, 0, 0) });
    };

    let frameQueued = false;
    const onPointerMove = (event: PointerEvent) => {
      if (frameQueued) return;
      frameQueued = true;
      const { clientX, clientY } = event;
      requestAnimationFrame(() => {
        frameQueued = false;
        root.style.cursor = hitTest(clientX, clientY) ? 'pointer' : '';
      });
    };

    root.addEventListener('click', onClick);
    root.addEventListener('pointermove', onPointerMove);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('pointermove', onPointerMove);
      root.style.cursor = '';
    };
  }, [enabled, containerRef]);

  const activeThread = useMemo<ActiveAnchoredThread<T> | null>(() => {
    if (!active) return null;
    const comment = comments.find((c) => c.id === active.id);
    return comment ? { comment, rect: active.rect } : null;
  }, [active, comments]);

  return { anchorStatus, refresh, activeThread, closeThread };
}
