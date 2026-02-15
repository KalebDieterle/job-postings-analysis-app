#!/usr/bin/env node
// scripts/import-from-adzuna.ts
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { adzunaClient } from '@/lib/adzuna';
import {
  AdzunaRateLimiter,
  transformAdzunaJob,
  findOrCreateCompany,
  batchInsertJobs,
  validateJobData,
} from '@/lib/adzuna-import-helpers';
import {
  getAllUsage,
  incrementAllPeriods,
  checkQuotaLimits,
} from '@/lib/adzuna-usage-tracker';
import type { AdzunaJob } from '@/lib/adzuna/types';

// Configuration from environment variables
const ADZUNA_ROLES = (process.env.ADZUNA_ROLES || 'software engineer,data engineer,devops engineer,frontend developer,backend developer,full stack developer')
  .split(',')
  .map(r => r.trim())
  .filter(Boolean);

const ADZUNA_LOCATIONS = (process.env.ADZUNA_LOCATIONS || 'us')
  .split(',')
  .map(l => l.trim())
  .filter(Boolean);

const ADZUNA_RESULTS_PER_PAGE = parseInt(process.env.ADZUNA_RESULTS_PER_PAGE || '50', 10);
const ADZUNA_MAX_RESULTS = parseInt(process.env.ADZUNA_MAX_RESULTS || '200', 10);
const ADZUNA_RATE_LIMIT_MS = parseInt(process.env.ADZUNA_RATE_LIMIT_MS || '2500', 10);
const ADZUNA_DAYS_BACK = parseInt(process.env.ADZUNA_DAYS_BACK || '2', 10);
const ADZUNA_DAILY_LIMIT = parseInt(process.env.ADZUNA_DAILY_LIMIT || '240', 10);

/**
 * SAFE_API_START_MINUTE: Prevents API contention during global quota resets
 * 
 * WHY: Adzuna API quotas reset at midnight UTC. If multiple CI jobs start at
 * minute 00, they all race for the same quota pool, potentially causing conflicts.
 * 
 * By waiting until minute 17, we avoid the rush and get cleaner quota tracking.
 */
const SAFE_API_START_MINUTE = 17;

/**
 * Wait until safe minute to avoid API contention
 * 
 * If current minute < SAFE_API_START_MINUTE, waits until that minute.
 * Prevents race conditions when quota resets at midnight.
 */
async function waitForSafeStartTime(): Promise<void> {
  const now = new Date();
  const currentMinute = now.getMinutes();
  
  if (currentMinute < SAFE_API_START_MINUTE) {
    const waitMs = (SAFE_API_START_MINUTE - currentMinute) * 60 * 1000;
    const waitMinutes = Math.ceil(waitMs / 60000);
    
    console.log(`⏰ Current time: ${now.toISOString()}`);
    console.log(`   Waiting ${waitMinutes} minute(s) until minute ${SAFE_API_START_MINUTE} to avoid API contention...\n`);
    
    await new Promise(resolve => setTimeout(resolve, waitMs));
    
    console.log(`✅ Safe start time reached. Beginning import...\n`);
  }
}

/**
 * Check if database has required constraints
 */
