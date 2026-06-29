/**
 * Backfill script: heal SOWs with a stranded PM-removal deduction.
 *
 * Problem: before the single-source-of-truth refactor, removing a Project Manager
 * on an Enterprise SOW could leave the database row in an inconsistent state —
 * the PM role deleted from pricing_roles but the Onboarding Specialist's hours
 * still carrying the half-PM deduction (OS at base − pmHours/2 instead of base),
 * and pm_hours_requirement_disabled still false.  Those SOWs don't self-heal on
 * the next save because the flag is false, so the form re-adds the PM.
 *
 * Usage:
 *   # Dry-run (default, read-only):
 *   node scripts/backfill-pm-removal-consistency.js
 *
 *   # Apply fixes:
 *   node scripts/backfill-pm-removal-consistency.js --apply
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * @type {CJS}
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Hours-calculation logic (inline — mirrors hours-calculation-utils.ts exactly
// so there is no build/compile step dependency for this script).
// ---------------------------------------------------------------------------

// UUID lookup sets — must stay in sync with src/lib/constants/products.ts.
const ROUTING_IDS = new Set([
  'b1f01145-94a9-4000-9f89-59555afedf03', // Lead Routing
  'f59381c7-40b4-4def-b83f-053a2b6e48bd', // Contact Routing
  'a9f4cc66-5649-4ae4-a7b5-cbfe89b2ef60', // Account Routing
  'c980026d-08e0-49da-be39-fe37c40f47c7', // Opportunity Routing
  '5d83b73b-363b-4983-be2d-31d53058633e', // Case Routing
  '88415274-4cb2-409c-8c01-1c37f3a122bc', // Any Object Routing
  '4a3f2862-dbf2-4558-8b66-67701cbbee14', // Lead to Account Matching
]);

const LEAD_TO_ACCOUNT_ID = '4a3f2862-dbf2-4558-8b66-67701cbbee14';
const BOOKIT_FORMS_ID    = '6dde4839-6d67-4821-a7c7-18c227ffcc93';
const BOOKIT_LINKS_ID    = 'dbe57330-23a9-42bc-bef2-5bbfbcef4e09';
const BOOKIT_HANDOFF_SMART_ID   = '159b4183-ee40-4255-a7d0-968b1482e451';
const BOOKIT_HANDOFF_NOSMART_ID = '6698b269-10b0-485b-be59-ad9c3cc33368';

function safeParseInt(v) {
  if (!v) return 0;
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

function getTotalUnits(sow) {
  const orch = safeParseInt(sow.number_of_units) || safeParseInt(sow.orchestration_units);
  const bk   = Math.max(
    safeParseInt(sow.bookit_forms_units),
    safeParseInt(sow.bookit_links_units),
    safeParseInt(sow.bookit_handoff_units),
  );
  return Math.max(orch, bk);
}

function calculateProductHours(products) {
  if (!products || products.length === 0) return 0;
  let total = 0;

  const withoutLinks = products.filter(p => p !== BOOKIT_LINKS_ID);

  if (products.includes(LEAD_TO_ACCOUNT_ID) && withoutLinks.length === 1) {
    total += 15;
  } else {
    const routing = products.filter(p => ROUTING_IDS.has(p) && p !== LEAD_TO_ACCOUNT_ID);
    if (routing.length > 0) {
      total += 15 + (routing.length - 1) * 5;
    }
  }

  if (products.includes(BOOKIT_FORMS_ID)) {
    total += 10;
    if (products.includes(BOOKIT_HANDOFF_SMART_ID)) total += 5;
  }

  if (products.includes(BOOKIT_LINKS_ID))         total += 1;
  if (products.includes(BOOKIT_HANDOFF_NOSMART_ID)) total += 1;

  return total;
}

function calculateUserGroupHours(sow) {
  const units = getTotalUnits(sow);
  return units >= 50 ? Math.floor(units / 50) * 5 : 0;
}

function calculateAccountSegmentHours(segment) {
  return (segment === 'MM' || segment === 'MidMarket') ? 5 : 0;
}

function shouldAddPM(sow) {
  const products = (sow.products || []).filter(p => p !== BOOKIT_LINKS_ID);
  return products.length >= 3 || getTotalUnits(sow) >= 200;
}

function getBaseProjectHours(sow) {
  return calculateProductHours(sow.products || [])
    + calculateUserGroupHours(sow)
    + calculateAccountSegmentHours(sow.account_segment);
}

// ---------------------------------------------------------------------------
// Classifier (mirrors src/lib/sow/backfill-pm-consistency.ts)
// ---------------------------------------------------------------------------

function extractRoles(pricingRoles) {
  if (!pricingRoles) return [];
  if (Array.isArray(pricingRoles)) return pricingRoles;
  return Array.isArray(pricingRoles.roles) ? pricingRoles.roles : [];
}

function toNum(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
}

/**
 * @param {object} sow - Row from the sows table (flat).
 * @returns {{ action: string, osTarget?: number, pmHoursRemoved?: number }}
 */
function classifySow(sow) {
  if (sow.pm_hours_requirement_disabled) return { action: 'none' };
  if (!shouldAddPM(sow))                 return { action: 'none' };

  const roles  = extractRoles(sow.pricing_roles);
  const hasPM  = roles.some(r => r.role === 'Project Manager');
  if (hasPM) return { action: 'none' };

  const base          = getBaseProjectHours(sow);
  const osRole        = roles.find(r => r.role === 'Onboarding Specialist');
  const currentOsHrs  = toNum(osRole?.totalHours);

  if (currentOsHrs < base) {
    return {
      action: 'restore-os-set-flag',
      osTarget: base,
      pmHoursRemoved: (base - currentOsHrs) * 2,
    };
  }

  return { action: 'none' };
}

