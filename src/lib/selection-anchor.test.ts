// @vitest-environment jsdom
//
// These tests need a real DOM (Range, TreeWalker, Selection geometry). The
// repo's default vitest environment is node (isomorphic-dompurify bundles its
// own jsdom), so this file opts into the jsdom environment per-file; jsdom is
// already resolvable (vitest's own dependency, deduped at the root).
import { describe, it, expect } from 'vitest';
import {
  rangeToAnchor,
  findSectionContainer,
  type SelectionAnchor,
} from './selection-anchor';
import {
  htmlToAnchorText,
  ANCHOR_CONTEXT_LENGTH,
  MAX_QUOTED_TEXT_LENGTH,
} from './comment-anchors';

/** Mount section HTML the way SOWSectionContent renders it. */
function mountSection(html: string, key = 'intro'): HTMLElement {
  document.body.innerHTML = `<div data-section-key="${key}">${html}</div><p id="outside">outside text</p>`;
  return document.querySelector<HTMLElement>('[data-section-key]')!;
}

/** All text nodes under `root`, in document order. */
function textNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  return nodes;
}

/**
 * Build a Range whose endpoints are character positions in the container's
 * textContent coordinate space, placing each endpoint inside the text node
 * that covers it (mimics a real user drag selection).
 */
function rangeAt(container: HTMLElement, start: number, end: number): Range {
  const range = document.createRange();
  let consumed = 0;
  let startSet = false;
  for (const node of textNodes(container)) {
    const len = node.data.length;
    if (!startSet && start <= consumed + len) {
      range.setStart(node, start - consumed);
      startSet = true;
    }
    if (startSet && end <= consumed + len) {
      range.setEnd(node, end - consumed);
      return range;
    }
    consumed += len;
  }
  throw new Error(`offsets [${start}, ${end}) exceed container text (${consumed})`);
}

/** The invariant every successful mapping must satisfy. */
function assertAnchorInvariants(container: HTMLElement, anchor: SelectionAnchor) {
  const text = container.textContent ?? '';
  expect(text.slice(anchor.start_offset, anchor.end_offset)).toBe(anchor.quoted_text);
  expect(anchor.context_prefix).toBe(
    text.slice(Math.max(0, anchor.start_offset - ANCHOR_CONTEXT_LENGTH), anchor.start_offset)
  );
  expect(anchor.context_suffix).toBe(
    text.slice(anchor.end_offset, anchor.end_offset + ANCHOR_CONTEXT_LENGTH)
  );
}

describe('findSectionContainer', () => {
  it('finds the section container from a nested text node', () => {
    const container = mountSection('<p>Hello <strong>world</strong></p>');
    const strongText = textNodes(container)[1];
    expect(findSectionContainer(strongText)).toBe(container);
  });

  it('finds the container from an element node and from the container itself', () => {
    const container = mountSection('<p>Hello</p>');
    expect(findSectionContainer(container.querySelector('p')!)).toBe(container);
    expect(findSectionContainer(container)).toBe(container);
  });

  it('returns null for nodes outside any section', () => {
    mountSection('<p>Hello</p>');
    const outside = document.getElementById('outside')!;
    expect(findSectionContainer(outside)).toBeNull();
    expect(findSectionContainer(outside.firstChild!)).toBeNull();
  });
});

