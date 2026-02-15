#!/usr/bin/env tsx
/**
 * scripts/apply-production-migrations.ts
 * 
 * Applies all production safety migrations in correct order:
 * 1. Creates adzuna_usage table for API quota tracking
 * 2. Adds country column to postings for global deduplication
 * 
 * Idempotent: Safe to re-run multiple times
 */

import { db } from "../db/index";
import { sql } from "drizzle-orm";

async function main() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  🔄 Production Safety Migrations");
  console.log("═══════════════════════════════════════════════════════\n");

  try {
    // Migration 1: adzuna_usage table
    console.log("📋 Migration 1/2: Creating adzuna_usage table...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS adzuna_usage (
        period TEXT NOT NULL,
        period_key TEXT NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (period, period_key)
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS adzuna_usage_period_idx ON adzuna_usage(period);
    `);

    console.log("   ✅ adzuna_usage table ready\n");

    // Migration 2: country column
    console.log("📋 Migration 2/2: Adding country column to postings...");

    // Add column if it doesn't exist
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'postings' AND column_name = 'country'
        ) THEN
          ALTER TABLE postings ADD COLUMN country TEXT;
          
          -- Populate existing records with 'US' (assumption: existing data is US-only)
          UPDATE postings SET country = 'US' WHERE country IS NULL;
          
          RAISE NOTICE 'Added country column to postings table';
        ELSE
          RAISE NOTICE 'Country column already exists';
        END IF;
      END $$;
    `);

    // Drop old index if exists
    await db.execute(sql`
      DROP INDEX IF EXISTS postings_external_id_source_idx;
    `);

    // Create new compound index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS postings_external_id_source_country_idx 
        ON postings(external_id, source, country);
    `);

    console.log("   ✅ Country column and index ready\n");

    // Verification
    console.log("🔍 Verifying migrations...\n");

    const [{ adzunaTableExists }] = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'adzuna_usage'
      ) AS "adzunaTableExists";
    `).then(r => r.rows as any[]);

    const [{ countryColumnExists }] = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'postings' AND column_name = 'country'
      ) AS "countryColumnExists";
    `).then(r => r.rows as any[]);

    const [{ indexExists }] = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'postings' 
          AND indexname = 'postings_external_id_source_country_idx'
      ) AS "indexExists";
    `).then(r => r.rows as any[]);

    console.log("   Verification Results:");
    console.log(`   ├─ adzuna_usage table: ${adzunaTableExists ? '✅' : '❌'}`);
    console.log(`   ├─ postings.country column: ${countryColumnExists ? '✅' : '❌'}`);
    console.log(`   └─ compound index: ${indexExists ? '✅' : '❌'}\n`);

    if (adzunaTableExists && countryColumnExists && indexExists) {
      console.log("═══════════════════════════════════════════════════════");
      console.log("  ✅ All migrations applied successfully!");
      console.log("═══════════════════════════════════════════════════════\n");
      
      console.log("Next steps:");
      console.log("  1. Run company ID migration: npm run migrate:company-ids:dry-run");
      console.log("  2. Review dry-run output");
      console.log("  3. Apply migration: npm run migrate:company-ids");
      console.log("  4. Verify: npm run verify:companies\n");
    } else {
      console.error("❌ Migration verification failed!");
      process.exit(1);
    }

  } catch (error: any) {
    console.error("\n💥 Migration failed:", error.message);
    console.error("\nStack trace:", error.stack);
    process.exit(1);
  }
}

main();
