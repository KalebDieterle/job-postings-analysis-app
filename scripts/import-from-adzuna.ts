#!/usr/bin/env node
// scripts/import-from-adzuna.ts
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { getAdzunaClient } from '@/lib/adzuna';
import {
  AdzunaRateLimiter,
  transformAdzunaJob,
  findOrCreateCompany,
  batchInsertJobs,
  validateJobData,
  extractAndInsertSkills,
  mapCategoryToIndustry,
} from '@/lib/adzuna-import-helpers';
import {
  getAllUsage,
  incrementAllPeriods,
  checkQuotaLimits,
} from '@/lib/adzuna-usage-tracker';
import type { AdzunaJob } from '@/lib/adzuna/types';

// Configuration from environment variables
const ADZUNA_ROLES = (process.env.ADZUNA_ROLES || [
  // Tech - Software Logic
  'software engineer', 'senior software engineer', 'principal software engineer', 'engineering manager',
  'frontend developer', 'backend developer', 'full stack developer', 'web developer', 'ui engineer',
  'ios developer', 'android developer', 'mobile developer', 'game developer',
  'embedded systems engineer', 'firmware engineer', 'blockchain developer',

  // Tech - Data & Infrastructure
  'data engineer', 'data scientist', 'machine learning engineer', 'ai engineer', 'data analyst',
  'devops engineer', 'site reliability engineer', 'cloud engineer', 'cloud architect',
  'systems administrator', 'network engineer', 'cybersecurity analyst', 'security engineer',
  'database administrator',

  // Tech - Product & Design
  'product manager', 'product owner', 'technical program manager', 'scrum master',
  'ux designer', 'product designer', 'graphic designer', 'technical writer',

  // Business & Finance
  'accountant', 'financial analyst', 'bookkeeper', 'auditor', 'controller',
  'business analyst', 'management consultant', 'project manager',
  'marketing manager', 'digital marketing specialist', 'seo specialist', 'content manager',
  'sales representative', 'account executive', 'sales manager', 'customer success manager',

  // Healthcare
  'registered nurse', 'medical assistant', 'pharmacy technician', 'nurse practitioner',
  'physical therapist', 'occupational therapist', 'healthcare administrator',

  // Trades & Construction
  'electrician', 'plumber', 'hvac technician', 'carpenter', 'construction manager',
  'welder', 'machinist', 'maintenance technician',

  // Other Professional
  'human resources manager', 'recruiter', 'talent acquisition specialist',
  'administrative assistant', 'office manager', 'executive assistant',
  'legal assistant', 'paralegal', 'attorney',
  'warehouse associate', 'driver', 'customer service representative'
].join(',')).split(',').map(r => r.trim()).filter(Boolean);

const ADZUNA_LOCATIONS = (process.env.ADZUNA_LOCATIONS || 'us')
  .split(',')
  .map(l => l.trim())
  .filter(Boolean);

const LOCATION_TO_ISO: Record<string, string> = {
  us: 'US', gb: 'GB', au: 'AU', ca: 'CA', nz: 'NZ',
  de: 'DE', fr: 'FR', nl: 'NL', sg: 'SG', in: 'IN',
};

const ADZUNA_RESULTS_PER_PAGE = parseInt(process.env.ADZUNA_RESULTS_PER_PAGE || '50', 10);
const ADZUNA_MAX_RESULTS = parseInt(process.env.ADZUNA_MAX_RESULTS || '500', 10);
const ADZUNA_RATE_LIMIT_MS = parseInt(process.env.ADZUNA_RATE_LIMIT_MS || '2500', 10);
const ADZUNA_DAYS_BACK = parseInt(process.env.ADZUNA_DAYS_BACK || '2', 10);
const ADZUNA_DAILY_LIMIT = parseInt(process.env.ADZUNA_DAILY_LIMIT || '240', 10);


/**
 * Check if database has required constraints
 */
