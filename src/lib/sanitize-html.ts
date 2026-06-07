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
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(String(dirty), {
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
  });
}
