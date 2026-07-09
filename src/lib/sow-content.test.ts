import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  canonicalizeContent,
  canonicalizeContentColumns,
  DEFAULT_PAYMENT_TERMS,
  getContentTemplate,
  getGlobalOrAnyTemplate,
  renderSectionHtml,
  resolveTemplatesForSegment,
  sectionLabel,
  SOW_SECTION_CONTENT_COLUMNS,
  SOW_SECTION_KEYS,
  SOW_SECTION_LABELS,
  SOW_SECTION_RENDER_TRANSFORMS,
  stripTableInlineStyles,
  substituteClientName,
} from './sow-content';
import { sanitizeHtml } from './sanitize-html';
import { processContent, textToHtml } from './text-to-html';
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

  it('has a non-empty human label for every section key, and nothing extra', () => {
    expect(Object.keys(SOW_SECTION_LABELS).sort()).toEqual(
      [...SOW_SECTION_KEYS].sort()
    );
    for (const key of SOW_SECTION_KEYS) {
      expect(SOW_SECTION_LABELS[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('sectionLabel falls back gracefully for unknown/missing keys', () => {
    expect(sectionLabel('scope')).toBe('Scope');
    expect(sectionLabel('out_of_scope')).toBe('Out of Scope');
    expect(sectionLabel('not_a_real_key')).toBe('not_a_real_key');
    expect(sectionLabel(null)).toBeNull();
    expect(sectionLabel(undefined)).toBeNull();
  });

  it('DEFAULT_PAYMENT_TERMS leads with the monthly-billing + "following Customer contact" language', () => {
    expect(DEFAULT_PAYMENT_TERMS).toBe(
      'Billed monthly, as incurred. Monthly fees shall be due upon receipt and sent to the following Customer contact:'
    );
  });
});

/**
 * EXACT replica of SOWIntroPage's introProcessor (the component is React and
 * can't be imported here) — if SOWIntroPage changes, this fixture and the
 * intro entry in SOW_SECTION_RENDER_TRANSFORMS must change together.
 */
function introProcessorReplica(content: string, clientName: string): string {
  let processedContent = processContent(content);
  if (clientName) {
    processedContent = processedContent.replace(
      /{clientName}/g,
      `<span class="font-bold">${clientName}</span>`
    );
  } else {
    processedContent = processedContent.replace(
      /{clientName}/g,
      '<span class="font-bold">[Client Name]</span>'
    );
  }
  return processedContent;
}

describe('renderSectionHtml / SOW_SECTION_RENDER_TRANSFORMS (#351)', () => {
  const INTRO_FIXTURE =
    '<p>This Statement of Work is entered into between {clientName} and LeanData, Inc. {clientName} agrees to the terms below.</p>';

  it('has a transform for every section key and nothing extra', () => {
    expect(Object.keys(SOW_SECTION_RENDER_TRANSFORMS).sort()).toEqual(
      [...SOW_SECTION_KEYS].sort()
    );
  });

  it('intro: matches SOWIntroPage introProcessor byte-for-byte (client name present)', () => {
    const rendered = renderSectionHtml('intro', INTRO_FIXTURE, {
      clientName: 'Acme Corp',
    });
    expect(rendered).toBe(introProcessorReplica(INTRO_FIXTURE, 'Acme Corp'));
    expect(rendered).toContain('Acme Corp');
    expect(rendered).not.toContain('{clientName}');
    // textContent parity with what the browser renders (render path applies
    // sanitizeHtml on top — must not change the visible text).
    expect(textContentOf(sanitizeHtml(rendered as string))).toBe(
      textContentOf(introProcessorReplica(INTRO_FIXTURE, 'Acme Corp'))
    );
  });

  it('intro: substitutes the [Client Name] placeholder when the client name is absent', () => {
    for (const missing of ['', null, undefined] as const) {
      const rendered = renderSectionHtml('intro', INTRO_FIXTURE, {
        clientName: missing,
      });
      expect(rendered).toBe(introProcessorReplica(INTRO_FIXTURE, ''));
      expect(rendered).toContain('[Client Name]');
      expect(rendered).not.toContain('{clientName}');
    }
  });

  it('substituteClientName replaces every occurrence', () => {
    expect(substituteClientName('{clientName} + {clientName}', 'X')).toBe(
      '<span class="font-bold">X</span> + <span class="font-bold">X</span>'
    );
  });

  it('processContent sections: canonical HTML without lists passes through unchanged', () => {
    const canonical = canonicalizeContent('<p>In scope: <strong>routing</strong>.</p>') as string;
    for (const key of ['scope', 'out_of_scope', 'assumptions', 'objectives_disclosure', 'key_objectives'] as const) {
      expect(renderSectionHtml(key, canonical)).toBe(canonical);
    }
  });

  it('processContent sections: canonical HTML with lists keeps textContent identical', () => {
    const canonical = canonicalizeContent(
      '<p>Items:</p><ul><li>one</li><li>two</li></ul>'
    ) as string;
    const rendered = renderSectionHtml('scope', canonical) as string;
    expect(rendered).toBe(processContent(canonical));
    expect(textContentOf(rendered)).toBe(textContentOf(canonical));
  });

  it('processContent sections: stored plain text renders through textToHtml', () => {
    const plain = 'First line\n\n- bullet one\n- bullet two';
    const rendered = renderSectionHtml('assumptions', plain);
    expect(rendered).toBe(textToHtml(plain));
    expect(rendered).toContain('<li');
  });

  it('project_phases: applies stripTableInlineStyles (textContent preserved)', () => {
    const stored =
      '<table style="min-width: 200px" class="tiptap-table"><tbody><tr><td style="width:50%">cell</td></tr></tbody></table>';
    const rendered = renderSectionHtml('project_phases', stored) as string;
    expect(rendered).toBe(stripTableInlineStyles(stored));
    expect(rendered).not.toContain('style=');
    expect(textContentOf(rendered)).toBe(textContentOf(stored));
  });

  it('raw sections pass stored HTML through untouched', () => {
    const html = '<p>raw {clientName} content with <em>markup</em></p>';
    for (const key of ['objective_overview', 'deliverables', 'roles'] as const) {
      expect(renderSectionHtml(key, html)).toBe(html);
    }
  });

  it('null/undefined stored content stays null (rendered from defaults)', () => {
    for (const key of SOW_SECTION_KEYS) {
      expect(renderSectionHtml(key, null)).toBeNull();
      expect(renderSectionHtml(key, undefined)).toBeNull();
    }
  });
});

describe('getGlobalOrAnyTemplate / getContentTemplate (variant-safe, final-review fix)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getGlobalOrAnyTemplate prefers the global row when a global + LE row both exist', () => {
    const templates = [
      { section_name: 'out-of-scope', segment: 'LE', default_content: 'LE variant' } as any,
      { section_name: 'out-of-scope', segment: null, default_content: 'global default' } as any,
    ];
    const result = getGlobalOrAnyTemplate(templates, 'out-of-scope');
    expect(result?.default_content).toBe('global default');
  });

  it('getGlobalOrAnyTemplate falls back to the only available row when no global row exists', () => {
    const templates = [
      { section_name: 'out-of-scope', segment: 'LE', default_content: 'LE variant' } as any,
    ];
    const result = getGlobalOrAnyTemplate(templates, 'out-of-scope');
    expect(result?.default_content).toBe('LE variant');
  });

  it('getGlobalOrAnyTemplate returns null when no row matches the section', () => {
    const templates = [
      { section_name: 'scope', segment: null, default_content: 'global scope' } as any,
    ];
    expect(getGlobalOrAnyTemplate(templates, 'out-of-scope')).toBeNull();
  });

  it('getContentTemplate returns the global row when a global + LE row both exist', async () => {
    const templates = [
      { section_name: 'out-of-scope', segment: 'LE', default_content: 'LE variant' },
      { section_name: 'out-of-scope', segment: null, default_content: 'global default' },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => templates })
    );

    const result = await getContentTemplate('out-of-scope');
    expect(result?.default_content).toBe('global default');
  });

  it('getContentTemplate returns the LE row when only an LE row exists (no global fallback available)', async () => {
    const templates = [
      { section_name: 'out-of-scope', segment: 'LE', default_content: 'LE variant' },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => templates })
    );

    const result = await getContentTemplate('out-of-scope');
    expect(result?.default_content).toBe('LE variant');
  });
});

