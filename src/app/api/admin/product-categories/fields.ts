// Allowlist of writable product_categories columns — prevents mass-assignment
// of arbitrary fields from the request body.
const ALLOWED_CATEGORY_FIELDS = ['name', 'description', 'sort_order', 'is_active'] as const;

export function pickCategoryFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of ALLOWED_CATEGORY_FIELDS) {
    if (body[f] !== undefined) out[f] = body[f];
  }
  return out;
}
