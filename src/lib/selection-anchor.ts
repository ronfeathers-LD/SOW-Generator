import {
  ANCHOR_CONTEXT_LENGTH,
  MAX_QUOTED_TEXT_LENGTH,
  resolveAnchorInText,
} from './comment-anchors';

/**
 * Client-side Range ↔ anchor mapping (#349 P4 / #350 P5 of anchored comments).
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

/**
 * Stored anchor fields as they come back from the API — context/offsets may
 * be null on rows predating the anchor columns; treated as "no hint".
 */
export interface StoredAnchor {
  quoted_text: string;
  context_prefix?: string | null;
  context_suffix?: string | null;
  start_offset?: number | null;
  end_offset?: number | null;
}

/**
 * Map a textContent offset to a DOM boundary point (text node + offset)
 * inside `container`.
 *
 * When the offset falls exactly between two text nodes the two edges differ:
 * a 'start' boundary belongs at the HEAD of the node that contains the first
 * selected character (offset < consumed + len), an 'end' boundary at the TAIL
 * of the node that contains the last one (offset <= consumed + len). This
 * keeps round-tripped ranges hugging the quoted text rather than spilling
 * onto empty neighbours.
 */
function textOffsetToBoundary(
  container: HTMLElement,
  offset: number,
  edge: 'start' | 'end'
): { node: Text; offset: number } | null {
  const doc = container.ownerDocument ?? document;
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let consumed = 0;
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const len = node.data.length;
    const within = edge === 'start' ? offset < consumed + len : offset <= consumed + len;
    if (within && offset >= consumed) {
      return { node, offset: offset - consumed };
    }
    consumed += len;
  }
  return null;
}

/**
 * The inverse of `rangeToAnchor` (#350): resolve a STORED anchor against a
 * live section container to a DOM Range, sharing `validateAnchor`'s exact
 * resolution semantics via `resolveAnchorInText` (exact offsets → unique
 * quote → context disambiguation).
 *
 * Returns null when the quote no longer occurs in the container's anchor
 * text — the comment is ORPHANED and must not be highlighted (never guess).
 *
 * Guarantee on a non-null result: `range.toString() === anchor.quoted_text`
 * (Range#toString IS the textContent coordinate space — see module header).
 */
export function anchorToRange(
  anchor: StoredAnchor,
  container: HTMLElement
): Range | null {
  const text = container.textContent ?? '';
  const resolved = resolveAnchorInText(text, {
    quoted_text: anchor.quoted_text,
    context_prefix: anchor.context_prefix ?? '',
    context_suffix: anchor.context_suffix ?? '',
    start_offset: anchor.start_offset ?? -1,
  });
  if (!resolved) return null;

  const start = textOffsetToBoundary(container, resolved.start_offset, 'start');
  const end = textOffsetToBoundary(container, resolved.end_offset, 'end');
  if (!start || !end) return null; // defensive: offsets come from `text` itself

  const range = (container.ownerDocument ?? document).createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  return range;
}