describe('resolveTemplatesForSegment (ENT roadmap Phase 3 §3)', () => {
  it('resolves global-only rows for any segment', () => {
    const rows = [
      { section_name: 'intro', default_content: 'global intro', segment: null },
      { section_name: 'scope', default_content: 'global scope', segment: undefined },
    ];
    for (const segment of ['LE', 'MM', 'EE', 'EC', null, undefined, 'bogus']) {
      const resolved = resolveTemplatesForSegment(rows, segment);
      expect(resolved.get('intro')).toBe('global intro');
      expect(resolved.get('scope')).toBe('global scope');
    }
  });

  it('prefers the LE variant for LE and ignores it for MM (falls back to global)', () => {
    const rows = [
      { section_name: 'intro', default_content: 'global intro', segment: null },
      { section_name: 'intro', default_content: 'LE intro', segment: 'LE' },
    ];
    expect(resolveTemplatesForSegment(rows, 'LE').get('intro')).toBe('LE intro');
    expect(resolveTemplatesForSegment(rows, 'MM').get('intro')).toBe('global intro');
  });

  it('normalizes "MidMarket" to MM before matching', () => {
    const rows = [
      { section_name: 'intro', default_content: 'global intro', segment: null },
      { section_name: 'intro', default_content: 'MM intro', segment: 'MM' },
    ];
    expect(resolveTemplatesForSegment(rows, 'MidMarket').get('intro')).toBe('MM intro');
  });

  it('omits a section entirely when no matching or global row exists', () => {
    const rows = [
      { section_name: 'intro', default_content: 'LE intro', segment: 'LE' },
    ];
    // MM has no exact match and no global fallback for this section.
    expect(resolveTemplatesForSegment(rows, 'MM').has('intro')).toBe(false);
    // LE gets the exact match even with no global row present.
    expect(resolveTemplatesForSegment(rows, 'LE').get('intro')).toBe('LE intro');
  });

  it('null/unknown segment gets globals only, non-matching segment rows are ignored', () => {
    const rows = [
      { section_name: 'intro', default_content: 'global intro', segment: null },
      { section_name: 'intro', default_content: 'LE intro', segment: 'LE' },
      { section_name: 'intro', default_content: 'EE intro', segment: 'EE' },
    ];
    const resolved = resolveTemplatesForSegment(rows, null);
    expect(resolved.get('intro')).toBe('global intro');
    expect(resolveTemplatesForSegment(rows, undefined).get('intro')).toBe('global intro');
    expect(resolveTemplatesForSegment(rows, 'bogus-segment').get('intro')).toBe('global intro');
  });
});
