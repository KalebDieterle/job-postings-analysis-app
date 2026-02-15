#!/usr/bin/env node
// scripts/cleanup-duplicate-companies.ts
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { db } from '@/db';
import { companies, postings } from '@/db/schema';
import { sql, eq, inArray } from 'drizzle-orm';

const DRY_RUN = process.env.CLEANUP_DRY_RUN === 'true';

interface DuplicateGroup {
  company_id: string;
  count: number;
  names: string[];
}

interface CompanyRecord {
  company_id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
}

interface CleanupReport {
  timestamp: string;
  dry_run: boolean;
  duplicates_found: number;
  total_duplicate_records: number;
  records_to_delete: number;
  records_kept: number;
  postings_affected: number;
  duplicate_groups: Array<{
    company_id: string;
    name: string;
    duplicate_count: number;
    kept_record: string;
    deleted_records: string[];
  }>;
}

async function findDuplicateCompanies(): Promise<DuplicateGroup[]> {
  console.log('🔍 Scanning for duplicate company records...\n');

  // Find company_ids that appear more than once
  const duplicates = await db.execute(sql`
    SELECT 
      company_id,
      COUNT(*) as count,
      ARRAY_AGG(DISTINCT name) as names
    FROM ${companies}
    GROUP BY company_id
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `);

  const duplicateGroups = duplicates.rows.map((row: any) => ({
    company_id: row.company_id,
    count: parseInt(row.count),
    names: row.names,
  }));

  console.log(`   Found ${duplicateGroups.length} company IDs with duplicates\n`);

  if (duplicateGroups.length > 0) {
    console.log('   Top 10 duplicates:');
    duplicateGroups.slice(0, 10).forEach((dup, idx) => {
      console.log(`   ${idx + 1}. ${dup.names[0]} (${dup.company_id}): ${dup.count} records`);
    });
    console.log('');
  }

  return duplicateGroups;
}

async function getCompanyRecords(companyId: string): Promise<CompanyRecord[]> {
  const records = await db
    .select({
      company_id: companies.company_id,
      name: companies.name,
      city: companies.city,
      state: companies.state,
      country: companies.country,
    })
    .from(companies)
    .where(eq(companies.company_id, companyId));

  return records;
}

async function getPostingCountForCompany(companyId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM ${postings}
    WHERE company_id = ${companyId}
  `);

  return parseInt((result.rows[0] as unknown as { count: string }).count);
}

async function cleanupDuplicates(): Promise<CleanupReport> {
  const report: CleanupReport = {
    timestamp: new Date().toISOString(),
    dry_run: DRY_RUN,
    duplicates_found: 0,
    total_duplicate_records: 0,
    records_to_delete: 0,
    records_kept: 0,
    postings_affected: 0,
    duplicate_groups: [],
  };

  try {
    const duplicateGroups = await findDuplicateCompanies();

    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicate companies found! Database is clean.\n');
      return report;
    }

    report.duplicates_found = duplicateGroups.length;
    report.total_duplicate_records = duplicateGroups.reduce((sum, g) => sum + g.count, 0);
    report.records_to_delete = duplicateGroups.reduce((sum, g) => sum + (g.count - 1), 0);
    report.records_kept = duplicateGroups.length;

    console.log('📊 Cleanup Summary:');
    console.log(`   Duplicate company IDs: ${report.duplicates_found}`);
    console.log(`   Total duplicate records: ${report.total_duplicate_records}`);
    console.log(`   Records to keep: ${report.records_kept}`);
    console.log(`   Records to delete: ${report.records_to_delete}\n`);

    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    } else {
      console.log('⚠️  LIVE MODE - Changes will be written to database\n');
    }

    console.log('='.repeat(80) + '\n');

    // Process each duplicate group
    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      console.log(`Processing ${i + 1}/${duplicateGroups.length}: ${group.names[0]} (${group.company_id})`);

      const records = await getCompanyRecords(group.company_id);
      
      // Keep the first record (arbitrary but consistent)
      const keepRecord = records[0];
      const deleteRecords = records.slice(1);

      console.log(`   Found ${records.length} duplicate records`);
      console.log(`   Keeping: "${keepRecord.name}" (${keepRecord.city || 'Unknown'}, ${keepRecord.state || 'Unknown'})`);
      
      deleteRecords.forEach((rec, idx) => {
        console.log(`   Deleting ${idx + 1}: "${rec.name}" (${rec.city || 'Unknown'}, ${rec.state || 'Unknown'})`);
      });

      // Check how many postings reference this company
      const postingCount = await getPostingCountForCompany(group.company_id);
      console.log(`   Postings referencing this company: ${postingCount}`);
      report.postings_affected += postingCount;

      if (!DRY_RUN) {
        // Delete duplicate records
        // Since they all have the same company_id and company_id is the PK,
        // we need to handle this carefully. The issue is likely that records
        // are being inserted despite the primary key constraint.
        
        // We'll use a different approach: delete all records for this company_id
        // then re-insert the one we want to keep
        
        try {
          // First, ensure postings are not orphaned by checking foreign key constraints
          // For now, postings.company_id is just text, no foreign key constraint
          
          // Delete ALL records with this company_id
          await db.delete(companies).where(eq(companies.company_id, group.company_id));
          
          // Re-insert the record we want to keep
          await db.insert(companies).values({
            company_id: keepRecord.company_id,
            name: keepRecord.name,
            city: keepRecord.city,
            state: keepRecord.state,
            country: keepRecord.country,
            description: null,
            company_size: null,
            zip_code: null,
            address: null,
            url: null,
            lat: null,
            lng: null,
          });

          console.log(`   ✅ Cleaned up ${deleteRecords.length} duplicate(s)\n`);
        } catch (error: any) {
          console.error(`   ❌ Error cleaning up duplicates: ${error.message}\n`);
        }
      } else {
        console.log(`   [DRY RUN] Would delete ${deleteRecords.length} duplicate(s)\n`);
      }

      report.duplicate_groups.push({
        company_id: group.company_id,
        name: group.names[0],
        duplicate_count: group.count,
        kept_record: keepRecord.name,
        deleted_records: deleteRecords.map(r => r.name),
      });
    }

    console.log('='.repeat(80) + '\n');
    console.log('📊 Final Statistics:\n');
    console.log(`   Duplicate groups processed: ${report.duplicates_found}`);
    console.log(`   Records kept: ${report.records_kept}`);
    console.log(`   Records deleted: ${DRY_RUN ? 0 : report.records_to_delete}`);
    console.log(`   Postings affected: ${report.postings_affected}\n`);

    // Save report
    const reportPath = '.company-cleanup-report.json';
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);

    if (DRY_RUN) {
      console.log('✅ Dry run complete! Review the report, then run without CLEANUP_DRY_RUN to apply changes.\n');
      console.log('   To apply changes: npm run cleanup:companies\n');
    } else {
      console.log('✅ Cleanup complete!\n');
      console.log('   Next step: Add database constraints to prevent future duplicates');
      console.log('   Run: npm run db:add-company-constraints\n');
    }

  } catch (error: any) {
    console.error('❌ Fatal error during cleanup:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  return report;
}

// Main execution
console.log('🧹 COMPANY DUPLICATE CLEANUP SCRIPT\n');
console.log('='.repeat(80) + '\n');

cleanupDuplicates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
