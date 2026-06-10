'use client';

/**
 * Floating "💬 Comment" button shown next to an active text selection inside
 * a SOW section (#349). Positioned with `position: fixed` from the selection
 * rect (viewport coordinates from Range#getBoundingClientRect), clamped to
 * the viewport. Rendering/visibility gating lives in the parent (SOWFullView).
 */

interface AnchoredCommentButtonProps {
  /** Selection bounding box in viewport coordinates. */
  rect: DOMRect;
  onClick: () => void;
}

const BUTTON_HEIGHT = 32;
const BUTTON_WIDTH = 110; // approximate, for clamping only
const GAP = 8;

export default function AnchoredCommentButton({
  rect,
  onClick,
}: AnchoredCommentButtonProps) {
  // Prefer just above the selection; flip below when clipped at the top.
  let top = rect.top - BUTTON_HEIGHT - GAP;
  if (top < GAP) top = rect.bottom + GAP;
  top = Math.min(top, window.innerHeight - BUTTON_HEIGHT - GAP);

  const left = Math.min(
    Math.max(GAP, rect.left + rect.width / 2 - BUTTON_WIDTH / 2),
    window.innerWidth - BUTTON_WIDTH - GAP
  );

  return (
    <button
      type="button"
      // Keep the text selection alive: a mousedown elsewhere would collapse
      // it before click fires.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{ position: 'fixed', top, left, zIndex: 50 }}
      className="inline-flex items-center px-3 py-1.5 rounded-md shadow-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label="Comment on selected text"
    >
      <span className="mr-1" aria-hidden="true">💬</span>
      Comment
    </button>
  );
}
