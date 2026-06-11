import { describe, it, expect } from 'vitest';
import {
  htmlToAnchorText,
  renderedSectionText,
  validateAnchor,
  validateAnchorAgainstText,
  parseAnchorInput,
  MAX_QUOTED_TEXT_LENGTH,
  type CommentAnchorInput,
} from './comment-anchors';
import { processContent, textToHtml } from './text-to-html';

function anchor(overrides: Partial<CommentAnchorInput>): CommentAnchorInput {
  const quoted = overrides.quoted_text ?? 'quote';
  const start = overrides.start_offset ?? 0;
  return {
    section_key: 'intro',
    quoted_text: quoted,
    context_prefix: '',
    context_suffix: '',
    start_offset: start,
    end_offset: start + quoted.length,
    ...overrides,
  };
}

describe('htmlToAnchorText', () => {
  it('returns plain text of simple markup, preserving inline spacing', () => {
    expect(htmlToAnchorText('<p>Hello <strong>world</strong></p>')).toBe(
      'Hello world'
    );
  });

  it('decodes entities', () => {
    expect(htmlToAnchorText('<p>Fish &amp; Chips &lt;tasty&gt;</p>')).toBe(
      'Fish & Chips <tasty>'
    );
  });

  it('returns empty string for null/undefined/empty input', () => {
    expect(htmlToAnchorText(null)).toBe('');
    expect(htmlToAnchorText(undefined)).toBe('');
    expect(htmlToAnchorText('')).toBe('');
  });

  // ── THE BLOCK-BOUNDARY CONVENTION ─────────────────────────────────────────
  // Anchor text is DOM textContent: block elements contribute NO separator.
  // P4's client-side Range→offset mapping must reproduce exactly this (walk
  // text nodes / use container.textContent — never innerText).
  it('CONVENTION: block elements contribute no separator — <p>a</p><p>b</p> → "ab"', () => {
    expect(htmlToAnchorText('<p>a</p><p>b</p>')).toBe('ab');
  });

  it('CONVENTION: <br> and list/heading boundaries contribute nothing', () => {
    expect(htmlToAnchorText('line1<br>line2')).toBe('line1line2');
    expect(htmlToAnchorText('<h2>Title</h2><ul><li>x</li><li>y</li></ul>')).toBe(
      'Titlexy'
    );
  });

  it('CONVENTION: whitespace inside text nodes is preserved verbatim', () => {
    expect(htmlToAnchorText('<p>a  b\n c</p>')).toBe('a  b\n c');
  });

  it('strips disallowed tags but keeps their text (sanitizer parity)', () => {
    // <script> content is removed entirely by DOMPurify; unknown-but-harmless
    // tags are unwrapped to their text.
    expect(htmlToAnchorText('<p>safe</p><script>alert(1)</script>')).toBe('safe');
  });
});

