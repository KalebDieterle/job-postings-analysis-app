#!/usr/bin/env tsx
/**
 * scripts/apply-company-id-migration.ts
 *
 * Applies the company ID migration by updating companies and postings tables
 * with new deterministic IDs from the company_id_migration_map ledger.
 *
 * CRITICAL: Run with DRY_RUN=true first to preview changes!
 *
 * Usage:
 *   APPLY_MIGRATION_DRY_RUN=true tsx scripts/apply-company-id-migration.ts  # Preview only
 *   tsx scripts/apply-company-id-migration.ts                              # Apply for real
 */

import { db } from "../db/index";
import { sql } from "drizzle-orm";

const DRY_RUN = process.env.APPLY_MIGRATION_DRY_RUN === "true";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  🔄 Apply Company ID Migration");
  console.log("═══════════════════════════════════════════════════════");
  if (DRY_RUN) {
    console.log("  ⚠️  DRY-RUN MODE — no changes will be made");
  }
  console.log("");

  // ──────────────────────────────────────────────────────────────
  // Step 1: Check migration map exists and has data
  // ──────────────────────────────────────────────────────────────
  console.log("📋 Step 1/4 — Checking migration map...");

  const [{ map_count }] = await db.execute(sql`
    SELECT COUNT(*)::int AS map_count
    FROM company_id_migration_map;
  `).then(r => r.rows as Array<{ map_count: number }>);

  if (map_count === 0) {
    console.error("   ❌ Migration map is empty!");
    console.error("   Run: npm run migrate:company-ids first\n");
    process.exit(1);
  }

  console.log(`   ✓ Found ${fmt(map_count)} mappings`);

  // Check for remaining collisions
  const [{ collision_count }] = await db.execute(sql`
    SELECT COUNT(*) AS collision_count
    FROM (
      SELECT new_id
      FROM company_id_migration_map
      GROUP BY new_id
      HAVING COUNT(*) > 1
    ) subquery;
  `).then(r => r.rows as Array<{ collision_count: number }>);

  if (collision_count > 0) {
    console.error(`   ❌ ERROR: ${collision_count} hash collisions detected!`);
    console.error("   Run: npm run fix:company-id-collisions first\n");
    process.exit(1);
  }

  console.log("   ✓ No hash collisions");
  console.log("");

  if (DRY_RUN) {
    // ──────────────────────────────────────────────────────────────
    // DRY-RUN: Show what will change
    // ──────────────────────────────────────────────────────────────
    console.log("📊 Step 2/4 — Previewing changes (DRY-RUN)...");

    const [{ companies_to_update }] = await db.execute(sql`
      SELECT COUNT(*)::int AS companies_to_update
      FROM companies c
      WHERE EXISTS (
        SELECT 1 FROM company_id_migration_map m
        WHERE m.old_id = c.company_id
      );
    `).then(r => r.rows as Array<{ companies_to_update: number }>);

    const [{ postings_to_update }] = await db.execute(sql`
      SELECT COUNT(*)::int AS postings_to_update
      FROM postings p
      WHERE EXISTS (
        SELECT 1 FROM company_id_migration_map m
        WHERE m.old_id = p.company_id
      );
    `).then(r => r.rows as Array<{ postings_to_update: number }>);

    console.log(`   Would update: ${fmt(companies_to_update)} companies`);
    console.log(`   Would update: ${fmt(postings_to_update)} postings`);
    console.log(`   Would delete: company_id_migration_map`);
    console.log("");

    // Show sample changes
    console.log("   Sample mapping (first 10):");
    const sample = await db.execute(sql`
      SELECT old_id, new_id FROM company_id_migration_map LIMIT 10;
    `).then(r => r.rows as Array<{ old_id: string; new_id: string }>);

    sample.forEach((s, i) => {
      console.log(`     ${String(i + 1).padStart(2)}. ${s.old_id} → ${s.new_id}`);
    });
    console.log("");

    console.log("⚠️  DRY-RUN COMPLETE");
    console.log("   To apply: npm run apply:company-id-migration\n");
    process.exit(0);
  }

  // ──────────────────────────────────────────────────────────────
  // Step 2: Update companies table
  // ──────────────────────────────────────────────────────────────
  console.log("🏢 Step 2/4 — Updating companies table...");

  await db.execute(sql`
    UPDATE companies c
    SET company_id = m.new_id
    FROM company_id_migration_map m
    WHERE c.company_id = m.old_id;
  `);

  const [{ updated_companies }] = await db.execute(sql`
    SELECT COUNT(*)::int AS updated_companies
    FROM company_id_migration_map;
  `).then(r => r.rows as Array<{ updated_companies: number }>);

  console.log(`   ✓ Updated ${fmt(updated_companies)} companies`);
  console.log("");

  // ──────────────────────────────────────────────────────────────
  // Step 3: Update postings table
  // ──────────────────────────────────────────────────────────────
  console.log("📝 Step 3/4 — Updating postings table...");

  await db.execute(sql`
    UPDATE postings p
    SET company_id = m.new_id
    FROM company_id_migration_map m
    WHERE p.company_id = m.old_id;
  `);

  const [{ updated_postings }] = await db.execute(sql`
    SELECT COUNT(*)::int AS updated_postings
    FROM postings p
    WHERE EXISTS (
      SELECT 1 FROM companies c WHERE c.company_id = p.company_id
    );
  `).then(r => r.rows as Array<{ updated_postings: number }>);

  console.log(`   ✓ Updated ${fmt(updated_postings)} postings`);
  console.log("");

  // ──────────────────────────────────────────────────────────────
  // Step 4: Verify & cleanup
  // ──────────────────────────────────────────────────────────────
  console.log("✅ Step 4/4 — Verifying integrity...");

  const [{ orphaned }] = await db.execute(sql`
    SELECT COUNT(*)::int AS orphaned
    FROM postings p
    LEFT JOIN companies c ON p.company_id = c.company_id
    WHERE c.company_id IS NULL;
  `).then(r => r.rows as Array<{ orphaned: number }>);

  if (orphaned > 0) {
    console.error(`   ❌ ERROR: ${fmt(orphaned)} orphaned postings detected!`);
    console.error("   Migration failed — referential integrity violated");
    process.exit(1);
  }

  console.log("   ✓ All postings have valid company references");

  // Cleanup the migration map
  await db.execute(sql`DROP TABLE company_id_migration_map;`);
  console.log("   ✓ Migration ledger cleaned up");
  console.log("");

  // ──────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log("  ✅ Migration Applied Successfully!");
  console.log("");
  console.log(`  Companies updated: ${fmt(updated_companies)}`);
  console.log(`  Postings updated : ${fmt(updated_postings)}`);
  console.log(`  Orphaned postings: 0 ✓`);
  console.log("");
  console.log("  Next steps:");
  console.log("    npm run verify:companies");
  console.log("    npm run preview:adzuna");
  console.log("═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
