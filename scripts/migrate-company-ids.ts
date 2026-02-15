#!/usr/bin/env tsx
/**
 * scripts/migrate-company-ids.ts
 *
 * Builds a migration ledger table (company_id_migration_map) that maps
 * every existing company_id to the deterministic ID produced by the
 * current generateCompanyId() hash function.
 *
 * READ-ONLY except for the mapping table:
 *   - Does NOT update companies
 *   - Does NOT update postings
 *   - Does NOT delete anything
 *
 * The ledger can later be used in a separate SQL step to safely rewrite
 * foreign-key relationships once the mapping has been audited.
 *
 * Usage:
 *   npm run migrate:company-ids          # build the mapping table
 *   npm run migrate:company-ids:dry-run  # preview only, skip writes
 */

import { db } from "../db/index";
import { companies } from "../db/schema";
import { sql } from "drizzle-orm";
import { generateCompanyId } from "../lib/adzuna-import-helpers";

const DRY_RUN = process.env.MIGRATE_COMPANY_IDS_DRY_RUN === "true";
const BATCH_SIZE = 500;

// ── helpers ────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Normalize a company name exactly the way generateCompanyId does
 * so the ledger records match the hash input.
 */
function normalizeCompanyName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escape a text value for inclusion in a raw SQL VALUES list.
 * Doubles single-quotes to prevent injection / syntax errors.
 */
function esc(value: string): string {
  return value.replace(/'/g, "''");
}

// ── main ───────────────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  🗂️  Company ID Migration Ledger Builder");
  console.log("═══════════════════════════════════════════════════════");
  if (DRY_RUN) {
    console.log("  ⚠️  DRY-RUN MODE — mapping table will NOT be written");
  }
  console.log("");

  // ── 1. Ensure mapping table exists ───────────────────────────
  console.log("📋 Step 1/4 — Creating mapping table if missing...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS company_id_migration_map (
      old_id TEXT PRIMARY KEY,
      new_id TEXT NOT NULL,
      normalized_name TEXT NOT NULL
    );
  `);

  console.log("   ✓ company_id_migration_map ready");
  console.log("");

  // ── 2. Clear previous run ───────────────────────────────────
  if (!DRY_RUN) {
    console.log("🧹 Step 2/4 — Truncating previous mapping data...");
    await db.execute(sql`TRUNCATE company_id_migration_map;`);
    console.log("   ✓ Table truncated");
  } else {
    console.log("🧹 Step 2/4 — (skipped in dry-run)");
  }
  console.log("");

  // ── 3. Load companies ───────────────────────────────────────
  console.log("📊 Step 3/4 — Loading companies...");

  const allCompanies = await db
    .select({
      company_id: companies.company_id,
      name: companies.name,
    })
    .from(companies);

  console.log(`   Found ${fmt(allCompanies.length)} companies`);
  console.log("");

  // ── 4. Compute mappings and insert ──────────────────────────
  console.log("🔄 Step 4/4 — Computing deterministic IDs...");

  interface MappingRow {
    old_id: string;
    new_id: string;
    normalized_name: string;
  }

  const rows: MappingRow[] = [];
  let identical = 0;
  let changed = 0;

  for (const company of allCompanies) {
    const normalized = normalizeCompanyName(company.name);
    const newId = generateCompanyId(company.name);

    if (newId === company.company_id) {
      identical++;
    } else {
      changed++;
    }

    rows.push({
      old_id: company.company_id,
      new_id: newId,
      normalized_name: normalized,
    });
  }

  console.log(`   Computed ${fmt(rows.length)} mappings`);
  console.log(`     Identical (old_id = new_id) : ${fmt(identical)}`);
  console.log(`     Changed                     : ${fmt(changed)}`);
  console.log("");

  if (DRY_RUN) {
    // Show a sample of what would change
    const sample = rows.filter(r => r.old_id !== r.new_id).slice(0, 10);
    if (sample.length > 0) {
      console.log("   Sample changes:");
      sample.forEach((r, i) => {
        console.log(`     ${String(i + 1).padStart(2)}. "${r.normalized_name}"`);
        console.log(`         OLD: ${r.old_id}`);
        console.log(`         NEW: ${r.new_id}`);
      });
      console.log("");
    }

    console.log("⚠️  DRY RUN COMPLETE — no data written\n");
    process.exit(0);
  }

  // Batch-insert into mapping table
  console.log(`   Inserting ${fmt(rows.length)} rows in batches of ${BATCH_SIZE}...`);

  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const values = batch
      .map(r => `('${esc(r.old_id)}', '${esc(r.new_id)}', '${esc(r.normalized_name)}')`)
      .join(",\n       ");

    await db.execute(sql.raw(`
      INSERT INTO company_id_migration_map (old_id, new_id, normalized_name)
      VALUES ${values}
      ON CONFLICT (old_id) DO UPDATE
      SET new_id = EXCLUDED.new_id,
          normalized_name = EXCLUDED.normalized_name;
    `));

    process.stdout.write(`\r   batch ${batchNum}/${totalBatches}`);
  }

  console.log(""); // newline after progress
  console.log(`   ✓ All ${fmt(rows.length)} rows written`);
  console.log("");

  // ── Summary ─────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log("  ✅ Migration Ledger Complete");
  console.log("");
  console.log(`  Total companies processed : ${fmt(rows.length)}`);
  console.log(`  IDs that will change      : ${fmt(changed)}`);
  console.log(`  IDs that stay identical   : ${fmt(identical)}`);
  console.log("");
  console.log("  Next steps:");
  console.log("    SELECT * FROM company_id_migration_map WHERE old_id != new_id LIMIT 20;");
  console.log("═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
