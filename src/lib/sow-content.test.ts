import { describe, it, expect } from 'vitest';
import {
  canonicalizeContent,
  canonicalizeContentColumns,
  SOW_SECTION_CONTENT_COLUMNS,
  SOW_SECTION_KEYS,
} from './sow-content';
import { sanitizeHtml } from './sanitize-html';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Nasty inputs canonicalizeContent must be idempotent over. These mirror what
 * the TipTap editor, AI generation, and legacy rows actually produce.
 */
const NASTY_INPUTS: Array<[name: string, html: string]> = [
  ['simple paragraph', '<p>Hello world</p>'],
  ['plain text, no markup', 'just some text'],
  ['unclosed tags', '<p>one<p>two'],
  ['mis-nested inline tags', '<p><strong>bold <em>both</strong> italic</em></p>'],
  [
    'table without tbody (parser inserts it)',
    '<table><tr><th>H</th></tr><tr><td>cell</td></tr></table>',
  ],
  [
    'full TipTap table with colgroup and attrs',
    '<table class="tiptap-table"><colgroup><col width="100"><col></colgroup><tbody><tr><td colspan="2" rowspan="1"><p>merged</p></td></tr></tbody></table>',
  ],
  [
    'nested lists',
    '<ul><li>one<ul><li>one.a</li><li>one.b<ol><li>deep</li></ol></li></ul></li><li>two</li></ul>',
  ],
  ['li without list container', '<li>orphan item</li><li>second orphan</li>'],
  ['&nbsp; entities', '<p>before&nbsp;&nbsp;after</p><p>&nbsp;</p>'],
  ['raw non-breaking space character', '<p>a b</p>'],
  [
    'mixed whitespace: tabs, CRLF, trailing blank lines',
    '<p>line one</p>\r\n\t<p>line\ttwo</p>\r\n\r\n  ',
  ],
  [
    '<pre> block with significant inner whitespace',
    '<pre><code>function f() {\n\treturn  1;   \n}\n\n</code></pre>',
  ],
  ['<pre> with CRLF inside', '<pre>a\r\nb\rc</pre>'],
  ['script injection', '<p>safe</p><script>alert("xss")</script>'],
  ['event handler attribute', '<p onclick="alert(1)">click me</p>'],
  ['javascript: URL', '<a href="javascript:alert(1)">link</a>'],
  ['img with onerror', '<img src="x" onerror="alert(1)" alt="pic">'],
  ['unknown tags stripped, content kept', '<article><p>kept</p></article>'],
  ['stray ampersands and entities', '<p>a & b &amp; c &lt;d&gt; &quot;e&quot;</p>'],
  ['attributes with mixed quoting', "<p class='single'><span class=\"double\">x</span></p>"],
  ['comment nodes', '<p>visible</p><!-- hidden comment --><p>also visible</p>'],
  ['leading/trailing whitespace around markup', '   \n\t<p> padded </p>\n\n '],
  ['empty string', ''],
  [
    'kitchen sink',
    '<h2>Title</h2>\r\n<p>Intro&nbsp;text with <strong>bold</strong> and <a href="https://example.com" target="_blank">a link</a>.</p><ul><li>item<table><tr><td>nested table in li</td></tr></table></li></ul><pre>  keep   me  </pre>',
  ],
];

/** textContent of an HTML string, via the same DOM pipeline the app uses. */
function textContentOf(html: string): string {
  const node = DOMPurify.sanitize(html, { RETURN_DOM: true }) as HTMLElement;
  return node.textContent ?? '';
}

describe('canonicalizeContent', () => {
  it('is idempotent for every nasty input', () => {
    for (const [name, input] of NASTY_INPUTS) {
      const once = canonicalizeContent(input);
      const twice = canonicalizeContent(once);
      expect(twice, `not idempotent for: ${name}`).toBe(once);
    }
  });

  it('passes null and undefined through unchanged', () => {
    expect(canonicalizeContent(null)).toBeNull();
    expect(canonicalizeContent(undefined)).toBeUndefined();
  });

  it('keeps empty string as empty string (not null)', () => {
    expect(canonicalizeContent('')).toBe('');
  });

  it('strips script tags and event handlers', () => {
    const out = canonicalizeContent(
      '<p onclick="alert(1)">hi</p><script>alert("xss")</script>'
    );
    expect(out).not.toContain('script');
    expect(out).not.toContain('onclick');
    expect(out).toContain('hi');
  });

  it('strips javascript: URLs', () => {
    const out = canonicalizeContent('<a href="javascript:alert(1)">link</a>');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('link');
  });

  it('does not collapse whitespace inside <pre> blocks', () => {
    const pre = '<pre>line  with   spaces\n\tand a tab\n</pre>';
    const out = canonicalizeContent(pre) as string;
    expect(out).toContain('line  with   spaces\n\tand a tab\n');
  });

  it('normalizes CRLF and CR to LF', () => {
    expect(canonicalizeContent('<pre>a\r\nb\rc</pre>')).toBe(
      canonicalizeContent('<pre>a\nb\nc</pre>')
    );
  });

  it('trims outer whitespace deterministically', () => {
    expect(canonicalizeContent('  <p>x</p>\n\n')).toBe(
      canonicalizeContent('<p>x</p>')
    );
  });

  it('textContent is stable across canonicalize → render-sanitize round-trips', () => {
    for (const [name, input] of NASTY_INPUTS) {
      const canonical = canonicalizeContent(input) as string;
      // Render path: sanitizeHtml is applied again at render time
      // (defense-in-depth). It must not alter the canonical bytes…
      expect(sanitizeHtml(canonical), `render sanitize changed bytes for: ${name}`).toBe(
        canonical
      );
      // …and therefore the rendered textContent of canonical content must be
      // identical no matter how many times it cycles through save → render.
      const text1 = textContentOf(canonical);
      const text2 = textContentOf(canonicalizeContent(canonical) as string);
      expect(text2, `textContent drifted for: ${name}`).toBe(text1);
    }
  });
});

describe('canonicalizeContentColumns', () => {
  it('canonicalizes only registered content columns and preserves null/undefined', () => {
    const update: Record<string, unknown> = {
      custom_intro_content: '  <p onclick="x()">intro</p>  ',
      custom_scope_content: null,
      custom_assumptions_content: undefined,
      // Non-content columns must be untouched even if they look like HTML.
      sow_title: '  <p>not content</p>  ',
      intro_content_edited: true,
    };

    const out = canonicalizeContentColumns(update);

    expect(out.custom_intro_content).toBe('<p>intro</p>');
    expect(out.custom_scope_content).toBeNull();
    expect(out.custom_assumptions_content).toBeUndefined();
    expect(out.sow_title).toBe('  <p>not content</p>  ');
    expect(out.intro_content_edited).toBe(true);
  });

  it('leaves absent columns absent', () => {
    const out = canonicalizeContentColumns({ status: 'draft' });
    expect(Object.keys(out)).toEqual(['status']);
  });
});

describe('section registry', () => {
  it('covers all ten content columns with matching key naming', () => {
    expect(SOW_SECTION_KEYS).toHaveLength(10);
    for (const key of SOW_SECTION_KEYS) {
      expect(SOW_SECTION_CONTENT_COLUMNS[key]).toBe(`custom_${key}_content`);
    }
  });
});
