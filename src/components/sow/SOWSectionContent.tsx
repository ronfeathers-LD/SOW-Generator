import { memo, useMemo } from 'react';
import { sanitizeHtml } from '@/lib/sanitize-html';
import type { SOWSectionKey } from '@/lib/sow-content';

interface SOWSectionContentProps {
  /** Which SOW section this HTML belongs to — see SOW_SECTION_CONTENT_COLUMNS. */
  sectionKey: SOWSectionKey;
  /** The (canonical) section HTML to render. */
  html: string | null | undefined;
  className?: string;
  /** Optional DOM id, preserved from the legacy per-page markup. */
  id?: string;
}

/**
 * The single shared renderer for SOW section HTML (#346).
 *
 * Every SOW section body MUST render through this component rather than a
 * bespoke `dangerouslySetInnerHTML` so that:
 * - render-time sanitization stays applied everywhere (defense-in-depth on top
 *   of sanitize-on-write — content can be written server-side, bypassing the
 *   editor), and
 * - each rendered section is tagged with `data-section-key`, the hook the
 *   anchored-comments phases (snapshots, text anchors, highlight overlays)
 *   use to locate section content in the DOM.
 *
 * CRITICAL: the `dangerouslySetInnerHTML` value MUST be referentially stable
 * across re-renders (hence the useMemo + memo). A freshly-built
 * `{ __html: sanitizeHtml(html) }` object makes React re-assign innerHTML on
 * EVERY parent re-render — replacing the section's text nodes each time,
 * which silently kills the user's text selection and collapses every live
 * Range the anchored-comment highlights point at (#349/#350).
 */
function SOWSectionContent({
  sectionKey,
  html,
  className,
  id,
}: SOWSectionContentProps) {
  const innerHtml = useMemo(() => ({ __html: sanitizeHtml(html) }), [html]);
  return (
    <div
      id={id}
      data-section-key={sectionKey}
      className={className}
      dangerouslySetInnerHTML={innerHtml}
    />
  );
}

export default memo(SOWSectionContent);
