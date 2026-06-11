import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize untrusted / rich-text HTML before rendering via
 * dangerouslySetInnerHTML. Allows the formatting, list, table and diff tags the
 * SOW editor and renderers actually use (plus the styling `class` attribute),
 * while stripping <script>, event-handler attributes, and javascript: URLs.
 *
 * Apply this at EVERY dangerouslySetInnerHTML site — SOW content can also be
 * written server-side (AI generation, API writes), bypassing the editor.
 */
/**
 * The single DOMPurify config used for all SOW rich-text sanitization.
 * Exported so other server-side consumers (e.g. anchor-text extraction in
 * src/lib/comment-anchors.ts, which needs `RETURN_DOM`) sanitize with EXACTLY
 * the same tag/attribute policy — a config drift there would silently change
 * what text anchors resolve against.
 */
export const SANITIZE_HTML_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'small',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code', 'hr',
    'a', 'img',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col', 'caption',
    'ins', 'del', 'mark',
  ],
  ALLOWED_ATTR: [
    'class', 'href', 'target', 'rel',
    'src', 'alt', 'title', 'width', 'height',
    'colspan', 'rowspan',
  ],
  ALLOW_DATA_ATTR: false,
  // Force safe rel on links that open in a new tab.
  ADD_ATTR: ['target'],
} as const;

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(String(dirty), {
    ...SANITIZE_HTML_CONFIG,
    ALLOWED_TAGS: [...SANITIZE_HTML_CONFIG.ALLOWED_TAGS],
    ALLOWED_ATTR: [...SANITIZE_HTML_CONFIG.ALLOWED_ATTR],
    ADD_ATTR: [...SANITIZE_HTML_CONFIG.ADD_ATTR],
  });
}