async function checkDatabaseConstraints(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'companies'
      AND constraint_type = 'PRIMARY KEY'
    `);

    return result.rows.length > 0;
  } catch (error) {
    console.error('⚠️  Warning: Could not check database constraints');
    return true; // Proceed anyway
  }
}

/**
 * Main import function
 */
async function importFromAdzuna() {
  console.log('🚀 ADZUNA JOB IMPORT SCRIPT\n');
  console.log('='.repeat(80));
  console.log('\n📋 Configuration:');
  console.log(`   Roles: ${ADZUNA_ROLES.join(', ')}`);
  console.log(`   Locations: ${ADZUNA_LOCATIONS.join(', ')}`);
  console.log(`   Results per page: ${ADZUNA_RESULTS_PER_PAGE}`);
  console.log(`   Max total results: ${ADZUNA_MAX_RESULTS}`);
  console.log(`   Rate limit delay: ${ADZUNA_RATE_LIMIT_MS}ms`);
  console.log(`   Daily API limit: ${ADZUNA_DAILY_LIMIT} requests`);
  console.log(`   Look back: ${ADZUNA_DAYS_BACK} days`);
  console.log('\n' + '='.repeat(80) + '\n');

  // Check API credentials
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
    console.error('❌ Missing Adzuna API credentials!');
    console.error('   Please set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.local');
    process.exit(1);
  }

  // Check database constraints
  console.log('🔍 Checking database constraints...');
  const hasConstraints = await checkDatabaseConstraints();
  if (!hasConstraints) {
    console.error('\n❌ WARNING: Database constraints not found!');
    console.error('   The companies table may not have proper constraints to prevent duplicates.');
    console.error('   This could lead to duplicate company records.\n');
    console.error('   Recommended actions:');
    console.error('   1. Check for existing duplicates: npm run cleanup:companies:dry-run');
    console.error('   2. Clean up duplicates: npm run cleanup:companies');
    console.error('   3. Add constraints: npm run db:add-company-constraints\n');
    console.error('   Then re-run this import.\n');
    process.exit(1);
  }
  console.log('✅ Database constraints verified\n');

  // Wait for safe start time (avoid API reset contention)
  await waitForSafeStartTime();

  // Load and check usage stats from database
  const usageStats = await getAllUsage();
  console.log('📊 Current API Usage (from database):');
  console.log(`   Daily: ${usageStats.daily}/250`);
  console.log(`   Weekly: ${usageStats.weekly}/1000`);
  console.log(`   Monthly: ${usageStats.monthly}/2500`);
  console.log('');

  const limitsCheck = await checkQuotaLimits({
    daily: 250,
    weekly: 1000,
    monthly: 2500,
  });
  
  if (!limitsCheck.allowed) {
    console.error(`❌ ${limitsCheck.exceeded} limit reached: ${limitsCheck.usage[limitsCheck.exceeded!]} requests`);
    console.error('   Please try again later when limits reset.');
    process.exit(1);
  }

  console.log('✅ Within API limits, proceeding with import...\n');
  console.log('='.repeat(80) + '\n');

  // Initialize rate limiter
  const rateLimiter = new AdzunaRateLimiter(ADZUNA_DAILY_LIMIT, ADZUNA_RATE_LIMIT_MS);

  // Statistics
  let totalJobsFetched = 0;
  let totalJobsInserted = 0;
  let totalJobsUpdated = 0;
  let totalJobsFailed = 0;
  let totalCompaniesProcessed = 0;
  const uniqueCompanies = new Set<string>();

  try {
    // Iterate through each role
    for (const role of ADZUNA_ROLES) {
      console.log(`\n🔍 Searching for: "${role}"\n`);

      let page = 1;
      let hasMoreResults = true;
      let roleJobsFetched = 0;

      while (hasMoreResults && roleJobsFetched < ADZUNA_MAX_RESULTS) {
        // Check if we've hit the daily limit
        if (rateLimiter.getRequestCount() >= ADZUNA_DAILY_LIMIT) {
          console.log(`\n⚠️  Reached daily API limit (${ADZUNA_DAILY_LIMIT} requests)`);
          hasMoreResults = false;
          break;
        }

        // Wait for rate limiter
        await rateLimiter.waitForNextRequest();

        console.log(`   📄 Fetching page ${page}...`);

        try {
          const response = await adzunaClient.search({
            what: role,
            results_per_page: ADZUNA_RESULTS_PER_PAGE,
            page: page,
            sort_by: 'date',
            max_days_old: ADZUNA_DAYS_BACK,
          });

          if (response.results.length === 0) {
            console.log(`   ℹ️  No more results for "${role}"`);
            hasMoreResults = false;
            break;
          }

          console.log(`   ✅ Retrieved ${response.results.length} jobs`);
          roleJobsFetched += response.results.length;
          totalJobsFetched += response.results.length;

          // Validate jobs
          const validJobs: AdzunaJob[] = [];
          let invalidCount = 0;

          for (const job of response.results) {
            const validation = validateJobData(job);
            if (validation.isValid) {
              validJobs.push(job);
            } else {
              invalidCount++;
              console.log(`   ⚠️  Skipping invalid job ${job.id}: ${validation.warnings.join(', ')}`);
            }
          }

          if (invalidCount > 0) {
            console.log(`   ⚠️  Skipped ${invalidCount} invalid jobs`);
          }

          // Process companies
          for (const job of validJobs) {
            try {
              const companyId = await findOrCreateCompany(
                job.company.display_name,
                job.location.display_name
              );
              uniqueCompanies.add(companyId);
            } catch (error: any) {
              console.error(`   ❌ Failed to process company ${job.company.display_name}:`, error.message);
            }
          }

          // Transform and insert jobs (pass country for deduplication)
          const transformedJobs = validJobs.map(job => transformAdzunaJob(job, 'US'));
          const insertResult = await batchInsertJobs(transformedJobs);

          totalJobsInserted += insertResult.inserted;
          totalJobsUpdated += insertResult.updated;
          totalJobsFailed += insertResult.failed;

          console.log(`   💾 Inserted: ${insertResult.inserted}, Updated: ${insertResult.updated}, Failed: ${insertResult.failed}`);

          // Check if we should continue
          if (roleJobsFetched >= ADZUNA_MAX_RESULTS) {
            console.log(`   ℹ️  Reached max results limit (${ADZUNA_MAX_RESULTS}) for "${role}"`);
            hasMoreResults = false;
          } else if (response.results.length < ADZUNA_RESULTS_PER_PAGE) {
            console.log(`   ℹ️  No more pages available for "${role}"`);
            hasMoreResults = false;
          } else {
            page++;
          }

        } catch (error: any) {
          console.error(`   ❌ Error fetching page ${page}:`, error.message);
          
          // Check if it's a rate limit error
          if (error.message.includes('429') || error.message.includes('rate limit')) {
            console.error('   ⚠️  Hit rate limit, stopping import');
            hasMoreResults = false;
            break;
          }

          // For other errors, continue to next page
          page++;
        }
      }

      console.log(`\n   ✅ Completed "${role}": ${roleJobsFetched} jobs fetched\n`);
    }

    console.log('='.repeat(80) + '\n');
    console.log('📊 IMPORT SUMMARY:\n');
    console.log(`   Total jobs fetched: ${totalJobsFetched}`);
    console.log(`   Jobs inserted: ${totalJobsInserted}`);
    console.log(`   Jobs updated: ${totalJobsUpdated}`);
    console.log(`   Jobs failed: ${totalJobsFailed}`);
    console.log(`   Unique companies: ${uniqueCompanies.size}`);
    console.log('');

    // Update usage stats in database
    const finalUsage = await incrementAllPeriods(rateLimiter.getRequestCount());
    console.log('📊 API Usage (After This Run - stored in database):');
    console.log(`   Daily: ${finalUsage.daily}/250`);
    console.log(`   Weekly: ${finalUsage.weekly}/1000`);
    console.log(`   Monthly: ${finalUsage.monthly}/2500`);
    console.log('');

    const remainingDaily = 250 - finalUsage.daily;
    const remainingWeekly = 1000 - finalUsage.weekly;
    const remainingMonthly = 2500 - finalUsage.monthly;

    console.log('📈 Remaining API Capacity:');
    console.log(`   Today: ${remainingDaily} requests`);
    console.log(`   This week: ${remainingWeekly} requests`);
    console.log(`   This month: ${remainingMonthly} requests`);
    console.log('');

    console.log('='.repeat(80) + '\n');
    console.log('✅ Import completed successfully!\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Fatal error during import:', error.message);
    console.error('\nStack trace:', error.stack);

    // Save usage stats to database even on error
    try {
      await incrementAllPeriods(rateLimiter.getRequestCount());
    } catch (usageError) {
      console.error('Failed to save usage stats:', usageError);
    }

    process.exit(1);
  }
}

// Run import
importFromAdzuna();
