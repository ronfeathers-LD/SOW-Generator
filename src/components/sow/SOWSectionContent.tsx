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
 */
export default function SOWSectionContent({
  sectionKey,
  html,
  className,
  id,
}: SOWSectionContentProps) {
  return (
    <div
      id={id}
      data-section-key={sectionKey}
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
