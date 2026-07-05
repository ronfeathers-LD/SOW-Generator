-- Migration 031: canonicalize sows.pricing_roles to the object shape (#104)
--
-- The column historically held two incompatible shapes: the create path wrote
-- a bare roles array while the Pricing tab wrote a structured object
-- ({ roles, subtotal, discount_total, total_amount, discount_type, ... }),
-- forcing every reader to branch on Array.isArray. The app now writes only the
-- object shape (buildPricingRolesColumn); this migration converts existing
-- array/null rows and updates the column default so no bare array can appear
-- again.
--
-- Array rows carry no discount config (that only ever existed in the object
-- form), so they convert with discount_type 'none' and a subtotal recomputed
-- from the roles the same way the app does (ratePerHour * totalHours, with
-- non-numeric values treated as 0).

-- 1. Convert legacy bare-array rows to the canonical object.
WITH calc AS (
  SELECT
    s.id,
    COALESCE(SUM(
      (CASE WHEN e.value->>'ratePerHour' ~ '^-?[0-9]+(\.[0-9]+)?$'
            THEN (e.value->>'ratePerHour')::numeric ELSE 0 END) *
      (CASE WHEN e.value->>'totalHours' ~ '^-?[0-9]+(\.[0-9]+)?$'
            THEN (e.value->>'totalHours')::numeric ELSE 0 END)
    ), 0) AS subtotal
  FROM sows s
  LEFT JOIN LATERAL jsonb_array_elements(s.pricing_roles) e ON TRUE
  WHERE jsonb_typeof(s.pricing_roles) = 'array'
  GROUP BY s.id
)
UPDATE sows s
SET pricing_roles = jsonb_build_object(
  'roles', s.pricing_roles,
  'subtotal', c.subtotal,
  'discount_total', 0,
  'total_amount', c.subtotal,
  'discount_type', 'none'
)
FROM calc c
WHERE c.id = s.id;

-- 2. Convert NULL rows to the canonical empty object.
UPDATE sows
SET pricing_roles = '{"roles": [], "subtotal": 0, "discount_total": 0, "total_amount": 0, "discount_type": "none"}'::jsonb
WHERE pricing_roles IS NULL;

-- 3. Future direct inserts default to the canonical empty object, not '[]'.
ALTER TABLE sows
  ALTER COLUMN pricing_roles
  SET DEFAULT '{"roles": [], "subtotal": 0, "discount_total": 0, "total_amount": 0, "discount_type": "none"}'::jsonb;