describe('rangeToAnchor — basics', () => {
  it('maps a selection inside a single text node', () => {
    const container = mountSection('<p>The quick brown fox jumps over the lazy dog.</p>');
    const anchor = rangeToAnchor(rangeAt(container, 10, 19), container)!;
    expect(anchor.quoted_text).toBe('brown fox');
    expect(anchor.start_offset).toBe(10);
    expect(anchor.end_offset).toBe(19);
    expect(anchor.context_prefix).toBe('The quick ');
    expect(anchor.context_suffix).toBe(' jumps over the lazy dog.');
    assertAnchorInvariants(container, anchor);
  });

  it('returns null for a collapsed range', () => {
    const container = mountSection('<p>Hello world</p>');
    expect(rangeToAnchor(rangeAt(container, 3, 3), container)).toBeNull();
  });

  it('returns null when the range is not fully inside the container', () => {
    const container = mountSection('<p>Hello world</p>');
    const outsideText = document.getElementById('outside')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNodes(container)[0], 2);
    range.setEnd(outsideText, 4); // ends outside the section
    expect(rangeToAnchor(range, container)).toBeNull();

    const fullyOutside = document.createRange();
    fullyOutside.setStart(outsideText, 0);
    fullyOutside.setEnd(outsideText, 7);
    expect(rangeToAnchor(fullyOutside, container)).toBeNull();
  });

  it('returns null when the selection exceeds MAX_QUOTED_TEXT_LENGTH', () => {
    const long = 'x'.repeat(MAX_QUOTED_TEXT_LENGTH + 10);
    const container = mountSection(`<p>${long}</p>`);
    expect(rangeToAnchor(rangeAt(container, 0, MAX_QUOTED_TEXT_LENGTH + 1), container)).toBeNull();
    // exactly at the limit is allowed
    const ok = rangeToAnchor(rangeAt(container, 0, MAX_QUOTED_TEXT_LENGTH), container);
    expect(ok?.quoted_text.length).toBe(MAX_QUOTED_TEXT_LENGTH);
  });

  it('returns null for a non-collapsed range that selects no text', () => {
    const container = mountSection('<p>a</p><p><br></p><p>b</p>');
    const emptyP = container.querySelectorAll('p')[1];
    const range = document.createRange();
    range.selectNodeContents(emptyP); // spans the <br>, zero characters
    expect(range.collapsed).toBe(false);
    expect(rangeToAnchor(range, container)).toBeNull();
  });

  it('produces empty prefix/suffix at the section edges', () => {
    const container = mountSection('<p>edge case text</p>');
    const startAnchor = rangeToAnchor(rangeAt(container, 0, 4), container)!;
    expect(startAnchor.context_prefix).toBe('');
    const text = container.textContent!;
    const endAnchor = rangeToAnchor(rangeAt(container, text.length - 4, text.length), container)!;
    expect(endAnchor.context_suffix).toBe('');
  });
});

