#!/usr/bin/env node
// scripts/add-company-constraints.ts
import 'dotenv/config';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function checkConstraintExists(constraintName: string, tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = ${tableName}
    AND constraint_name = ${constraintName}
  `);

  return result.rows.length > 0;
}

async function checkIndexExists(indexName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT indexname
    FROM pg_indexes
    WHERE indexname = ${indexName}
  `);

  return result.rows.length > 0;
}

async function checkPrimaryKeyConstraint(): Promise<{ exists: boolean; constraintName: string | null }> {
  const result = await db.execute(sql`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'companies'
    AND constraint_type = 'PRIMARY KEY'
  `);

  if (result.rows.length > 0) {
    return { exists: true, constraintName: (result.rows[0] as unknown as { constraint_name: string }).constraint_name };
  }
  return { exists: false, constraintName: null };
}

async function countDuplicateCompanyIds(): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM (
      SELECT company_id
      FROM companies
      GROUP BY company_id
      HAVING COUNT(*) > 1
    ) duplicates
  `);

  return parseInt((result.rows[0] as unknown as { count: string }).count);
}

async function addCompanyConstraints() {
  console.log('🔧 DATABASE CONSTRAINTS SETUP\n');
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Check for existing duplicates
    console.log('📊 Step 1: Checking for existing duplicate company_ids...\n');
    const duplicateCount = await countDuplicateCompanyIds();

    if (duplicateCount > 0) {
      console.error('❌ ERROR: Found duplicate company_ids in database!\n');
      console.error(`   ${duplicateCount} company IDs have multiple records.\n`);
      console.error('   You must clean up duplicates before adding constraints.\n');
      console.error('   Run: npm run cleanup:companies:dry-run  (to preview)');
      console.error('   Then: npm run cleanup:companies  (to apply)\n');
      process.exit(1);
    }

    console.log('✅ No duplicate company_ids found\n');
    console.log('='.repeat(80) + '\n');

    // Step 2: Check and add PRIMARY KEY constraint
    console.log('📊 Step 2: Checking PRIMARY KEY constraint on companies.company_id...\n');
    const pkCheck = await checkPrimaryKeyConstraint();

    if (pkCheck.exists) {
      console.log(`✅ PRIMARY KEY constraint already exists: ${pkCheck.constraintName}\n`);
    } else {
      console.log('⚠️  No PRIMARY KEY constraint found. Adding...\n');
      
      try {
        await db.execute(sql`
          ALTER TABLE companies
          ADD CONSTRAINT companies_pkey PRIMARY KEY (company_id)
        `);
        console.log('✅ PRIMARY KEY constraint added successfully\n');
      } catch (error: any) {
        // Check if error is because constraint already exists
        if (error.message.includes('already exists') || error.code === '42P16') {
          console.log('ℹ️  PRIMARY KEY constraint already exists (detected via error)\n');
        } else {
          throw error;
        }
      }
    }

    console.log('='.repeat(80) + '\n');

    // Step 3: Check and add index on LOWER(name)
    console.log('📊 Step 3: Checking index on LOWER(companies.name)...\n');
    const nameLowerIndexExists = await checkIndexExists('companies_name_lower_idx');

    if (nameLowerIndexExists) {
      console.log('✅ Index companies_name_lower_idx already exists\n');
    } else {
      console.log('⚠️  Index not found. Creating...\n');
      
      try {
        await db.execute(sql`
          CREATE INDEX companies_name_lower_idx ON companies (LOWER(name))
        `);
        console.log('✅ Index companies_name_lower_idx created successfully\n');
      } catch (error: any) {
        if (error.message.includes('already exists') || error.code === '42P07') {
          console.log('ℹ️  Index already exists (detected via error)\n');
        } else {
          throw error;
        }
      }
    }

    console.log('='.repeat(80) + '\n');

    // Step 4: Check and add index on (lat, lng)
    console.log('📊 Step 4: Checking index on companies (lat, lng)...\n');
    const latLngIndexExists = await checkIndexExists('companies_lat_lng_idx');

    if (latLngIndexExists) {
      console.log('✅ Index companies_lat_lng_idx already exists\n');
    } else {
      console.log('⚠️  Index not found. Creating...\n');
      
      try {
        await db.execute(sql`
          CREATE INDEX companies_lat_lng_idx ON companies (lat, lng)
        `);
        console.log('✅ Index companies_lat_lng_idx created successfully\n');
      } catch (error: any) {
        if (error.message.includes('already exists') || error.code === '42P07') {
          console.log('ℹ️  Index already exists (detected via error)\n');
        } else {
          throw error;
        }
      }
    }

    console.log('='.repeat(80) + '\n');

    // Step 5: Check and add index on city
    console.log('📊 Step 5: Checking index on companies.city...\n');
    const cityIndexExists = await checkIndexExists('companies_city_idx');

    if (cityIndexExists) {
      console.log('✅ Index companies_city_idx already exists\n');
    } else {
      console.log('⚠️  Index not found. Creating...\n');
      
      try {
        await db.execute(sql`
          CREATE INDEX companies_city_idx ON companies (city)
        `);
        console.log('✅ Index companies_city_idx created successfully\n');
      } catch (error: any) {
        if (error.message.includes('already exists') || error.code === '42P07') {
          console.log('ℹ️  Index already exists (detected via error)\n');
        } else {
          throw error;
        }
      }
    }

    console.log('='.repeat(80) + '\n');
    console.log('✅ ALL CONSTRAINTS AND INDEXES VERIFIED/ADDED\n');
    console.log('📊 Summary:\n');
    console.log('   ✅ PRIMARY KEY on company_id');
    console.log('   ✅ Index on LOWER(name) for case-insensitive lookups');
    console.log('   ✅ Index on (lat, lng) for geospatial queries');
    console.log('   ✅ Index on city for location filtering\n');
    console.log('🎉 Database is now protected against duplicate companies!\n');
    console.log('   You can now safely run: npm run import:adzuna\n');

    process.exit(0);

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Main execution
addCompanyConstraints();