async function checkDatabaseConstraints(): Promise<{ ok: boolean; issues: string[] }> {
  try {
    const [companyPkResult, postingsConflictIndexResult] = await Promise.all([
      db.execute(sql`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'companies'
        AND constraint_type = 'PRIMARY KEY'
      `),
      db.execute(sql`
        SELECT EXISTS (
          SELECT 1
          FROM pg_class i
          JOIN pg_index ix ON i.oid = ix.indexrelid
          JOIN pg_class t ON t.oid = ix.indrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          WHERE n.nspname = 'public'
            AND t.relname = 'postings'
            AND ix.indisunique
            AND i.relname = 'postings_external_id_source_country_idx'
        ) AS "hasConflictTarget";
      `),
    ]);

    const issues: string[] = [];

    if (companyPkResult.rows.length === 0) {
      issues.push('`companies` table is missing a PRIMARY KEY constraint.');
    }

    const hasConflictTarget = Boolean(
      (postingsConflictIndexResult.rows[0] as { hasConflictTarget?: boolean } | undefined)
        ?.hasConflictTarget
    );
    if (!hasConflictTarget) {
      issues.push(
        '`postings` is missing a UNIQUE index/constraint on `(external_id, source, country)` required by ON CONFLICT.'
      );
    }

    return { ok: issues.length === 0, issues };
  } catch (error: any) {
    console.error('⚠️  Could not verify database constraints:', error?.message ?? error);
    return {
      ok: false,
      issues: ['Constraint preflight check failed; refusing to run import to avoid wasting API quota.'],
    };
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
  const constraintCheck = await checkDatabaseConstraints();
  if (!constraintCheck.ok) {
    console.error('\n❌ Required database constraints are missing or invalid.');
    for (const issue of constraintCheck.issues) {
      console.error(`   • ${issue}`);
    }
    console.error('');
    console.error('   Recommended actions:');
    console.error('   1. Apply production DB migrations: npm run db:migrate:production');
    console.error('   2. Re-run this import after migration succeeds\n');
    console.error('   Then re-run this import.\n');
    process.exit(1);
  }
  console.log('✅ Database constraints verified\n');

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

  // --- Dynamic Quota Calculation ---
  const startDailyUsage = usageStats.daily;
  const remainingDaily = Math.max(0, ADZUNA_DAILY_LIMIT - startDailyUsage);
  // User requested 75% of remaining limit to be used in this session
  const sessionBudget = Math.floor(remainingDaily * 0.75);
  // Divide evenly among roles × locations (minimum 1 request if budget allows)
  const totalCombinations = Math.max(1, ADZUNA_ROLES.length * ADZUNA_LOCATIONS.length);
  const quotaPerRole = Math.max(1, Math.floor(sessionBudget / totalCombinations));

  console.log('⚖️  Dynamic Quota Allocation:');
  console.log(`   Roles to process: ${ADZUNA_ROLES.length}`);
  console.log(`   Locations to process: ${ADZUNA_LOCATIONS.length}`);
  console.log(`   Starting Daily Usage: ${startDailyUsage}`);
  console.log(`   Remaining Daily Limit: ${remainingDaily}`);
  console.log(`   Session Budget (75%): ${sessionBudget} requests`);
  console.log(`   Quota per Role: ${quotaPerRole} requests`);
  console.log(`   Est. Total Requests: ${Math.min(sessionBudget, ADZUNA_ROLES.length * quotaPerRole)}`);
  
  if (sessionBudget < 1) {
    console.log('\n⚠️  Session budget is overly constrained. Skipping import to preserve limits.');
    process.exit(0);
  }

  console.log('\n✅ Within API limits, proceeding with import...\n');
  console.log('\n📋 Configuration:');
  // console.log(`   Roles: ${ADZUNA_ROLES.join(', ')}`); // Too long to print now
  console.log(`   Roles Count: ${ADZUNA_ROLES.length}`);
  console.log(`   Locations: ${ADZUNA_LOCATIONS.join(', ')}`);
  console.log(`   Results per page: ${ADZUNA_RESULTS_PER_PAGE}`);
  console.log(`   Max total results: ${ADZUNA_MAX_RESULTS}`);
  console.log(`   Rate limit delay: ${ADZUNA_RATE_LIMIT_MS}ms`);
  console.log(`   Daily API limit: ${ADZUNA_DAILY_LIMIT} requests`);
  console.log(`   Look back: ${ADZUNA_DAYS_BACK} days`);
  console.log('\n' + '='.repeat(80) + '\n');

  // Initialize rate limiter
  const rateLimiter = new AdzunaRateLimiter(ADZUNA_DAILY_LIMIT, ADZUNA_RATE_LIMIT_MS);

  // Statistics
  let totalJobsFetched = 0;
  let totalJobsInserted = 0;
  let totalJobsUpdated = 0;
  let totalJobsFailed = 0;
  let totalSkillsInserted = 0;
  let totalIndustriesMapped = 0;
  let totalRequestsThisRun = 0;
  const uniqueCompanies = new Set<string>();

  try {
    // Iterate through each location, then each role
    for (const locationCode of ADZUNA_LOCATIONS) {
      const isoCode = LOCATION_TO_ISO[locationCode] ?? locationCode.toUpperCase();
      const locationClient = getAdzunaClient(locationCode);
      console.log(`\n🌍 Processing location: ${locationCode.toUpperCase()} (ISO: ${isoCode})\n`);

    for (const role of ADZUNA_ROLES) {
      console.log(`\n🔍 Searching for: "${role}" in ${locationCode.toUpperCase()}\n`);

      let page = 1;
      let hasMoreResults = true;
      let roleJobsFetched = 0;
      let roleRequests = 0;

      // Stop if role has fetched max results OR if role has used its allocated request quota
      while (hasMoreResults && roleJobsFetched < ADZUNA_MAX_RESULTS && roleRequests < quotaPerRole) {
        // Check if we've hit the daily limit (global safety check)
        if (rateLimiter.getRequestCount() >= ADZUNA_DAILY_LIMIT) {
          console.log(`\n⚠️  Reached daily API limit (${ADZUNA_DAILY_LIMIT} requests)`);
          hasMoreResults = false;
          break;
        }

        // Wait for rate limiter
        await rateLimiter.waitForNextRequest();

        console.log(`   📄 Fetching page ${page}... (Request ${roleRequests + 1}/${quotaPerRole} for this role)`);

        try {
          const response = await locationClient.search({
            what: role,
            results_per_page: ADZUNA_RESULTS_PER_PAGE,
            page: page,
            sort_by: 'date',
            max_days_old: ADZUNA_DAYS_BACK,
          });
          
          roleRequests++;
          totalRequestsThisRun++;

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

          // Process companies (pass lat/lng from API response)
          for (const job of validJobs) {
            try {
              const companyId = await findOrCreateCompany(
                job.company.display_name,
                job.location.display_name,
                job.latitude ?? null,
                job.longitude ?? null
              );
              uniqueCompanies.add(companyId);
            } catch (error: any) {
              console.error(`   ❌ Failed to process company ${job.company.display_name}:`, error.message);
            }
          }

          // Transform and insert jobs (pass country for deduplication)
          const transformedJobs = validJobs.map(job => transformAdzunaJob(job, isoCode));
          const insertResult = await batchInsertJobs(transformedJobs);

          totalJobsInserted += insertResult.inserted;
          totalJobsUpdated += insertResult.updated;
          totalJobsFailed += insertResult.failed;

          console.log(`   💾 Inserted: ${insertResult.inserted}, Updated: ${insertResult.updated}, Failed: ${insertResult.failed}`);

          // Extract and insert skills for all jobs in this batch
          const jobsForSkills = transformedJobs.map(j => ({
            job_id: j.job_id,
            title: j.title,
            description: j.description,
          }));
          const skillResult = await extractAndInsertSkills(jobsForSkills);
          totalSkillsInserted += skillResult.inserted;
          if (skillResult.inserted > 0) {
            console.log(`   🧠 Skills: ${skillResult.inserted} associations created`);
          }

          // Map categories to industries
          for (const job of validJobs) {
            if (job.category?.tag && job.category?.label) {
              const jobId = `adzuna_${job.id}`;
              await mapCategoryToIndustry(jobId, job.category.tag, job.category.label);
              totalIndustriesMapped++;
            }
          }

          // Check if we should continue
          if (roleJobsFetched >= ADZUNA_MAX_RESULTS) {
            console.log(`   ℹ️  Reached max results limit (${ADZUNA_MAX_RESULTS}) for "${role}"`);
            hasMoreResults = false;
          } else if (response.results.length < ADZUNA_RESULTS_PER_PAGE) {
            console.log(`   ℹ️  No more pages available for "${role}"`);
            hasMoreResults = false;
          } else if (roleRequests >= quotaPerRole) {
            console.log(`   ℹ️  Reached session quota (${quotaPerRole} requests) for "${role}"`);
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

      console.log(`\n   ✅ Completed "${role}" [${locationCode.toUpperCase()}]: ${roleJobsFetched} jobs fetched (${roleRequests} requests)\n`);
    } // end roles loop

    console.log(`\n✅ Completed location: ${locationCode.toUpperCase()}\n`);
    } // end locations loop

    console.log('='.repeat(80) + '\n');
    console.log('📊 IMPORT SUMMARY:\n');
    console.log(`   Total jobs fetched: ${totalJobsFetched}`);
    console.log(`   Jobs inserted: ${totalJobsInserted}`);
    console.log(`   Jobs updated: ${totalJobsUpdated}`);
    console.log(`   Jobs failed: ${totalJobsFailed}`);
    console.log(`   Unique companies: ${uniqueCompanies.size}`);
    console.log(`   Skills associations: ${totalSkillsInserted}`);
    console.log(`   Industries mapped: ${totalIndustriesMapped}`);
    console.log(`   Requests this run: ${totalRequestsThisRun}`);
    console.log('');

    // Update usage stats in database
    const finalUsage = await incrementAllPeriods(rateLimiter.getRequestCount());
    console.log('📊 API Usage (After This Run - stored in database):');
    console.log(`   Daily: ${finalUsage.daily}/250`);
    console.log(`   Weekly: ${finalUsage.weekly}/1000`);
    console.log(`   Monthly: ${finalUsage.monthly}/2500`);
    console.log('');

    const remainingDailyEnd = 250 - finalUsage.daily;
    const remainingWeeklyEnd = 1000 - finalUsage.weekly;
    const remainingMonthlyEnd = 2500 - finalUsage.monthly;

    console.log('📈 Remaining API Capacity:');
    console.log(`   Today: ${remainingDailyEnd} requests`);
    console.log(`   This week: ${remainingWeeklyEnd} requests`);
    console.log(`   This month: ${remainingMonthlyEnd} requests`);
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