describe('rangeToAnchor — markup structures', () => {
  it('handles a selection straddling a <strong> span edge', () => {
    const container = mountSection('<p>Hello <strong>brave new</strong> world</p>');
    // textContent: "Hello brave new world" — select "llo brav" (2..10)
    const anchor = rangeToAnchor(rangeAt(container, 2, 10), container)!;
    expect(anchor.quoted_text).toBe('llo brav');
    assertAnchorInvariants(container, anchor);
  });

  it('handles a selection straddling both edges of a link', () => {
    const container = mountSection(
      '<p>See <a href="https://example.com">the docs</a> for details</p>'
    );
    // textContent: "See the docs for details" — select "e the docs fo" (2..15)
    const anchor = rangeToAnchor(rangeAt(container, 2, 15), container)!;
    expect(anchor.quoted_text).toBe('e the docs fo');
    assertAnchorInvariants(container, anchor);
  });

  it('handles selections across table cells and rows (no separators)', () => {
    const container = mountSection(
      '<table><thead><tr><th>Phase</th><th>Hours</th></tr></thead>' +
        '<tbody><tr><td>Build</td><td>40</td></tr><tr><td>Test</td><td>20</td></tr></tbody></table>'
    );
    // textContent: "PhaseHoursBuild40Test20"
    expect(container.textContent).toBe('PhaseHoursBuild40Test20');
    // from inside "Build" through inside "Test": "ild40Te" (12..19)
    const anchor = rangeToAnchor(rangeAt(container, 12, 19), container)!;
    expect(anchor.quoted_text).toBe('ild40Te');
    assertAnchorInvariants(container, anchor);
  });

  it('handles selections across nested list items', () => {
    const container = mountSection(
      '<ul><li>alpha<ul><li>beta</li><li>gamma</li></ul></li><li>delta</li></ul>'
    );
    // textContent: "alphabetagammadelta"
    expect(container.textContent).toBe('alphabetagammadelta');
    // from inside "beta" through inside "delta": "etagammade" (6..16)
    const anchor = rangeToAnchor(rangeAt(container, 6, 16), container)!;
    expect(anchor.quoted_text).toBe('etagammade');
    assertAnchorInvariants(container, anchor);
  });

  it('joins multi-paragraph selections with NO separator (block convention)', () => {
    const container = mountSection('<p>First paragraph ends here.</p><p>Second starts now.</p>');
    // textContent: "First paragraph ends here.Second starts now."
    const anchor = rangeToAnchor(rangeAt(container, 16, 32), container)!;
    expect(anchor.quoted_text).toBe('ends here.Second');
    expect(anchor.quoted_text).not.toContain('. S'); // NOT innerText spacing
    assertAnchorInvariants(container, anchor);
  });

  it('handles endpoints on ELEMENT boundaries (triple-click style selection)', () => {
    const container = mountSection('<p>one</p><p>two</p><p>three</p>');
    const paragraphs = container.querySelectorAll('p');
    const range = document.createRange();
    range.setStart(paragraphs[1], 0); // before "two"'s text node
    range.setEnd(paragraphs[1], paragraphs[1].childNodes.length); // after it
    const anchor = rangeToAnchor(range, container)!;
    expect(anchor.quoted_text).toBe('two');
    expect(anchor.start_offset).toBe(3);
    expect(anchor.end_offset).toBe(6);
    assertAnchorInvariants(container, anchor);
  });

  it('handles selectNodeContents over the whole container', () => {
    const container = mountSection('<h2>Title</h2><p>Body &amp; soul</p>');
    const range = document.createRange();
    range.selectNodeContents(container);
    const anchor = rangeToAnchor(range, container)!;
    expect(anchor.quoted_text).toBe('TitleBody & soul'); // entities decoded
    assertAnchorInvariants(container, anchor);
  });

  it('preserves whitespace inside text nodes verbatim', () => {
    const container = mountSection('<p>a  b\n c</p>');
    const range = document.createRange();
    range.selectNodeContents(container);
    const anchor = rangeToAnchor(range, container)!;
    expect(anchor.quoted_text).toBe('a  b\n c');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE CROSS-CHECK: client (rangeToAnchor over live DOM) and server
// (htmlToAnchorText over the stored HTML) must agree on the coordinate space.
// For the same HTML, offsets produced by the client MUST index the server's
// anchor text — this is what makes the API's validateAnchor return 'ok'.
// ─────────────────────────────────────────────────────────────────────────────
describe('client/server convention cross-check', () => {
  const fixtures = [
    '<p>Hello <strong>world</strong></p>',
    '<p>a</p><p>b</p>',
    '<p>Fish &amp; Chips &lt;tasty&gt;</p>',
    'line1<br>line2',
    '<h2>Title</h2><ul><li>x</li><li>y</li></ul>',
    '<ul><li>alpha<ul><li>beta</li><li>gamma</li></ul></li><li>delta</li></ul>',
    '<table><tbody><tr><td>A1</td><td><strong>B1</strong></td></tr>' +
      '<tr><td>A2</td><td>B2</td></tr></tbody></table>',
    '<p>See <a href="https://example.com" target="_blank">the docs</a> now.</p>' +
      '<blockquote>quoted &quot;wisdom&quot;</blockquote>',
    '<p>The quick brown fox jumps over the lazy dog. ' +
      'Pack my box with five dozen liquor jugs.</p><p>Sphinx of black quartz.</p>',
  ];

  it('container.textContent equals htmlToAnchorText for every fixture', () => {
    for (const html of fixtures) {
      const container = mountSection(html);
      expect(container.textContent).toBe(htmlToAnchorText(html));
    }
  });

  it('client offsets index the SERVER anchor text exactly', () => {
    for (const html of fixtures) {
      const serverText = htmlToAnchorText(html);
      if (serverText.length < 2) continue;
      const container = mountSection(html);
      // a selection spanning the middle of the section
      const start = Math.floor(serverText.length / 4);
      const end = Math.max(start + 1, Math.floor((serverText.length * 3) / 4));
      const anchor = rangeToAnchor(rangeAt(container, start, end), container)!;
      expect(anchor).not.toBeNull();
      // the load-bearing assertion: server-side slice reproduces the quote
      expect(serverText.slice(anchor.start_offset, anchor.end_offset)).toBe(
        anchor.quoted_text
      );
      expect(serverText.endsWith(anchor.context_prefix, anchor.start_offset)).toBe(true);
      expect(serverText.startsWith(anchor.context_suffix, anchor.end_offset)).toBe(true);
    }
  });

  it('property: random text-node ranges always satisfy the slice invariant', () => {
    // deterministic LCG so failures are reproducible
    let seed = 0xc0ffee;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };

    for (const html of fixtures) {
      const container = mountSection(html);
      const serverText = htmlToAnchorText(html);
      const nodes = textNodes(container);
      if (nodes.length === 0) continue;

      for (let i = 0; i < 50; i++) {
        // pick two (node, offset) boundary points and order them
        const pick = () => {
          const node = nodes[rand(nodes.length)];
          return { node, offset: rand(node.data.length + 1) };
        };
        const a = pick();
        const b = pick();
        const range = document.createRange();
        range.setStart(a.node, a.offset);
        range.setEnd(a.node, a.offset);
        // setEnd before setStart can invert; use comparePoint via try-order
        const cmp = range.comparePoint(b.node, b.offset);
        if (cmp >= 0) {
          range.setEnd(b.node, b.offset);
        } else {
          range.setStart(b.node, b.offset);
          range.setEnd(a.node, a.offset);
        }

        const anchor = rangeToAnchor(range, container);
        if (range.toString().length === 0) {
          expect(anchor).toBeNull();
          continue;
        }
        expect(anchor).not.toBeNull();
        assertAnchorInvariants(container, anchor!);
        expect(serverText.slice(anchor!.start_offset, anchor!.end_offset)).toBe(
          anchor!.quoted_text
        );
      }
    }
  });
});
