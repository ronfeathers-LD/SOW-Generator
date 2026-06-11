import { describe, it, expect } from 'vitest';
import {
  computeOrphanContextSnippet,
  ORPHAN_SNIPPET_CONTEXT_LENGTH,
} from './orphan-context';
import type { AnchorQuery } from './comment-anchors';

const anchorFor = (
  text: string,
  quoted: string,
  over: Partial<AnchorQuery> = {}
): AnchorQuery => ({
  quoted_text: quoted,
  context_prefix: '',
  context_suffix: '',
  start_offset: text.indexOf(quoted),
  ...over,
});

describe('computeOrphanContextSnippet', () => {
  it('returns the quote with surrounding original text and truncation flags', () => {
    const text = 'a'.repeat(200) + 'THE QUOTE' + 'b'.repeat(200);
    const snippet = computeOrphanContextSnippet(text, anchorFor(text, 'THE QUOTE'));
    expect(snippet).not.toBeNull();
    expect(snippet!.quoted).toBe('THE QUOTE');
    expect(snippet!.prefix).toBe('a'.repeat(ORPHAN_SNIPPET_CONTEXT_LENGTH));
    expect(snippet!.suffix).toBe('b'.repeat(ORPHAN_SNIPPET_CONTEXT_LENGTH));
    expect(snippet!.truncatedStart).toBe(true);
    expect(snippet!.truncatedEnd).toBe(true);
  });

  it('does not truncate at section edges', () => {
    const text = 'START middle END';
    const snippet = computeOrphanContextSnippet(text, anchorFor(text, 'middle'));
    expect(snippet).toEqual({
      prefix: 'START ',
      quoted: 'middle',
      suffix: ' END',
      truncatedStart: false,
      truncatedEnd: false,
    });
  });

  it('finds the quote even when stored offsets drifted', () => {
    const text = 'prefix… something moved here: needle …suffix';
    const snippet = computeOrphanContextSnippet(
      text,
      anchorFor(text, 'needle', { start_offset: 2 }) // wrong hint
    );
    expect(snippet).not.toBeNull();
    expect(snippet!.quoted).toBe('needle');
    expect(snippet!.prefix.endsWith('moved here: ')).toBe(true);
  });

  it('disambiguates duplicate quotes via stored context', () => {
    const text = 'first dup tail-one ... second dup tail-two';
    const snippet = computeOrphanContextSnippet(text, {
      quoted_text: 'dup',
      context_prefix: 'second ',
      context_suffix: ' tail-two',
      start_offset: 0, // hint points at the FIRST occurrence; context wins
    });
    expect(snippet).not.toBeNull();
    expect(snippet!.suffix.startsWith(' tail-two')).toBe(true);
  });

  it('returns null when the quote is not in the snapshot text', () => {
    expect(
      computeOrphanContextSnippet('completely different content', {
        quoted_text: 'absent passage',
        context_prefix: '',
        context_suffix: '',
        start_offset: 0,
      })
    ).toBeNull();
  });

  it('returns null for empty snapshot text (NULL snapshot content)', () => {
    expect(
      computeOrphanContextSnippet('', anchorFor('x', 'x'))
    ).toBeNull();
  });

  it('respects a custom context length', () => {
    const text = 'aaaaaaaaaaQUOTEbbbbbbbbbb';
    const snippet = computeOrphanContextSnippet(text, anchorFor(text, 'QUOTE'), 4);
    expect(snippet!.prefix).toBe('aaaa');
    expect(snippet!.suffix).toBe('bbbb');
    expect(snippet!.truncatedStart).toBe(true);
    expect(snippet!.truncatedEnd).toBe(true);
  });
});