describe('validateAnchor', () => {
  const html = '<p>The quick brown fox jumps over the lazy dog.</p>';
  // anchor text: "The quick brown fox jumps over the lazy dog."

  it('returns ok for an exact match at the stated offsets', () => {
    const result = validateAnchor(
      anchor({ quoted_text: 'brown fox', start_offset: 10, end_offset: 19 }),
      html
    );
    expect(result).toEqual({ status: 'ok' });
  });

  it('adjusts offsets when the quote is unique but offsets drifted', () => {
    const result = validateAnchor(
      anchor({ quoted_text: 'brown fox', start_offset: 3, end_offset: 12 }),
      html
    );
    expect(result).toEqual({ status: 'adjusted', start_offset: 10, end_offset: 19 });
  });

  it('returns not_found when the quote does not occur', () => {
    const result = validateAnchor(
      anchor({ quoted_text: 'purple elephant', start_offset: 0, end_offset: 15 }),
      html
    );
    expect(result.status).toBe('not_found');
  });

  it('returns not_found against empty/null section content', () => {
    const a = anchor({ quoted_text: 'anything', start_offset: 0, end_offset: 8 });
    expect(validateAnchor(a, null).status).toBe('not_found');
    expect(validateAnchor(a, '').status).toBe('not_found');
  });

  it('disambiguates duplicate quotes via context', () => {
    const dupHtml = '<p>Set the flag. Then set the flag again later.</p>';
    // anchor text: "Set the flag. Then set the flag again later."
    //                   ^4                 ^23   ("the flag" twice)
    const result = validateAnchor(
      anchor({
        quoted_text: 'the flag',
        context_prefix: 'Then set ',
        context_suffix: ' again',
        start_offset: 0, // wildly wrong hint — context must decide
        end_offset: 8,
      }),
      dupHtml
    );
    expect(result).toEqual({ status: 'adjusted', start_offset: 23, end_offset: 31 });
  });

  it('falls back to the offset hint when duplicate quotes have identical context', () => {
    const dupHtml = '<p>aaa X bbb X ccc</p>';
    // anchor text: "aaa X bbb X ccc" — "X" at 4 and 10, no usable context
    const result = validateAnchor(
      anchor({ quoted_text: 'X', start_offset: 9, end_offset: 10 }),
      dupHtml
    );
    expect(result).toEqual({ status: 'adjusted', start_offset: 10, end_offset: 11 });
  });

  it('handles edge-of-section selections with empty prefix/suffix', () => {
    // Selection at the very start: prefix is ''.
    const startResult = validateAnchor(
      anchor({
        quoted_text: 'The quick',
        context_prefix: '',
        context_suffix: ' brown',
        start_offset: 0,
        end_offset: 9,
      }),
      html
    );
    expect(startResult).toEqual({ status: 'ok' });

    // Selection at the very end: suffix is ''.
    const endResult = validateAnchor(
      anchor({
        quoted_text: 'lazy dog.',
        context_prefix: 'over the ',
        context_suffix: '',
        start_offset: 35,
        end_offset: 44,
      }),
      html
    );
    expect(endResult).toEqual({ status: 'ok' });
  });

  it('validates multi-paragraph quotes joined per the block convention (no separator)', () => {
    const multiHtml = '<p>First paragraph ends here.</p><p>Second starts now.</p>';
    // anchor text: "First paragraph ends here.Second starts now."
    //  cross-block quote "ends here.Second starts" begins at index 16
    const result = validateAnchor(
      anchor({
        quoted_text: 'ends here.Second starts',
        context_prefix: 'paragraph ',
        context_suffix: ' now.',
        start_offset: 16,
        end_offset: 39,
      }),
      multiHtml
    );
    expect(result).toEqual({ status: 'ok' });

    // The visually-spaced variant ("ends here. Second") must NOT match —
    // proving the stored convention is textContent, not innerText.
    const wrong = validateAnchor(
      anchor({
        quoted_text: 'ends here. Second starts',
        start_offset: 16,
        end_offset: 40,
      }),
      multiHtml
    );
    expect(wrong.status).toBe('not_found');
  });
});

describe('parseAnchorInput', () => {
  const valid = {
    section_key: 'scope',
    quoted_text: 'some text',
    context_prefix: 'before ',
    context_suffix: ' after',
    start_offset: 12,
    end_offset: 21,
  };

  it('accepts a well-formed anchor', () => {
    const result = parseAnchorInput(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.anchor.section_key).toBe('scope');
  });

  it('rejects unknown section keys', () => {
    expect(parseAnchorInput({ ...valid, section_key: 'nope' }).ok).toBe(false);
  });

  it('rejects empty and oversized quoted_text', () => {
    expect(parseAnchorInput({ ...valid, quoted_text: '', end_offset: 12 }).ok).toBe(false);
    const huge = 'x'.repeat(MAX_QUOTED_TEXT_LENGTH + 1);
    expect(
      parseAnchorInput({ ...valid, quoted_text: huge, start_offset: 0, end_offset: huge.length }).ok
    ).toBe(false);
  });

  it('rejects offsets inconsistent with quoted_text length', () => {
    expect(parseAnchorInput({ ...valid, end_offset: 22 }).ok).toBe(false);
  });

  it('rejects negative / non-integer offsets and non-string context', () => {
    expect(parseAnchorInput({ ...valid, start_offset: -1, end_offset: 8 }).ok).toBe(false);
    expect(parseAnchorInput({ ...valid, start_offset: 1.5 }).ok).toBe(false);
    expect(parseAnchorInput({ ...valid, context_prefix: null }).ok).toBe(false);
    expect(parseAnchorInput(null).ok).toBe(false);
    expect(parseAnchorInput('anchor').ok).toBe(false);
  });
});

