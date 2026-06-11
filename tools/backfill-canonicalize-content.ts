/**
 * Backfill: canonicalize stored SOW section HTML (#346).
 *
 * Rewrites every `custom_*_content` column in SOW_SECTION_CONTENT_COLUMNS to
 * its canonical form (see canonicalizeContent in src/lib/sow-content.ts) so
 * that pre-existing rows match what the write paths now produce.
 *
 * DRY-RUN BY DEFAULT — reports, per SOW and per section, whether
 * canonicalization would change the stored value:
 *   - textContent changes are shown as a compact diff around the first
 *     divergence (these are the ones that matter for text anchors),
 *   - markup-only changes are reported with byte counts.
 *
 * Pass --apply to actually write the changes.
 *
 * Usage:
 *   npm run backfill:canonicalize            # dry run
 *   npm run backfill:canonicalize -- --apply # write changes
 *
 * Uses the service-role Supabase client from .env.local / the environment.
 * Do NOT point this at a remote database without an explicit decision to.
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import DOMPurify from 'isomorphic-dompurify';
import {
  canonicalizeContent,
  SOW_SECTION_CONTENT_COLUMNS,
  SOW_SECTION_KEYS,
  type SOWSectionKey,
} from '../src/lib/sow-content';

loadEnv({ path: '.env.local' });
loadEnv();

const APPLY = process.argv.includes('--apply');
const PAGE_SIZE = 200;

function textContentOf(html: string): string {
  const node = DOMPurify.sanitize(html, { RETURN_DOM: true }) as HTMLElement;
  return node.textContent ?? '';
}

/** Compact one-line context diff around the first divergence point. */
function firstDivergence(a: string, b: string, context = 40): string {
  let i = 0;
  const max = Math.min(a.length, b.length);
  while (i < max && a[i] === b[i]) i++;
  const from = Math.max(0, i - context);
  const show = (s: string) =>
    JSON.stringify(s.slice(from, i + context)) + (s.length > i + context ? '…' : '');
  return `      at char ${i}:\n        stored:    ${show(a)}\n        canonical: ${show(b)}`;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.'
    );
    process.exit(1);
  }

  console.log(`Target: ${supabaseUrl}`);
  console.log(`Mode:   ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (no writes)'}\n`);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const columns = SOW_SECTION_KEYS.map((k) => SOW_SECTION_CONTENT_COLUMNS[k]);
  const selectList = ['id', 'client_name', 'sow_title', ...columns].join(', ');

  let offset = 0;
  let scanned = 0;
  let sowsChanged = 0;
  let applied = 0;
  let failed = 0;
  const perSectionCounts: Record<SOWSectionKey, { text: number; markup: number }> =
    Object.fromEntries(
      SOW_SECTION_KEYS.map((k) => [k, { text: 0, markup: 0 }])
    ) as Record<SOWSectionKey, { text: number; markup: number }>;

  for (;;) {
    const { data: rows, error } = await supabase
      .from('sows')
      .select(selectList)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to fetch sows:', error.message);
      process.exit(1);
    }
    if (!rows || rows.length === 0) break;

    for (const row of rows as unknown as Array<Record<string, unknown>>) {
      scanned++;
      const update: Record<string, string> = {};
      const reportLines: string[] = [];

      for (const key of SOW_SECTION_KEYS) {
        const column = SOW_SECTION_CONTENT_COLUMNS[key];
        const stored = row[column];
        // Preserve null semantics exactly: never turn a missing section into ''.
        if (typeof stored !== 'string') continue;

        const canonical = canonicalizeContent(stored);
        if (canonical === stored) continue;

        update[column] = canonical;
        const storedText = textContentOf(stored);
        const canonicalText = textContentOf(canonical);
        if (storedText !== canonicalText) {
          perSectionCounts[key].text++;
          reportLines.push(
            `    ${key}: TEXT CHANGE (${stored.length}B → ${canonical.length}B)\n` +
              firstDivergence(storedText, canonicalText)
          );
        } else {
          perSectionCounts[key].markup++;
          reportLines.push(
            `    ${key}: markup-only (${stored.length}B → ${canonical.length}B, textContent identical)`
          );
        }
      }

      if (Object.keys(update).length === 0) continue;

      sowsChanged++;
      console.log(
        `${row.id}  ${String(row.client_name || '?')} — ${String(row.sow_title || 'Untitled')}`
      );
      for (const line of reportLines) console.log(line);

      if (APPLY) {
        const { error: updateError } = await supabase
          .from('sows')
          .update(update)
          .eq('id', row.id as string);
        if (updateError) {
          failed++;
          console.error(`    ✗ update failed: ${updateError.message}`);
        } else {
          applied++;
          console.log(`    ✓ applied (${Object.keys(update).length} sections)`);
        }
      }
    }

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log('\n=== Summary ===');
  console.log(`SOWs scanned:        ${scanned}`);
  console.log(`SOWs needing change: ${sowsChanged}`);
  for (const key of SOW_SECTION_KEYS) {
    const { text, markup } = perSectionCounts[key];
    if (text || markup) {
      console.log(`  ${key}: ${text} textContent change(s), ${markup} markup-only`);
    }
  }
  if (APPLY) {
    console.log(`Applied: ${applied}, failed: ${failed}`);
    if (failed > 0) process.exit(1);
  } else if (sowsChanged > 0) {
    console.log('\nDry run only — re-run with --apply to write these changes.');
  }
}

main().catch((err) => {
  console.error('Backfill crashed:', err);
  process.exit(1);
});
