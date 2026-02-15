#!/usr/bin/env tsx
/**
 * scripts/verify-company-id-map.ts
 *
 * Validates the company_id_migration_map table before applying the migration.
 * Detects destructive merges, hash collisions, and posting consolidations.
 *
 * CRITICAL CHECKS:
 *   1. Hash collisions (multiple old IDs → same new ID)
 *   2. No-op mappings (old_id = new_id)
 *   3. Posting splits (postings that will merge)
 *
 * Exit codes:
 *   0 - Safe to migrate (no collisions)
 *   1 - UNSAFE (collisions detected)
 *
 * Usage:
 *   tsx scripts/verify-company-id-map.ts
 */

import { db } from "../db/index";
import { sql } from "drizzle-orm";

// ── helpers ────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "0.00";
  return ((numerator / denominator) * 100).toFixed(2);
}

// ── main ───────────────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  🔍 Company ID Migration Validator");
  console.log("  Verifying company_id_migration_map before migration");
  console.log("═══════════════════════════════════════════════════════\n");

  let hasErrors = false;

  // ──────────────────────────────────────────────────────────────
  // 0. Verify table exists
  // ──────────────────────────────────────────────────────────────
  console.log("📋 Checking if migration map exists...");

  const tableCheck = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_name = 'company_id_migration_map'
    ) AS exists;
  `).then(r => r.rows[0] as { exists: boolean });

  if (!tableCheck.exists) {
    console.error("   ❌ Table company_id_migration_map does not exist");
    console.error("   Run: npm run migrate:company-ids first\n");
    process.exit(1);
  }

  const [{ total_rows }] = await db.execute(sql`
    SELECT COUNT(*)::int AS total_rows
    FROM company_id_migration_map;
  `).then(r => r.rows as Array<{ total_rows: number }>);

  if (total_rows === 0) {
    console.error("   ❌ Migration map is empty");
    console.error("   Run: npm run migrate:company-ids first\n");
    process.exit(1);
  }

  console.log(`   ✓ Found ${fmt(total_rows)} rows in migration map`);
  console.log("");

  // ──────────────────────────────────────────────────────────────
  // 1. CRITICAL: Detect hash collisions
  // ──────────────────────────────────────────────────────────────
  console.log("🚨 CRITICAL CHECK: Hash collisions (multiple old IDs → same new ID)...");

  interface Collision {
    new_id: string;
    old_id_count: number;
    old_ids: string[];
    names: string[];
  }

  const collisions = await db.execute(sql`
    SELECT
      new_id,
      COUNT(*)::int AS old_id_count,
      ARRAY_AGG(old_id ORDER BY old_id) AS old_ids,
      ARRAY_AGG(normalized_name ORDER BY normalized_name) AS names
    FROM company_id_migration_map
    GROUP BY new_id
    HAVING COUNT(*) > 1
    ORDER BY old_id_count DESC;
  `).then(r => r.rows as unknown as Collision[]);

  if (collisions.length > 0) {
    const totalAffected = collisions.reduce((sum, c) => sum + c.old_id_count, 0);

    console.error(`   ❌ COLLISION DETECTED: ${collisions.length} groups, ${fmt(totalAffected)} companies affected`);
    console.error("");
    console.error("   Top collision groups:");

    collisions.slice(0, 20).forEach((c, i) => {
      console.error(`\n     ${i + 1}. ${c.old_id_count} companies colliding → ${c.new_id}`);
      console.error(`        Companies:`);
      c.names.forEach((name, idx) => {
        console.error(`          - "${name}" (${c.old_ids[idx]})`);
      });
    });

    console.error("\n   ⚠️  MIGRATION BLOCKED: Hash collisions must be resolved before migration");
    hasErrors = true;
  } else {
    console.log("   ✓ No hash collisions detected");
  }
  console.log("");

  // ──────────────────────────────────────────────────────────────
  // 2. Detect no-op rows (old_id = new_id)
  // ──────────────────────────────────────────────────────────────
  console.log("📊 No-op analysis (unchanged IDs)...");

  const [{ unchanged_count }] = await db.execute(sql`
    SELECT COUNT(*)::int AS unchanged_count
    FROM company_id_migration_map
    WHERE old_id = new_id;
  `).then(r => r.rows as Array<{ unchanged_count: number }>);

  const unchanged_pct = pct(unchanged_count, total_rows);

  console.log(`   Unchanged IDs: ${fmt(unchanged_count)} / ${fmt(total_rows)} (${unchanged_pct}%)`);
  console.log(`   Changing IDs : ${fmt(total_rows - unchanged_count)} / ${fmt(total_rows)} (${pct(total_rows - unchanged_count, total_rows)}%)`);
  console.log("");

  // ──────────────────────────────────────────────────────────────
  // 3. Detect posting splits (postings that will merge)
  // ──────────────────────────────────────────────────────────────
  console.log("🔀 Posting consolidation analysis (companies that will merge postings)...");

  interface PostingSplit {
    new_id: string;
    old_ids_used: number;
    posting_count: number;
  }

  const postingSplits = await db.execute(sql`
    SELECT
      m.new_id,
      COUNT(DISTINCT p.company_id)::int AS old_ids_used,
      COUNT(*)::int AS posting_count
    FROM postings p
    JOIN company_id_migration_map m
      ON p.company_id = m.old_id
    GROUP BY m.new_id
    HAVING COUNT(DISTINCT p.company_id) > 1
    ORDER BY posting_count DESC
    LIMIT 50;
  `).then(r => r.rows as unknown as PostingSplit[]);

  if (postingSplits.length > 0) {
    const totalMergingPostings = postingSplits.reduce((sum, s) => sum + s.posting_count, 0);
    const totalCompaniesInvolved = postingSplits.reduce((sum, s) => sum + s.old_ids_used, 0);

    console.log(`   ⚠️  ${postingSplits.length} companies will consolidate postings`);
    console.log(`   Total postings affected: ${fmt(totalMergingPostings)}`);
    console.log(`   Total old companies involved: ${fmt(totalCompaniesInvolved)}`);
    console.log("");
    console.log(`   Top 20 consolidations:`);

    for (let i = 0; i < Math.min(20, postingSplits.length); i++) {
      const split = postingSplits[i];
      console.log(`     ${String(i + 1).padStart(2)}. ${split.old_ids_used} companies → 1 (${fmt(split.posting_count)} postings)`);
      console.log(`         new_id: ${split.new_id}`);
    }
  } else {
    console.log("   ✓ No posting consolidations will occur");
  }
  console.log("");

  // ──────────────────────────────────────────────────────────────
  // 4. Final summary
  // ──────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log("  📊 VALIDATION SUMMARY");
  console.log("═══════════════════════════════════════════════════════");
  console.log("");
  console.log(`  Total companies in map      : ${fmt(total_rows)}`);
  console.log(`  IDs that will change        : ${fmt(total_rows - unchanged_count)} (${pct(total_rows - unchanged_count, total_rows)}%)`);
  console.log(`  IDs unchanged               : ${fmt(unchanged_count)} (${unchanged_pct}%)`);
  console.log(`  Hash collision groups       : ${collisions.length}`);
  console.log(`  Companies with posting merge: ${postingSplits.length}`);
  console.log("");

  if (hasErrors) {
    console.log("  ❌ VALIDATION FAILED");
    console.log("  ⚠️  UNSAFE TO MIGRATE — resolve collisions first");
    console.log("═══════════════════════════════════════════════════════\n");
    process.exit(1);
  } else {
    console.log("  ✅ VALIDATION PASSED");
    console.log("  ✓ Safe to proceed with migration");
    console.log("");
    console.log("  Next steps:");
    console.log("    1. Review posting consolidations above (if any)");
    console.log("    2. Create and run SQL migration to apply the mapping");
    console.log("═══════════════════════════════════════════════════════\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