// ---------------------------------------------------------------------------
// Pricing update helper (mirrors stripProjectManagerFromPricing in reverse —
// only restores OS hours, does NOT add a PM role back; also recomputes totals).
// ---------------------------------------------------------------------------

/**
 * Return a new pricing_roles value with the Onboarding Specialist hours set to
 * osTarget and subtotal/total recomputed.  Does not touch any other role.
 *
 * @param {unknown} pricingRoles  - Current pricing_roles value from DB.
 * @param {number}  osTarget      - Correct OS hours to restore.
 * @returns {unknown}             - Updated pricing_roles in the same shape.
 */
function restoreOsHours(pricingRoles, osTarget) {
  const isObj   = !!pricingRoles && typeof pricingRoles === 'object' && !Array.isArray(pricingRoles);
  const container = isObj ? pricingRoles : null;
  const rolesIn = Array.isArray(pricingRoles)
    ? pricingRoles
    : (container && Array.isArray(container.roles) ? container.roles : []);

  const newRoles = rolesIn.map(r =>
    r.role === 'Onboarding Specialist' ? { ...r, totalHours: osTarget } : r
  );

  const subtotal = newRoles.reduce((s, r) => s + toNum(r.totalHours) * toNum(r.ratePerHour), 0);

  if (!isObj) {
    return newRoles;
  }

  const discountType  = container.discount_type || 'none';
  let discountTotal   = 0;
  if (discountType === 'fixed') {
    discountTotal = toNum(container.discount_amount);
  } else if (discountType === 'percentage') {
    discountTotal = subtotal * (toNum(container.discount_percentage) / 100);
  }

  return {
    ...container,
    roles: newRoles,
    subtotal,
    discount_total: discountTotal,
    total_amount: subtotal - discountTotal,
    last_calculated: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const APPLY = process.argv.includes('--apply');

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log(`\n=== PM-Removal Consistency Backfill  [${APPLY ? 'APPLY' : 'DRY-RUN'}] ===\n`);

  // Fetch only the columns the classifier and writer need.
  const { data: sows, error } = await client
    .from('sows')
    .select([
      'id', 'sow_title', 'client_name', 'account_segment',
      'pm_hours_requirement_disabled',
      'products',
      'number_of_units', 'orchestration_units',
      'bookit_forms_units', 'bookit_links_units', 'bookit_handoff_units',
      'other_products_units', 'units_consumption',
      'pricing_roles',
    ].join(', '))
    .not('status', 'in', '("hidden","deleted")');

  if (error) {
    console.error('Failed to fetch SOWs:', error);
    process.exit(1);
  }

  console.log(`Fetched ${sows.length} SOWs from the database.\n`);

  const affected = [];

  for (const sow of sows) {
    const result = classifySow(sow);
    if (result.action !== 'none') {
      affected.push({ sow, result });
    }
  }

  if (affected.length === 0) {
    console.log('No stranded-deduction SOWs found. Database is consistent.\n');
    return;
  }

  // Table header
  const col = (s, w) => String(s ?? '').slice(0, w).padEnd(w);
  const header = [
    col('SOW ID', 36),
    col('Client', 24),
    col('Seg', 4),
    col('OS hours (now)', 14),
    col('OS target', 10),
    col('PM hrs removed', 14),
    col('Status', 8),
  ].join(' | ');
  const sep = '-'.repeat(header.length);

  console.log(`Found ${affected.length} affected SOW(s):\n`);
  console.log(header);
  console.log(sep);

  for (const { sow, result } of affected) {
    const roles       = extractRoles(sow.pricing_roles);
    const osRole      = roles.find(r => r.role === 'Onboarding Specialist');
    const currentOs   = toNum(osRole?.totalHours);

    console.log([
      col(sow.id, 36),
      col(sow.client_name, 24),
      col(sow.account_segment, 4),
      col(currentOs, 14),
      col(result.osTarget, 10),
      col(result.pmHoursRemoved, 14),
      col(APPLY ? 'FIXING' : 'DRY-RUN', 8),
    ].join(' | '));
  }

  console.log(sep);
  console.log('');

  if (!APPLY) {
    console.log('Dry-run complete. Re-run with --apply to write these fixes.\n');
    return;
  }

  // -------- APPLY path --------
  console.log('Applying fixes…\n');
  let successCount = 0;
  let failCount    = 0;

  for (const { sow, result } of affected) {
    const updatedPricing = restoreOsHours(sow.pricing_roles, result.osTarget);
    const now = new Date().toISOString();

    const { error: updateError } = await client
      .from('sows')
      .update({
        pm_hours_requirement_disabled:            true,
        pm_hours_requirement_disabled_date:       now,
        pm_hours_removed:                         result.pmHoursRemoved,
        pm_hours_removal_approved:                true,
        pm_hours_removal_date:                    now,
        ...(sow.pricing_roles ? { pricing_roles: updatedPricing } : {}),
      })
      .eq('id', sow.id);

    if (updateError) {
      console.error(`  FAIL  ${sow.id} (${sow.client_name}):`, updateError.message);
      failCount++;
    } else {
      console.log(`  OK    ${sow.id} (${sow.client_name})`);
      successCount++;
    }
  }

  console.log(`\nDone. ${successCount} fixed, ${failCount} failed.\n`);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