describe('renderedSectionText (#351)', () => {
  const INTRO_STORED =
    '<p>This SOW is entered into between LeanData, Inc. and {clientName}, effective on signature.</p>';

  /**
   * Replicate SOWIntroPage's introProcessor effect on the fixture: the
   * component runs processContent then swaps {clientName} for a bold span.
   * What the reviewer sees (and selects) is the textContent of that.
   */
  function introRenderedReplica(clientName: string): string {
    let html = processContent(INTRO_STORED);
    html = clientName
      ? html.replace(/{clientName}/g, `<span class="font-bold">${clientName}</span>`)
      : html.replace(/{clientName}/g, '<span class="font-bold">[Client Name]</span>');
    return html;
  }

  it('intro: equals the textContent of what SOWIntroPage renders (client name substituted)', () => {
    const text = renderedSectionText(
      { custom_intro_content: INTRO_STORED },
      'intro',
      { clientName: 'Acme Corp' }
    );
    expect(text).toBe(htmlToAnchorText(introRenderedReplica('Acme Corp')));
    expect(text).toContain('Acme Corp');
    expect(text).not.toContain('{clientName}');
  });

  it('intro: substitutes [Client Name] when the client name is null/absent (UI parity)', () => {
    const text = renderedSectionText({ custom_intro_content: INTRO_STORED }, 'intro', {
      clientName: null,
    });
    expect(text).toBe(htmlToAnchorText(introRenderedReplica('')));
    expect(text).toContain('[Client Name]');
  });

  it('REGRESSION: an anchor quoting the rendered client name validates ok (raw column would 422)', () => {
    const sow = { custom_intro_content: INTRO_STORED };
    const text = renderedSectionText(sow, 'intro', { clientName: 'Acme Corp' });
    const start = text.indexOf('and Acme Corp');
    expect(start).toBeGreaterThan(-1);
    const a = anchor({
      quoted_text: 'and Acme Corp',
      start_offset: start,
      end_offset: start + 'and Acme Corp'.length,
    });
    // Against the rendered text: found exactly where the client selected it.
    expect(validateAnchorAgainstText(a, text)).toEqual({ status: 'ok' });
    // Against the RAW stored column (the pre-#351 behavior): not found — this
    // was the bug.
    expect(validateAnchor(a, sow.custom_intro_content).status).toBe('not_found');
  });

  it('canonical HTML sections are a no-op: rendered text equals raw anchor text', () => {
    const stored = '<p>In scope: <strong>lead routing</strong> setup.</p>';
    expect(renderedSectionText({ custom_scope_content: stored }, 'scope')).toBe(
      htmlToAnchorText(stored)
    );
  });

  it('plain-text stored content goes through textToHtml (trimmed lines, dropped blanks)', () => {
    const stored = '  Assumption one  \n\n- bullet a\n- bullet b';
    const text = renderedSectionText(
      { custom_assumptions_content: stored },
      'assumptions'
    );
    expect(text).toBe(htmlToAnchorText(textToHtml(stored)));
    // textToHtml trims each line, drops the bullet markers, and re-joins the
    // generated tags with '\n' — the rendered coordinate space differs from
    // the raw stored string ('  Assumption one  ', '- bullet a', …), which is
    // exactly why the server must validate against the transformed content.
    expect(text).toBe('Assumption one\n\nbullet a\nbullet b\n');
  });

  it('objective_overview reads the RENDERED column (objectives_description)', () => {
    const text = renderedSectionText(
      {
        objectives_description: '<p>rendered objective</p>',
        custom_objective_overview_content: '<p>stale custom copy</p>',
      },
      'objective_overview'
    );
    expect(text).toBe('rendered objective');
  });

  it('returns empty string when the section has no stored content', () => {
    expect(renderedSectionText({}, 'scope')).toBe('');
    expect(renderedSectionText({ custom_scope_content: null }, 'scope')).toBe('');
  });
});
