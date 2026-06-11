'use client';

import { hasMentions, formatCommentWithMentions } from '@/lib/mention-utils';
import MentionAutocomplete from '@/components/ui/MentionAutocomplete';
import OrphanedAnchorContext from '@/components/sow/OrphanedAnchorContext';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { sectionLabel } from '@/lib/sow-content';
import type { AnchorResolutionStatus } from '@/lib/anchored-highlights';

/**
 * One approval-comment thread: a top-level comment, its replies, and the
 * reply form (with @mention autocomplete). Extracted verbatim from
 * SOWComments' renderComment (#350) so the Comments tab and the anchored
 * highlight popover (AnchoredCommentThread) render threads identically.
 *
 * Reply-box state stays CONTROLLED by the parent (replyTo/replyText),
 * preserving SOWComments' original behavior of at most one open reply box
 * across the whole list.
 */

export interface ApprovalComment {
  id: string;
  comment: string;
  is_internal: boolean;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  // Anchored-comment fields (#348) — null on general comments; replies never
  // carry their own anchor.
  section_key?: string | null;
  quoted_text?: string | null;
  context_prefix?: string | null;
  context_suffix?: string | null;
  start_offset?: number | null;
  end_offset?: number | null;
  snapshot_id?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  replies?: ApprovalComment[];
}

export function quotedTextPreview(text: string): string {
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

interface CommentThreadProps {
  comment: ApprovalComment;
  /** Id of the comment whose reply box is open (parent-controlled). */
  replyTo: string | null;
  replyText: string;
  isSubmitting: boolean;
  onStartReply: (commentId: string) => void;
  onCancelReply: () => void;
  onReplyTextChange: (text: string) => void;
  onSubmitReply: (parentId: string) => void;
  /** Render the quoted-selection blockquote on anchored threads (default true). */
  showQuotedText?: boolean;
  /**
   * Anchor resolution against the CURRENT content: 'orphaned' shows the
   * "original text was edited" badge. undefined = unknown (content not yet
   * rendered this session) → show nothing, don't guess.
   */
  anchorStatus?: AnchorResolutionStatus;
  /**
   * SOW id (#351) — needed only for the orphaned-anchor "show original
   * context" fetch; the section is omitted when absent.
   */
  sowId?: string;
  /**
   * Jump-to-text (#351): when provided AND the thread is anchored AND not
   * known-orphaned, a "Jump to text" action scrolls the Content tab to the
   * anchored passage. Orphans get the original-context presentation instead.
   */
  onJumpToText?: () => void;
  /** Show the inline Resolve/Unresolve button (permission-gated by parent). */
  canResolve?: boolean;
  /** Toggle this thread's resolution; required for the button to render. */
  onToggleResolved?: () => void;
  /** Disables the Resolve button while a PATCH is in flight. */
  isResolving?: boolean;
}

export default function CommentThread({
  comment,
  replyTo,
  replyText,
  isSubmitting,
  onStartReply,
  onCancelReply,
  onReplyTextChange,
  onSubmitReply,
  showQuotedText = true,
  anchorStatus,
  sowId,
  onJumpToText,
  canResolve = false,
  onToggleResolved,
  isResolving = false,
}: CommentThreadProps) {
  const renderComment = (current: ApprovalComment, isReply: boolean) => (
    <div
      key={current.id}
      className={`border rounded-lg p-4 ${isReply ? 'ml-8 bg-gray-50' : 'bg-white'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900">
            {current.user.name || current.user.email}
          </span>
          <span className="text-sm text-gray-500">
            {new Date(current.created_at).toLocaleDateString()}
          </span>
          {hasMentions(current.comment) && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              @mentions
            </span>
          )}
          {!isReply && current.quoted_text && current.section_key && showQuotedText && (
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
              title="The SOW section this comment is anchored to."
            >
              {sectionLabel(current.section_key)}
            </span>
          )}
          {!isReply && current.quoted_text && anchorStatus === 'orphaned' && (
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
              title="The text this comment was anchored to no longer appears in the SOW content."
            >
              ⚠ original text was edited
            </span>
          )}
          {!isReply && current.resolved_at && (
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
              title={`Resolved on ${new Date(current.resolved_at).toLocaleDateString()}`}
            >
              ✓ Resolved
            </span>
          )}
        </div>
      </div>

      {/* Anchored comment (#349): show the quoted selection above the body. */}
      {showQuotedText && current.quoted_text && (
        <blockquote className="mb-2 border-l-4 border-indigo-300 bg-indigo-50 rounded-r px-3 py-1.5 text-sm text-gray-600 italic break-words">
          {quotedTextPreview(current.quoted_text)}
        </blockquote>
      )}

      {/* Orphaned anchor (#351): offer the snapshot-backed original context.
          Comments without a snapshot_id keep just the quote above. */}
      {showQuotedText &&
        !isReply &&
        current.quoted_text &&
        anchorStatus === 'orphaned' &&
        sowId &&
        current.snapshot_id && (
          <OrphanedAnchorContext
            sowId={sowId}
            snapshotId={current.snapshot_id}
            anchor={{
              quoted_text: current.quoted_text,
              context_prefix: current.context_prefix,
              context_suffix: current.context_suffix,
              start_offset: current.start_offset,
            }}
          />
        )}

      <div
        className="text-gray-700 mb-3"
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(formatCommentWithMentions(current.comment)),
        }}
      />

      {!isReply && (
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onStartReply(current.id)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Reply
          </button>
          {/* Jump-to-text (#351): anchored threads whose anchor still resolves
              (or is not yet checked). Orphans get the original-context
              presentation above instead. */}
          {onJumpToText &&
            current.quoted_text &&
            current.section_key &&
            anchorStatus !== 'orphaned' && (
              <button
                onClick={onJumpToText}
                className="text-sm text-indigo-600 hover:text-indigo-800"
                title="Open the Content tab and scroll to the commented text."
              >
                Jump to text
              </button>
            )}
          {/* Inline Resolve/Unresolve (#351) — same permission gating as the
              highlight popover; the PATCH route allows it on ANY top-level
              comment (anchored or general). */}
          {canResolve && onToggleResolved && (
            <button
              onClick={onToggleResolved}
              disabled={isResolving}
              className={`text-sm disabled:opacity-50 ${
                current.resolved_at
                  ? 'text-gray-600 hover:text-gray-800'
                  : 'text-green-700 hover:text-green-900'
              }`}
            >
              {isResolving ? 'Saving…' : current.resolved_at ? 'Unresolve' : 'Resolve'}
            </button>
          )}
        </div>
      )}

      {replyTo === current.id && (
        <div className="mt-3">
          <MentionAutocomplete
            value={replyText}
            onChange={onReplyTextChange}
            placeholder="Write a reply..."
            rows={2}
          />
          <div className="mt-2 space-x-2">
            <button
              onClick={() => onSubmitReply(current.id)}
              disabled={isSubmitting || !replyText.trim()}
              className="btn-secondary-cta px-3 py-1 text-sm rounded disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post Reply'}
            </button>
            <button
              onClick={onCancelReply}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {current.replies && current.replies.length > 0 && (
        <div className="mt-3 space-y-2">
          {current.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return renderComment(comment, false);
}
