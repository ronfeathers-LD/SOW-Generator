import { SVF_PILLARS } from '@/lib/sow/svf-pillars';

/**
 * Builds the fixed (code-owned, non-admin-editable) portion of the Gemini
 * prompt that defines the pillar-nested `solutions` and `scopeItems` JSON
 * contract plus SVF pillar classification instructions. Voice rules and
 * exemplars live in the admin-editable `ai_prompts` content, appended after
 * this block by analyzeTranscription().
 */
export function buildSolutionsAndScopeContract(selectedProducts: string[]): string {
  const productList =
    selectedProducts && selectedProducts.length > 0
      ? selectedProducts.map((p) => `"${p}"`).join(', ')
      : '(none selected — infer products discussed in the transcript)';

  const pillarDefs = SVF_PILLARS.map((p) => `- ${p.name}: ${p.definition}`).join('\n');

  // Example uses the first pillar + first product only, to show the shape.
  const exampleProduct = selectedProducts?.[0] || 'productName1';

  return `
The Solution Value Framework (SVF) has exactly four pillars. Classify every
in-scope use case and every deliverable under the single most-relevant pillar:
${pillarDefs}

"scopeItems" is the list of in-scope use cases, grouped by pillar. "solutions"
is the list of concrete deliverables, grouped by pillar and then by product.
Only include a pillar object when it has content. Preserve the order of the
selected products: ${productList}. Do not rename or invent product names beyond
those discussed in the transcript.

The "scopeItems" and "solutions" fields MUST use exactly this structure:
  "scopeItems": [
    { "pillar": "Acquire", "items": ["An in-scope use case for this pillar, as discussed."] }
  ],
  "solutions": [
    {
      "pillar": "Acquire",
      "products": {
        "${exampleProduct}": ["A specific deliverable for this product under this pillar, as discussed."]
      }
    }
  ]`;
}
