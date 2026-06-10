import {
  ANCHOR_CONTEXT_LENGTH,
  MAX_QUOTED_TEXT_LENGTH,
} from './comment-anchors';

/**
 * Client-side Range → anchor mapping (#349, P4 of anchored comments).
 *
 * Pure DOM, no React. Maps a user's text selection (a DOM `Range`) inside a
 * rendered SOW section container (the `[data-section-key]` element emitted by
 * SOWSectionContent) to character offsets in the section's ANCHOR TEXT.
 *
 * THE COORDINATE SPACE (must match src/lib/comment-anchors.ts exactly):
 * anchor text is the container's `textContent` — concatenation of text-node
 * data in document order, NO separators at block boundaries, NO whitespace
 * normalization, entities decoded. NEVER `innerText` (layout-dependent).
 *
 * Implementation note: a boundary point's offset is computed by building a
 * range from the start of the container to that boundary and taking
 * `Range#toString().length`. Per the DOM spec, `Range#toString()` is the
 * concatenation of the data of contained Text nodes (sliced for partially
 * contained ones) — exactly the textContent convention. This handles
 * endpoints inside text nodes AND on element boundaries (e.g. triple-click
 * paragraph selection sets endpoints to (element, childIndex)) uniformly.
 */

/** The anchor fields a selection yields; `section_key` is added by the caller. */
export interface SelectionAnchor {
  quoted_text: string;
  context_prefix: string;
  context_suffix: string;
  start_offset: number;
  end_offset: number;
}

/**
 * Nearest ancestor (or self) element carrying `data-section-key` — the
 * container SOWSectionContent renders each SOW section body into.
 */
export function findSectionContainer(node: Node): HTMLElement | null {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement;
  return element?.closest<HTMLElement>('[data-section-key]') ?? null;
}

/**
 * Offset of a range boundary point within `container.textContent`.
 * Assumes the boundary point is inside `container`.
 */
function boundaryPointOffset(
  container: HTMLElement,
  node: Node,
  offset: number
): number {
  const probe = (container.ownerDocument ?? document).createRange();
  probe.selectNodeContents(container);
  probe.setEnd(node, offset);
  return probe.toString().length;
}

/**
 * Map a DOM Range to anchor fields in the container's textContent coordinate
 * space. Returns null when the range:
 *  - is collapsed,
 *  - is not FULLY inside `container`, or
 *  - selects no text / more than MAX_QUOTED_TEXT_LENGTH characters.
 *
 * Guarantees on a non-null result (relied on by the API's validateAnchor):
 *  - quoted_text === container.textContent.slice(start_offset, end_offset)
 *  - context_prefix / context_suffix are the up-to-ANCHOR_CONTEXT_LENGTH
 *    characters of textContent immediately before / after the selection
 *    (empty at section edges).
 */
export function rangeToAnchor(
  range: Range,
  container: HTMLElement
): SelectionAnchor | null {
  if (range.collapsed) return null;

  // Both endpoints must be inside the container. commonAncestorContainer is
  // the deepest node containing both endpoints, so one containment check
  // covers both; it also rejects ranges that merely overlap the container.
  if (!container.contains(range.commonAncestorContainer)) return null;

  const text = container.textContent ?? '';
  const start = boundaryPointOffset(
    container,
    range.startContainer,
    range.startOffset
  );
  const end = boundaryPointOffset(container, range.endContainer, range.endOffset);

  // A non-collapsed range can still select zero TEXT (e.g. endpoints on
  // element boundaries around an empty paragraph or an <img>).
  if (end <= start) return null;
  if (end - start > MAX_QUOTED_TEXT_LENGTH) return null;

  return {
    quoted_text: text.slice(start, end),
    context_prefix: text.slice(Math.max(0, start - ANCHOR_CONTEXT_LENGTH), start),
    context_suffix: text.slice(end, end + ANCHOR_CONTEXT_LENGTH),
    start_offset: start,
    end_offset: end,
  };
}
