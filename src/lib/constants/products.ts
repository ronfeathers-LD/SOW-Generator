const PRODUCT_CATEGORIES = {
  ROUTING: 'routing',
  BOOKIT: 'bookit',
  OTHER: 'other',
} as const;

// Product ID mappings by category (for performance - avoids database lookups)
export const PRODUCT_IDS_BY_CATEGORY = {
  routing: [
    'b1f01145-94a9-4000-9f89-59555afedf03', // Lead Routing
    'f59381c7-40b4-4def-b83f-053a2b6e48bd', // Contact Routing
    'a9f4cc66-5649-4ae4-a7b5-cbfe89b2ef60', // Account Routing
    'c980026d-08e0-49da-be39-fe37c40f47c7', // Opportunity Routing
    '5d83b73b-363b-4983-be2d-31d53058633e', // Case Routing
    '88415274-4cb2-409c-8c01-1c37f3a122bc', // Any Object (custom) Routing
    '4a3f2862-dbf2-4558-8b66-67701cbbee14', // Lead to Account Matching
  ],
  bookit: [
    '6dde4839-6d67-4821-a7c7-18c227ffcc93', // BookIt for Forms
    'dbe57330-23a9-42bc-bef2-5bbfbcef4e09', // BookIt Links
    '159b4183-ee40-4255-a7d0-968b1482e451', // BookIt Handoff (with Smartrep)
    '6698b269-10b0-485b-be59-ad9c3cc33368', // BookIt Handoff (without Smartrep)
  ],
  other: [
    'c417d9e5-4792-40c2-b461-b8fec985948a', // NotifyPlus
    '511f28fa-6cc4-41f9-9234-dc45056aa2d2', // MultiGraph
  ]
} as const;

// Product interface for type safety
export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  requires_units?: boolean;
}

export const isOtherProduct = (product: Product): boolean => {
  return product.category === PRODUCT_CATEGORIES.OTHER;
};

// Smart validation helper - checks if a product requires units
export const productRequiresUnits = (product: Product): boolean => {
  return product.requires_units === true;
};

// Legacy helper functions (for backward compatibility - accepts productId string)
// These should be gradually replaced with the Product-based versions above
export const isRoutingProductById = (productId: string): boolean => {
  return PRODUCT_IDS_BY_CATEGORY.routing.includes(productId as typeof PRODUCT_IDS_BY_CATEGORY.routing[number]);
};

export const isLeadToAccountProductById = (productId: string): boolean => {
  return productId === '4a3f2862-dbf2-4558-8b66-67701cbbee14'; // Lead to Account Matching
};

export const isFormsProductById = (productId: string): boolean => {
  return productId === '6dde4839-6d67-4821-a7c7-18c227ffcc93'; // BookIt for Forms
};

export const isHandoffProductById = (productId: string): boolean => {
  return productId === '159b4183-ee40-4255-a7d0-968b1482e451' || // BookIt Handoff (with Smartrep)
         productId === '6698b269-10b0-485b-be59-ad9c3cc33368'; // BookIt Handoff (without Smartrep)
};

export const isLinksProductById = (productId: string): boolean => {
  return productId === 'dbe57330-23a9-42bc-bef2-5bbfbcef4e09'; // BookIt Links
};

export const isNoCostProductById = (productId: string): boolean => {
  return productId === 'dbe57330-23a9-42bc-bef2-5bbfbcef4e09' || // BookIt Links
         productId === '6698b269-10b0-485b-be59-ad9c3cc33368'; // BookIt Handoff (without Smartrep)
};

// The hours engine recognizes products by these hardcoded IDs (see
// hours-calculation-utils.ts). A product whose ID isn't here contributes 0 hours
// and isn't treated as routing/BookIt — so creating one via the admin Products
// tool, or deleting+recreating a seeded product (new ID), silently breaks pricing.
// Until the engine is keyed off a stable slug instead of UUIDs, use the helpers
// below to surface that mismatch loudly rather than mis-pricing in silence.
const ENGINE_KNOWN_PRODUCT_IDS: ReadonlySet<string> = new Set<string>([
  ...PRODUCT_IDS_BY_CATEGORY.routing,
  ...PRODUCT_IDS_BY_CATEGORY.bookit,
  ...PRODUCT_IDS_BY_CATEGORY.other,
]);

/** Active products the engine does NOT recognize (would silently score 0 hours). */
export const getEngineUnrecognizedProducts = <T extends { id: string; is_active?: boolean }>(
  products: T[],
): T[] => products.filter((p) => p.is_active !== false && !ENGINE_KNOWN_PRODUCT_IDS.has(p.id));

