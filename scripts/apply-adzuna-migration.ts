#!/usr/bin/env node
// scripts/apply-adzuna-migration.ts
import 'dotenv/config';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

type BoolRow = { exists?: boolean; is_unique?: boolean };

async function applyAdzunaMigration() {
  console.log('Applying Adzuna migration fields...\n');

  try {
    await db.execute(sql`
      ALTER TABLE postings ADD COLUMN IF NOT EXISTS external_id text;
    `);
    await db.execute(sql`
      ALTER TABLE postings ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
    `);
    await db.execute(sql`
      ALTER TABLE postings ADD COLUMN IF NOT EXISTS import_timestamp timestamp DEFAULT now();
    `);
    await db.execute(sql`
      ALTER TABLE postings ADD COLUMN IF NOT EXISTS country text;
    `);

    await db.execute(sql`
      UPDATE postings
      SET country = 'US'
      WHERE country IS NULL;
    `);

    await db.execute(sql`DROP INDEX IF EXISTS postings_external_id_source_idx;`);

    const [{ exists: dedupeIndexExists }] = await db
      .execute(sql`
        SELECT EXISTS (
          SELECT 1
          FROM pg_class i
          JOIN pg_index ix ON i.oid = ix.indexrelid
          JOIN pg_class t ON t.oid = ix.indrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          WHERE n.nspname = 'public'
            AND t.relname = 'postings'
            AND i.relname = 'postings_external_id_source_country_idx'
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

    if (dedupeIndexExists && !dedupeIndexUnique) {
      await db.execute(sql`
        DROP INDEX IF EXISTS postings_external_id_source_country_idx;
      `);
    }

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS postings_external_id_source_country_idx
      ON postings (external_id, source, country);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS companies_name_lower_idx
      ON companies (LOWER(name));
    `);

    console.log('All Adzuna migration checks complete.\n');
    console.log('You can now run: npm run preview:adzuna\n');
    process.exit(0);
  } catch (error: any) {
    console.error('Error applying migration:', error?.message ?? error);
    console.error('\nStack trace:', error?.stack ?? '(none)');
    process.exit(1);
  }
}

applyAdzunaMigration();
