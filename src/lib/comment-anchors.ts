import DOMPurify from 'isomorphic-dompurify';
import { SANITIZE_HTML_CONFIG } from './sanitize-html';
import { SOW_SECTION_KEYS, type SOWSectionKey } from './sow-content';

/**
 * Comment anchors (#348): quote + context anchoring, W3C Web Annotation style.
 *
 * An anchor binds a comment to a text selection inside one rendered SOW
 * section: `section_key` names the section, `quoted_text` is the exact
 * selected text, `context_prefix`/`context_suffix` are ~30 chars of
 * surrounding text for disambiguation, and `[start_offset, end_offset)` are
 * character offsets into the section's ANCHOR TEXT — a hint, not
 * authoritative (quote + context win when the offsets drift).
 *
 * ════════════════════════════════════════════════════════════════════════
 * THE ANCHOR-TEXT CONVENTION (load-bearing for P4/P5 — do not change)
 * ════════════════════════════════════════════════════════════════════════
 * The anchor text of a section is the DOM `textContent` of its sanitized
 * HTML: the concatenation of every text node's data, in document order,
 * with NO separators inserted at element boundaries and NO whitespace
 * normalization of any kind.
 *
 *   - `<p>a</p><p>b</p>`  →  "ab"   (block elements contribute NOTHING —
 *     not a space, not a newline. A quote spanning two paragraphs therefore
 *     joins them with no separator: selecting "one." + "Two" yields
 *     quoted_text "one.Two".)
 *   - `<p>Hello <strong>world</strong></p>` → "Hello world" (inline markup
 *     is transparent; the literal space inside the text node is preserved).
 *   - Entities are decoded (`&amp;` → "&"); `<br>` contributes nothing.
 *
 * WHY textContent and not visual text (innerText): client-side, mapping a
 * user's `Range` selection to offsets is exact and CSS-independent when the
 * coordinate space is textContent — walk the section container's text nodes
 * in document order, summing `node.data.length`. `innerText` is
 * layout-dependent (inserts \n per CSS display) and cannot be reproduced
 * byte-for-byte on the server. P4 MUST therefore:
 *   - scope to the element that received the sanitized section HTML (the
 *     `data-section-key` container rendered by SOWSectionContent), and
 *   - compute offsets via a text-node walk / `container.textContent` —
 *     NEVER via `innerText` or any whitespace-normalized variant.
 * Display code may prettify quoted_text (e.g. show "one. … Two"); the STORED
 * anchor fields always use this raw convention.
 * ════════════════════════════════════════════════════════════════════════
 */

/** Characters of surrounding context captured on each side of a selection. */
export const ANCHOR_CONTEXT_LENGTH = 30;

/** Reject absurdly large selections — anchors are for passages, not pages. */
export const MAX_QUOTED_TEXT_LENGTH = 2000;

/** Sanity cap on stored context (clients send ~ANCHOR_CONTEXT_LENGTH). */
export const MAX_CONTEXT_LENGTH = 100;

export interface CommentAnchorInput {
  section_key: SOWSectionKey;
  quoted_text: string;
  /** Empty string when the selection starts at the very top of the section. */
  context_prefix: string;
  /** Empty string when the selection ends at the very end of the section. */
  context_suffix: string;
  start_offset: number;
  end_offset: number;
}

export type AnchorParseResult =
  | { ok: true; anchor: CommentAnchorInput }
  | { ok: false; error: string };

/**
 * Validate the SHAPE of an untrusted anchor payload (types, ranges, lengths,
 * known section key). Content validation against the section HTML is
 * `validateAnchor`'s job.
 */
export function parseAnchorInput(raw: unknown): AnchorParseResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'anchor must be an object' };
  }
  const a = raw as Record<string, unknown>;

  if (
    typeof a.section_key !== 'string' ||
    !(SOW_SECTION_KEYS as string[]).includes(a.section_key)
  ) {
    return {
      ok: false,
      error: `anchor.section_key must be one of: ${SOW_SECTION_KEYS.join(', ')}`,
    };
  }
  if (typeof a.quoted_text !== 'string' || a.quoted_text.length === 0) {
    return { ok: false, error: 'anchor.quoted_text must be a non-empty string' };
  }
  if (a.quoted_text.length > MAX_QUOTED_TEXT_LENGTH) {
    return {
      ok: false,
      error: `anchor.quoted_text exceeds ${MAX_QUOTED_TEXT_LENGTH} characters — select a smaller passage`,
    };
  }
  for (const field of ['context_prefix', 'context_suffix'] as const) {
    const value = a[field];
    if (typeof value !== 'string') {
      return { ok: false, error: `anchor.${field} must be a string (may be empty)` };
    }
    if (value.length > MAX_CONTEXT_LENGTH) {
      return { ok: false, error: `anchor.${field} exceeds ${MAX_CONTEXT_LENGTH} characters` };
    }
  }
  for (const field of ['start_offset', 'end_offset'] as const) {
    const value = a[field];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      return { ok: false, error: `anchor.${field} must be a non-negative integer` };
    }
  }
  const start = a.start_offset as number;
  const end = a.end_offset as number;
  if (end - start !== (a.quoted_text as string).length) {
    return {
      ok: false,
      error: 'anchor offsets must satisfy end_offset - start_offset === quoted_text.length',
    };
  }

  return {
    ok: true,
    anchor: {
      section_key: a.section_key as SOWSectionKey,
      quoted_text: a.quoted_text as string,
      context_prefix: a.context_prefix as string,
      context_suffix: a.context_suffix as string,
      start_offset: start,
      end_offset: end,
    },
  };
}

