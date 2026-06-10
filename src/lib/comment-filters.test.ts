import { describe, it, expect } from 'vitest';
import {
  COMMENT_FILTERS,
  commentFilterCounts,
  countOpenTopLevel,
  isOpenComment,
  matchesCommentFilter,
  type FilterableComment,
} from './comment-filters';

const open = (over: Partial<FilterableComment> = {}): FilterableComment => ({
  parent_id: null,
  resolved_at: null,
  ...over,
});
const resolved = (over: Partial<FilterableComment> = {}): FilterableComment => ({
  parent_id: null,
  resolved_at: '2026-06-01T00:00:00Z',
  ...over,
});

describe('isOpenComment', () => {
  it('is open when resolved_at is null, undefined, or absent', () => {
    expect(isOpenComment({ resolved_at: null })).toBe(true);
    expect(isOpenComment({ resolved_at: undefined })).toBe(true);
    expect(isOpenComment({})).toBe(true);
  });

  it('is not open when resolved_at is set', () => {
    expect(isOpenComment(resolved())).toBe(false);
  });
});

describe('matchesCommentFilter', () => {
  it("'all' matches everything", () => {
    expect(matchesCommentFilter(open(), 'all')).toBe(true);
    expect(matchesCommentFilter(resolved(), 'all')).toBe(true);
  });

  it("'open' matches only unresolved", () => {
    expect(matchesCommentFilter(open(), 'open')).toBe(true);
    expect(matchesCommentFilter(resolved(), 'open')).toBe(false);
  });

  it("'resolved' matches only resolved", () => {
    expect(matchesCommentFilter(open(), 'resolved')).toBe(false);
    expect(matchesCommentFilter(resolved(), 'resolved')).toBe(true);
  });

  it('every advertised filter is a total predicate (open|resolved partition)', () => {
    for (const filter of COMMENT_FILTERS) {
      // exactly one of open/resolved matches each comment; 'all' matches both
      const matchesOpen = matchesCommentFilter(open(), filter);
      const matchesResolved = matchesCommentFilter(resolved(), filter);
      expect(matchesOpen || matchesResolved).toBe(true);
    }
  });
});

describe('commentFilterCounts / countOpenTopLevel', () => {
  it('counts per filter and sums to all', () => {
    const comments = [open(), open(), resolved()];
    expect(commentFilterCounts(comments)).toEqual({ all: 3, open: 2, resolved: 1 });
    expect(countOpenTopLevel(comments)).toBe(2);
  });

  it('ignores replies even when handed a flat list', () => {
    const comments = [
      open(),
      open({ parent_id: 'parent-1' }),
      resolved({ parent_id: 'parent-1' }),
    ];
    expect(commentFilterCounts(comments)).toEqual({ all: 1, open: 1, resolved: 0 });
  });

  it('handles an empty list', () => {
    expect(commentFilterCounts([])).toEqual({ all: 0, open: 0, resolved: 0 });
    expect(countOpenTopLevel([])).toBe(0);
  });
});
