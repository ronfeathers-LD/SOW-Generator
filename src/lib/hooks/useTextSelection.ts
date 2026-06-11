'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  rangeToAnchor,
  findSectionContainer,
  type SelectionAnchor,
} from '@/lib/selection-anchor';
import { SOW_SECTION_KEYS, type SOWSectionKey } from '@/lib/sow-content';

export interface TextSelectionState {
  /** Offsets/quote/context in the section's anchor-text coordinate space. */
  anchor: SelectionAnchor;
  /** The `[data-section-key]` section the whole selection lives in. */
  sectionKey: SOWSectionKey;
  /** Selection bounding box in VIEWPORT coordinates (for position: fixed UI). */
  rect: DOMRect;
}

/**
 * Watches the document selection (#349) and reports it when it is
 * non-collapsed and falls entirely inside ONE rendered SOW section
 * (`[data-section-key]` container) within the ref'd region.
 *
 * Listens to `selectionchange` (debounced a tick) so keyboard selections
 * (shift+arrows, ctrl/cmd+A inside a section) work, not just mouse drags.
 * Cross-section selections and selections leaking outside a section report
 * nothing. Touch is intentionally ignored (internal desktop tool).
 */
export function useTextSelection(
  regionRef: RefObject<HTMLElement | null>,
  enabled: boolean = true
) {
  const [selection, setSelection] = useState<TextSelectionState | null>(null);
  const debounceRef = useRef<number | null>(null);
  // True while the primary mouse button is held down (a drag-selection in
  // progress). We must NOT report a selection mid-drag: the floating button
  // would mount under the cursor, and dragging across a fixed-position
  // overlay extends the browser selection to the overlay's DOM position —
  // which sits AFTER all page content, so the selection visually explodes
  // to "everything to the end of the page" and then collapses when the
  // cross-section result unmounts the button again.
  const mouseDownRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setSelection(null);
      return;
    }

    const evaluate = () => {
      const region = regionRef.current;
      const domSelection = window.getSelection();
      if (
        !region ||
        !domSelection ||
        domSelection.rangeCount === 0 ||
        domSelection.isCollapsed
      ) {
        setSelection(null);
        return;
      }

      const range = domSelection.getRangeAt(0);
      if (!region.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }

      // Both endpoints must resolve to the SAME section container.
      const container = findSectionContainer(range.startContainer);
      if (!container || container !== findSectionContainer(range.endContainer)) {
        setSelection(null);
        return;
      }

      const key = container.getAttribute('data-section-key');
      if (!key || !(SOW_SECTION_KEYS as string[]).includes(key)) {
        setSelection(null);
        return;
      }

      const anchor = rangeToAnchor(range, container);
      if (!anchor) {
        setSelection(null);
        return;
      }

      setSelection({
        anchor,
        sectionKey: key as SOWSectionKey,
        rect: range.getBoundingClientRect(),
      });
    };

    const onSelectionChange = () => {
      // Never evaluate mid-drag (see mouseDownRef above) — the selection is
      // reported once, on mouseup. The debounced path handles keyboard
      // selections (shift+arrows etc.), which happen with the mouse up.
      if (mouseDownRef.current) return;
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(evaluate, 120);
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      // The floating button preventDefaults its own mousedown to keep the
      // selection alive — don't treat that as the start of a new drag.
      if (event.defaultPrevented) return;
      mouseDownRef.current = true;
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      // A fresh press anywhere dismisses the previous selection report.
      setSelection(null);
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button !== 0) return;
      mouseDownRef.current = false;
      // Evaluate after the browser finalizes the selection for this mouseup.
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(evaluate, 0);
    };

    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [regionRef, enabled]);

  /** Dismiss the reported selection AND collapse the browser selection. */
  const clear = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, []);

  return { selection, clear };
}
