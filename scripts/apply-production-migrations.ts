#!/usr/bin/env tsx
/**
 * scripts/apply-production-migrations.ts
 *
 * Applies production safety migrations:
 * 1. Creates adzuna_usage table for API quota tracking
 * 2. Ensures postings.country exists and is backfilled
 * 3. Enforces UNIQUE index on (external_id, source, country) for ON CONFLICT upserts
 *
 * Idempotent: safe to re-run.
 */

import { db } from "../db/index";
import { sql } from "drizzle-orm";

type BoolRow = { exists?: boolean; is_unique?: boolean };
type CountRow = { duplicate_groups?: number };
type DuplicateSampleRow = {
  external_id: string | null;
  source: string | null;
  country: string | null;
  row_count: number;
};

async function main() {
  console.log("\n========================================================");
  console.log("  Production Safety Migrations");
  console.log("========================================================\n");

  try {
    console.log("Migration 1/2: Ensuring adzuna_usage table...");

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

    console.log("  OK: adzuna_usage ready\n");

    console.log("Migration 2/2: Enforcing postings dedupe keys...");

    await db.execute(sql`
      ALTER TABLE postings ADD COLUMN IF NOT EXISTS country TEXT;
    `);

    await db.execute(sql`
      UPDATE postings
      SET country = 'US'
      WHERE country IS NULL;
    `);

    // Legacy index from early migration is no longer used.
    await db.execute(sql`
      DROP INDEX IF EXISTS postings_external_id_source_idx;
    `);

    const [{ duplicate_groups }] = await db
      .execute(sql`
        SELECT COUNT(*)::int AS duplicate_groups
        FROM (
          SELECT external_id, source, country, COUNT(*)
          FROM postings
          WHERE external_id IS NOT NULL
            AND source IS NOT NULL
            AND country IS NOT NULL
          GROUP BY external_id, source, country
          HAVING COUNT(*) > 1
        ) d;
      `)
      .then((r) => r.rows as CountRow[]);

    if ((duplicate_groups ?? 0) > 0) {
      const samples = await db
        .execute(sql`
          SELECT external_id, source, country, COUNT(*)::int AS row_count
          FROM postings
          WHERE external_id IS NOT NULL
            AND source IS NOT NULL
            AND country IS NOT NULL
          GROUP BY external_id, source, country
          HAVING COUNT(*) > 1
          ORDER BY row_count DESC
          LIMIT 5;
        `)
        .then((r) => r.rows as DuplicateSampleRow[]);

      console.error("\nERROR: Cannot create unique index due to duplicate key groups.");
      console.error(`Duplicate groups found: ${duplicate_groups}`);
      console.error("Top duplicate groups:");
      for (const row of samples) {
        console.error(
          `  - (${row.external_id}, ${row.source}, ${row.country}) x ${row.row_count}`
        );
      }
      console.error(
        "\nResolve duplicates first, then rerun this migration."
      );
      process.exit(1);
    }

    await db.execute(sql`
      DROP INDEX IF EXISTS postings_external_id_source_country_idx;
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX postings_external_id_source_country_idx
      ON postings(external_id, source, country);
    `);

    console.log("  OK: UNIQUE postings_external_id_source_country_idx created\n");

    console.log("Verifying migrations...\n");

    const [{ exists: adzunaTableExists }] = await db
      .execute(sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_name = 'adzuna_usage'
        ) AS exists;
      `)
      .then((r) => r.rows as BoolRow[]);

    const [{ exists: countryColumnExists }] = await db
      .execute(sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'postings' AND column_name = 'country'
        ) AS exists;
      `)
      .then((r) => r.rows as BoolRow[]);

    const [{ is_unique: dedupeIndexUnique }] = await db
      .execute(sql`
        SELECT ix.indisunique AS is_unique
        FROM pg_class i
        JOIN pg_index ix ON i.oid = ix.indexrelid
        JOIN pg_class t ON t.oid = ix.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'postings'
          AND i.relname = 'postings_external_id_source_country_idx';
      `)
      .then((r) => r.rows as BoolRow[]);

    console.log("Verification Results:");
    console.log(`  - adzuna_usage table: ${adzunaTableExists ? "OK" : "MISSING"}`);
    console.log(`  - postings.country column: ${countryColumnExists ? "OK" : "MISSING"}`);
    console.log(`  - dedupe index unique: ${dedupeIndexUnique ? "YES" : "NO"}\n`);

    if (adzunaTableExists && countryColumnExists && dedupeIndexUnique) {
      console.log("========================================================");
      console.log("  All migrations applied successfully");
      console.log("========================================================\n");
      process.exit(0);
    }

    console.error("Migration verification failed.");
    process.exit(1);
  } catch (error: any) {
    console.error("\nMigration failed:", error?.message ?? error);
    console.error("\nStack trace:", error?.stack ?? "(none)");
    process.exit(1);
  }
}

main();
