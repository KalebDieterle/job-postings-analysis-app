#!/usr/bin/env node
// scripts/apply-adzuna-migration.ts
import 'dotenv/config';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function applyAdzunaMigration() {
  console.log('🔄 Applying Adzuna migration fields...\n');

  try {
    // Check if columns already exist
    const checkQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'postings' 
      AND column_name IN ('external_id', 'source', 'import_timestamp')
    `;
    
    const existingColumns = await db.execute(checkQuery);
    
    if (existingColumns.rows && existingColumns.rows.length > 0) {
      console.log('✅ Adzuna fields already exist in the database!');
      console.log(`   Found ${existingColumns.rows.length} columns already migrated\n`);
      
      // Check for the index
      const indexCheck = sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'postings' 
        AND indexname = 'postings_external_id_source_idx'
      `;
      
      const existingIndex = await db.execute(indexCheck);
      
      if (existingIndex.rows && existingIndex.rows.length > 0) {
        console.log('✅ Index on (external_id, source) already exists\n');
      } else {
        console.log('📝 Creating index on (external_id, source)...');
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS postings_external_id_source_idx 
          ON postings (external_id, source)
        `);
        console.log('✅ Index created successfully\n');
      }
      
      // Check company index
      const companyIndexCheck = sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'companies' 
        AND indexname = 'companies_name_lower_idx'
      `;
      
      const existingCompanyIndex = await db.execute(companyIndexCheck);
      
      if (existingCompanyIndex.rows && existingCompanyIndex.rows.length > 0) {
        console.log('✅ Company name index already exists\n');
      } else {
        console.log('📝 Creating index on LOWER(companies.name)...');
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS companies_name_lower_idx 
          ON companies (LOWER(name))
        `);
        console.log('✅ Company name index created successfully\n');
      }
      
      console.log('✅ Migration check complete - database is ready!\n');
      process.exit(0);
    }

    // Apply the new columns
    console.log('📝 Adding external_id column...');
    await db.execute(sql`
      ALTER TABLE postings 
      ADD COLUMN IF NOT EXISTS external_id text
    `);
    console.log('✅ external_id column added\n');

    console.log('📝 Adding source column with default...');
    await db.execute(sql`
      ALTER TABLE postings 
      ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
    `);
    console.log('✅ source column added\n');

    console.log('📝 Adding import_timestamp column...');
    await db.execute(sql`
      ALTER TABLE postings 
      ADD COLUMN IF NOT EXISTS import_timestamp timestamp DEFAULT now()
    `);
    console.log('✅ import_timestamp column added\n');

    console.log('📝 Creating index on (external_id, source)...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS postings_external_id_source_idx 
      ON postings (external_id, source)
    `);
    console.log('✅ Index created\n');

    console.log('📝 Creating index on LOWER(companies.name)...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS companies_name_lower_idx 
      ON companies (LOWER(name))
    `);
    console.log('✅ Company name index created\n');

    console.log('✅ All migrations applied successfully!\n');
    console.log('You can now run: npm run preview:adzuna\n');
    
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Error applying migration:', error.message);
    console.error('\nThis might be okay if the fields already exist.');
    console.error('Try running: npm run preview:adzuna\n');
    process.exit(1);
  }
}

applyAdzunaMigration();
