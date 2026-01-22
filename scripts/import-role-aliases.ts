// scripts/import-role-aliases.ts

import { db } from '@/db';
import { roleAliases } from '@/db/schema';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

async function importRoleAliases() {
  console.log('🚀 Starting role aliases import...');
  
  const csvPath = path.join(process.cwd(), 'data', 'role_aliases.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  const { data, errors } = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(), // Remove any whitespace
  });

  if (errors.length > 0) {
    console.error('❌ CSV parsing errors:', errors);
    process.exit(1);
  }

  console.log(`📊 Found ${data.length} role aliases to import`);
  console.log(`📋 Sample row:`, data[0]);

  // Clear existing data (optional - remove if you want to keep existing data)
  // await db.delete(roleAliases);
  // console.log('🗑️  Cleared existing role aliases');

  // Batch insert in chunks of 1000 for better performance
  const chunkSize = 1000;
  let imported = 0;

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    
    try {
      await db.insert(roleAliases).values(
        chunk.map((row: any) => ({
          // ID is auto-generated, so we don't include it
          canonical_name: row.canonical_name?.trim() || '',
          alias: row.alias?.trim() || '',
          job_count: parseInt(row.job_count) || 0,
        }))
      );

      imported += chunk.length;
      console.log(`✅ Imported ${imported} / ${data.length} aliases`);
    } catch (error) {
      console.error(`❌ Error importing chunk ${i}-${i + chunkSize}:`, error);
      throw error;
    }
  }

  // Verify import
  const count = await db.select({ count: sql<number>`count(*)` }).from(roleAliases);
  console.log(`\n🎉 Import complete! Total aliases in database: ${count[0].count}`);

  // Show some sample canonical names
  const samples = await db
    .select({
      canonical_name: roleAliases.canonical_name,
      count: sql<number>`count(*)`,
    })
    .from(roleAliases)
    .groupBy(roleAliases.canonical_name)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  console.log('\n📊 Top 10 canonical roles by alias count:');
  samples.forEach((s) => {
    console.log(`   ${s.canonical_name}: ${s.count} aliases`);
  });
}

importRoleAliases()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });