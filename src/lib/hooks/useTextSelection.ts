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
      // Debounce: selectionchange fires continuously during a drag.
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(evaluate, 120);
    };

    document.addEventListener('selectionchange', onSelectionChange);
    // mouseup re-evaluates immediately so the button appears without the lag.
    document.addEventListener('mouseup', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('mouseup', onSelectionChange);
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
