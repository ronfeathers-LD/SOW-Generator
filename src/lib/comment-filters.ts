/**
 * Comments-tab filtering (#351). Pure predicates over top-level approval
 * comments — no React, no fetch — so the filter semantics are unit-testable.
 *
 * "Open" means the THREAD is unresolved (`resolved_at` null/absent). Replies
 * never carry their own resolution state (the PATCH route rejects them), so
 * filtering and counting operate on top-level comments only; callers pass the
 * already-threaded list the approval-comments GET returns.
 */

/** The subset of an approval-comment row filtering needs. */
export interface FilterableComment {
  parent_id?: string | null;
  resolved_at?: string | null;
}

export type CommentFilter = 'all' | 'open' | 'resolved';

export const COMMENT_FILTERS: readonly CommentFilter[] = [
  'open',
  'resolved',
  'all',
];

export function isOpenComment(comment: FilterableComment): boolean {
  return !comment.resolved_at;
}

export function matchesCommentFilter(
  comment: FilterableComment,
  filter: CommentFilter
): boolean {
  if (filter === 'all') return true;
  return filter === 'open' ? isOpenComment(comment) : !isOpenComment(comment);
}

export interface CommentFilterCounts {
  all: number;
  open: number;
  resolved: number;
}

/** Counts per filter over TOP-LEVEL comments (replies are skipped even if
 *  a flat list is passed by mistake). */
export function commentFilterCounts(
  comments: readonly FilterableComment[]
): CommentFilterCounts {
  let open = 0;
  let resolved = 0;
  for (const comment of comments) {
    if (comment.parent_id) continue;
    if (isOpenComment(comment)) open += 1;
    else resolved += 1;
  }
  return { all: open + resolved, open, resolved };
}

/** Open top-level threads — the number shown on the Comments tab label. */
export function countOpenTopLevel(
  comments: readonly FilterableComment[]
): number {
  return commentFilterCounts(comments).open;
}
