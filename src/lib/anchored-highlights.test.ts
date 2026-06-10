// @vitest-environment jsdom
//
// Pure resolution/hit-testing logic for anchored-comment highlights (#350).
// Painting (CSS Custom Highlight API) is NOT exercised here — jsdom doesn't
// implement CSS.highlights; the hook feature-detects and skips it.
import { describe, it, expect } from 'vitest';
import {
  resolveCommentAnchors,
  findCommentAtBoundary,
  caretBoundaryFromPoint,
  isAnchoredTopLevel,
  type AnchoredCommentRef,
} from './anchored-highlights';
import { anchorToRange } from './selection-anchor';

function mountSections(sections: Record<string, string>): HTMLElement {
  document.body.innerHTML = `<div id="root">${Object.entries(sections)
    .map(([key, html]) => `<div data-section-key="${key}">${html}</div>`)
    .join('')}</div>`;
  return document.getElementById('root') as HTMLElement;
}

function comment(overrides: Partial<AnchoredCommentRef> & { id: string }): AnchoredCommentRef {
  return {
    parent_id: null,
    section_key: null,
    quoted_text: null,
    context_prefix: null,
    context_suffix: null,
    start_offset: null,
    end_offset: null,
    resolved_at: null,
    ...overrides,
  };
}

describe('isAnchoredTopLevel', () => {
  it('requires top-level + section_key + quoted_text', () => {
    expect(isAnchoredTopLevel(comment({ id: 'a', section_key: 'intro', quoted_text: 'x' }))).toBe(true);
    expect(isAnchoredTopLevel(comment({ id: 'b' }))).toBe(false); // general comment
    expect(
      isAnchoredTopLevel(comment({ id: 'c', section_key: 'intro', quoted_text: 'x', parent_id: 'a' }))
    ).toBe(false); // reply
    expect(isAnchoredTopLevel(comment({ id: 'd', section_key: 'intro' }))).toBe(false);
  });
});

describe('resolveCommentAnchors', () => {
  it('resolves matching anchors, orphans missing quotes, skips unmounted sections', () => {
    const root = mountSections({
      intro: '<p>The quick brown fox jumps over the lazy dog.</p>',
      scope: '<p>Configure lead routing for all regions.</p>',
    });

    const comments: AnchoredCommentRef[] = [
      comment({
        id: 'hit',
        section_key: 'intro',
        quoted_text: 'brown fox',
        context_prefix: 'The quick ',
        context_suffix: ' jumps over',
        start_offset: 10,
        end_offset: 19,
      }),
      comment({
        id: 'orphan',
        section_key: 'scope',
        quoted_text: 'text that was edited away',
        start_offset: 0,
        end_offset: 25,
      }),
      comment({
        id: 'unmounted',
        section_key: 'assumptions', // no such container in the DOM
        quoted_text: 'Configure',
      }),
      comment({ id: 'general' }), // not anchored — ignored entirely
      comment({
        id: 'reply',
        parent_id: 'hit',
        section_key: 'intro',
        quoted_text: 'brown fox',
      }),
    ];

    const { ranges, status } = resolveCommentAnchors(comments, root);

    expect(status.get('hit')).toBe('resolved');
    expect(ranges.get('hit')!.toString()).toBe('brown fox');

    expect(status.get('orphan')).toBe('orphaned');
    expect(ranges.has('orphan')).toBe(false); // never mis-highlight

    // unknown — not orphaned, not resolved, just absent
    expect(status.has('unmounted')).toBe(false);
    expect(status.has('general')).toBe(false);
    expect(status.has('reply')).toBe(false);
  });

  it('resolves resolved threads too (status known; painting filters separately)', () => {
    const root = mountSections({ intro: '<p>Hello world</p>' });
    const { ranges, status } = resolveCommentAnchors(
      [
        comment({
          id: 'done',
          section_key: 'intro',
          quoted_text: 'world',
          start_offset: 6,
          end_offset: 11,
          resolved_at: '2026-06-01T00:00:00Z',
        }),
      ],
      root
    );
    expect(status.get('done')).toBe('resolved');
    expect(ranges.get('done')!.toString()).toBe('world');
  });
});

describe('findCommentAtBoundary', () => {
  it('returns the comment whose range contains the point', () => {
    const root = mountSections({ intro: '<p>The quick brown fox jumps.</p>' });
    const container = root.querySelector<HTMLElement>('[data-section-key="intro"]')!;
    const range = anchorToRange({ quoted_text: 'brown fox', start_offset: 10 }, container)!;
    const ranges = new Map([['c1', range]]);

    const textNode = container.querySelector('p')!.firstChild as Text;
    expect(findCommentAtBoundary(ranges, textNode, 12)).toBe('c1'); // inside "brown"
    expect(findCommentAtBoundary(ranges, textNode, 2)).toBeNull(); // in "The"
  });

  it('picks the INNERMOST (shortest) range when highlights overlap', () => {
    const root = mountSections({ intro: '<p>alpha beta gamma</p>' });
    const container = root.querySelector<HTMLElement>('[data-section-key="intro"]')!;
    const outer = anchorToRange({ quoted_text: 'alpha beta gamma', start_offset: 0 }, container)!;
    const inner = anchorToRange({ quoted_text: 'beta', start_offset: 6 }, container)!;
    const ranges = new Map([
      ['outer', outer],
      ['inner', inner],
    ]);

    const textNode = container.querySelector('p')!.firstChild as Text;
    expect(findCommentAtBoundary(ranges, textNode, 7)).toBe('inner'); // inside "beta"
    expect(findCommentAtBoundary(ranges, textNode, 13)).toBe('outer'); // inside "gamma"
  });

  it('ignores points from a detached tree instead of throwing', () => {
    const root = mountSections({ intro: '<p>alpha</p>' });
    const container = root.querySelector<HTMLElement>('[data-section-key="intro"]')!;
    const range = anchorToRange({ quoted_text: 'alpha', start_offset: 0 }, container)!;
    const detached = document.createTextNode('elsewhere');
    expect(findCommentAtBoundary(new Map([['c1', range]]), detached, 1)).toBeNull();
  });
});

describe('caretBoundaryFromPoint', () => {
  // jsdom implements neither caretPositionFromPoint nor caretRangeFromPoint —
  // exercise the engine-dispatch with stubbed documents.
  it('prefers the standard caretPositionFromPoint', () => {
    const node = document.createTextNode('x');
    const doc = {
      caretPositionFromPoint: () => ({ offsetNode: node, offset: 1 }),
      caretRangeFromPoint: () => {
        throw new Error('should not fall back');
      },
    } as unknown as Document;
    expect(caretBoundaryFromPoint(doc, 0, 0)).toEqual({ node, offset: 1 });
  });

  it('falls back to WebKit caretRangeFromPoint', () => {
    document.body.innerHTML = '<p>hello</p>';
    const textNode = document.querySelector('p')!.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 2);
    range.setEnd(textNode, 2);
    const doc = { caretRangeFromPoint: () => range } as unknown as Document;
    expect(caretBoundaryFromPoint(doc, 0, 0)).toEqual({ node: textNode, offset: 2 });
  });

  it('returns null when no engine API exists or the point misses', () => {
    expect(caretBoundaryFromPoint({} as Document, 0, 0)).toBeNull();
    const doc = {
      caretPositionFromPoint: () => null,
      caretRangeFromPoint: () => null,
    } as unknown as Document;
    expect(caretBoundaryFromPoint(doc, 0, 0)).toBeNull();
  });
});