/**
 * HTML → anchor text (see the convention block above).
 *
 * Implementation: sanitize with the SHARED rich-text config and
 * `RETURN_DOM: true`. Server-side, isomorphic-dompurify backs this with its
 * bundled jsdom, so `.textContent` of the returned body is the spec-defined
 * DOM textContent — identical to what a browser computes for the same
 * sanitized HTML (both parse per the WHATWG HTML spec). No extra dependency
 * needed. Sanitizing here is idempotent over already-canonicalized content
 * (#346), so stored section HTML round-trips byte-stable.
 */
export function htmlToAnchorText(html: string | null | undefined): string {
  if (!html) return '';
  const body = DOMPurify.sanitize(String(html), {
    ...SANITIZE_HTML_CONFIG,
    ALLOWED_TAGS: [...SANITIZE_HTML_CONFIG.ALLOWED_TAGS],
    ALLOWED_ATTR: [...SANITIZE_HTML_CONFIG.ALLOWED_ATTR],
    ADD_ATTR: [...SANITIZE_HTML_CONFIG.ADD_ATTR],
    RETURN_DOM: true,
  });
  return body.textContent ?? '';
}

export type AnchorValidationResult =
  /** quoted_text found exactly at [start_offset, end_offset). */
  | { status: 'ok' }
  /** quoted_text found, but elsewhere — use these offsets instead. */
  | { status: 'adjusted'; start_offset: number; end_offset: number }
  /** quoted_text does not occur in the section's anchor text at all. */
  | { status: 'not_found'; reason: string };

function findAllOccurrences(haystack: string, needle: string): number[] {
  const indices: number[] = [];
  let from = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    indices.push(idx);
    from = idx + 1; // allow overlapping occurrences
  }
  return indices;
}

/** How well the stored context matches around an occurrence (higher wins). */
function contextScore(
  text: string,
  index: number,
  quotedLength: number,
  prefix: string,
  suffix: string
): number {
  let score = 0;
  if (prefix.length > 0 && text.endsWith(prefix, index)) score += 1;
  if (suffix.length > 0 && text.startsWith(suffix, index + quotedLength)) score += 1;
  return score;
}

/** The anchor fields the pure text resolver needs (offsets are a hint). */
export type AnchorQuery = Pick<
  CommentAnchorInput,
  'quoted_text' | 'context_prefix' | 'context_suffix' | 'start_offset'
>;

export type AnchorTextResolution = {
  start_offset: number;
  end_offset: number;
  /** true when the quote sat exactly at the stored offsets (no drift). */
  exact: boolean;
};

/**
 * Resolve an anchor against a plain ANCHOR TEXT string (see the convention
 * block above). Pure string matching — no DOM, no sanitizer — so it is shared
 * verbatim between the server (`validateAnchor`, via `htmlToAnchorText`) and
 * the client (`anchorToRange` in selection-anchor.ts, via the live section
 * container's `textContent`). Both sides therefore implement the SAME
 * precedence:
 *   1. Exact: quoted_text occurs at [start_offset, end_offset) → exact.
 *   2. Otherwise find every occurrence of quoted_text:
 *      - none → null (server: 'not_found' / client: orphan — never guess).
 *      - one  → that occurrence (offset drift).
 *      - many → disambiguate by context_prefix/context_suffix match score;
 *        among the best-scoring candidates, pick the one closest to the
 *        start_offset hint. (Offsets are explicitly a tiebreak hint here —
 *        with identical quote AND identical context there is no stronger
 *        signal available until block_id lands.)
 */
export function resolveAnchorInText(
  text: string,
  anchor: AnchorQuery
): AnchorTextResolution | null {
  const { quoted_text, context_prefix, context_suffix, start_offset } = anchor;

  if (text.length === 0 || quoted_text.length === 0) return null;

  // 1. Exact position match.
  if (
    start_offset >= 0 &&
    start_offset + quoted_text.length <= text.length &&
    text.startsWith(quoted_text, start_offset)
  ) {
    return {
      start_offset,
      end_offset: start_offset + quoted_text.length,
      exact: true,
    };
  }

  // 2. Quote search.
  const occurrences = findAllOccurrences(text, quoted_text);
  if (occurrences.length === 0) return null;

  let best = occurrences[0];
  if (occurrences.length > 1) {
    let bestScore = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const idx of occurrences) {
      const score = contextScore(
        text,
        idx,
        quoted_text.length,
        context_prefix,
        context_suffix
      );
      const distance = Math.abs(idx - start_offset);
      if (score > bestScore || (score === bestScore && distance < bestDistance)) {
        best = idx;
        bestScore = score;
        bestDistance = distance;
      }
    }
  }

  return {
    start_offset: best,
    end_offset: best + quoted_text.length,
    exact: false,
  };
}

/**
 * Validate an anchor against a section's current HTML (server-side gate for
 * POST). Thin wrapper over `resolveAnchorInText` — see it for the resolution
 * order — translating its result into the API's three-way status.
 */
export function validateAnchor(
  anchor: CommentAnchorInput,
  sectionHtml: string | null | undefined
): AnchorValidationResult {
  const text = htmlToAnchorText(sectionHtml);

  if (text.length === 0) {
    return {
      status: 'not_found',
      reason: 'Section has no stored content to anchor against',
    };
  }

  const resolved = resolveAnchorInText(text, anchor);
  if (!resolved) {
    return {
      status: 'not_found',
      reason: 'Quoted text not found in the section content',
    };
  }
  if (resolved.exact) return { status: 'ok' };
  return {
    status: 'adjusted',
    start_offset: resolved.start_offset,
    end_offset: resolved.end_offset,
  };
}
