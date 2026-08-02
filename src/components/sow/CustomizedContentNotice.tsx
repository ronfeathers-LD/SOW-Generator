'use client';

/**
 * Compact badge shown above a SOW section when its content has been
 * customized from the default template (#422). Replaces the old full-width
 * yellow wrapper box, which made customized content look like a rendering
 * artifact rather than a small, informational flag.
 */
export default function CustomizedContentNotice() {
  return (
    <div className="mb-3 print:hidden">
      <span
        className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-300"
        title="This content differs from the default template and will be flagged during approval."
      >
        ⚠️ Customized from template
      </span>
    </div>
  );
}
