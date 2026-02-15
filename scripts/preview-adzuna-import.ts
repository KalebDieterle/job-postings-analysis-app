#!/usr/bin/env node
// scripts/preview-adzuna-import.ts
import 'dotenv/config';
import { adzunaClient } from '@/lib/adzuna';
import {
  transformAdzunaJob,
  validateJobData,
  generateCompanyId,
  normalizeCompanyName,
  parseLocation,
} from '@/lib/adzuna-import-helpers';

const SAMPLE_SIZE = 20;

async function previewImport() {
  console.log('🔍 ADZUNA IMPORT PREVIEW - NO DATABASE WRITES\n');
  console.log('='.repeat(80));
  console.log('\n📋 Configuration:');
  console.log(`   Sample size: ${SAMPLE_SIZE} jobs`);
  console.log(`   API ID: ${process.env.ADZUNA_APP_ID ? '✓ Set' : '✗ Missing'}`);
  console.log(`   API Key: ${process.env.ADZUNA_APP_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    // Fetch sample data from Adzuna
    console.log('🌐 Fetching sample data from Adzuna API...\n');
    
    const searchParams = {
      what: 'software engineer',
      results_per_page: SAMPLE_SIZE,
      sort_by: 'date' as const,
      max_days_old: 7,
    };

    const response = await adzunaClient.search(searchParams);
    
    console.log(`✅ Received ${response.results.length} jobs from API`);
    console.log(`📊 Total available: ${response.count.toLocaleString()} jobs matching criteria\n`);
    console.log('='.repeat(80) + '\n');

    // Validate all jobs
    console.log('🔎 VALIDATION REPORT:\n');
    let validCount = 0;
    let invalidCount = 0;
    const allWarnings: Array<{ jobId: string; warnings: string[] }> = [];

    for (const job of response.results) {
      const validation = validateJobData(job);
      if (validation.isValid) {
        validCount++;
      } else {
        invalidCount++;
        allWarnings.push({ jobId: job.id, warnings: validation.warnings });
      }
    }

    console.log(`   ✅ Valid jobs: ${validCount}`);
    console.log(`   ⚠️  Jobs with warnings: ${invalidCount}\n`);

    if (allWarnings.length > 0) {
      console.log('   Data Quality Issues:');
      allWarnings.slice(0, 5).forEach(({ jobId, warnings }) => {
        console.log(`   - Job ${jobId}:`);
        warnings.forEach(w => console.log(`     • ${w}`));
      });
      if (allWarnings.length > 5) {
        console.log(`   ... and ${allWarnings.length - 5} more\n`);
      }
    }
    console.log('='.repeat(80) + '\n');

    // Transform jobs
    console.log('🔄 TRANSFORMATION PREVIEW:\n');
    const transformedJobs = response.results.map(job => transformAdzunaJob(job));

    // Show field mapping for first job
    const firstJob = response.results[0];
    const firstTransformed = transformedJobs[0];

    console.log('   Adzuna Field → Database Field Mapping (Sample Job):\n');
    console.log(`   Adzuna ID: "${firstJob.id}"`);
    console.log(`   → external_id: "${firstTransformed.external_id}"`);
    console.log(`   → job_id: "${firstTransformed.job_id}"`);
    console.log(`   → source: "${firstTransformed.source}"\n`);
    
    console.log(`   Title: "${firstJob.title}"`);
    console.log(`   → title: "${firstTransformed.title}"\n`);
    
    console.log(`   Company: "${firstJob.company.display_name}"`);
    console.log(`   → company_name: "${firstTransformed.company_name}"`);
    console.log(`   → company_id: "${firstTransformed.company_id}"\n`);
    
    console.log(`   Location: "${firstJob.location.display_name}"`);
    console.log(`   → location: "${firstTransformed.location}"`);
    console.log(`   → remote_allowed: ${firstTransformed.remote_allowed}\n`);
    
    console.log(`   Salary: $${firstJob.salary_min?.toLocaleString() || 'N/A'} - $${firstJob.salary_max?.toLocaleString() || 'N/A'}`);
    console.log(`   → min_salary: ${firstTransformed.min_salary}`);
    console.log(`   → max_salary: ${firstTransformed.max_salary}`);
    console.log(`   → yearly_min_salary: ${firstTransformed.yearly_min_salary}`);
    console.log(`   → yearly_max_salary: ${firstTransformed.yearly_max_salary}\n`);
    
    console.log(`   Created: "${firstJob.created}"`);
    console.log(`   → listed_time: "${firstTransformed.listed_time.toISOString()}"`);
    console.log(`   → import_timestamp: "${firstTransformed.import_timestamp.toISOString()}"\n`);

    console.log('='.repeat(80) + '\n');

    // Show summary statistics
    console.log('📊 SUMMARY STATISTICS:\n');
    
    const jobsWithSalary = transformedJobs.filter(j => j.min_salary && j.max_salary);
    const avgMinSalary = jobsWithSalary.length > 0
      ? jobsWithSalary.reduce((sum, j) => sum + (j.min_salary || 0), 0) / jobsWithSalary.length
      : 0;
    const avgMaxSalary = jobsWithSalary.length > 0
      ? jobsWithSalary.reduce((sum, j) => sum + (j.max_salary || 0), 0) / jobsWithSalary.length
      : 0;

    console.log(`   Total jobs to import: ${transformedJobs.length}`);
    console.log(`   Jobs with salary data: ${jobsWithSalary.length} (${((jobsWithSalary.length / transformedJobs.length) * 100).toFixed(1)}%)`);
    console.log(`   Average salary range: $${Math.round(avgMinSalary).toLocaleString()} - $${Math.round(avgMaxSalary).toLocaleString()}`);
    
    const remoteJobs = transformedJobs.filter(j => j.remote_allowed);
    console.log(`   Remote-friendly jobs: ${remoteJobs.length} (${((remoteJobs.length / transformedJobs.length) * 100).toFixed(1)}%)\n`);

    console.log('='.repeat(80) + '\n');

    // Show unique companies
    console.log('🏢 COMPANIES TO BE CREATED/MATCHED:\n');
    
    const uniqueCompanies = new Map<string, { name: string; location: string; count: number }>();
    transformedJobs.forEach(job => {
      const key = job.company_id;
      if (uniqueCompanies.has(key)) {
        uniqueCompanies.get(key)!.count++;
      } else {
        uniqueCompanies.set(key, {
          name: job.company_name,
          location: job.location,
          count: 1,
        });
      }
    });

    console.log(`   Unique companies: ${uniqueCompanies.size}\n`);
    console.log('   Top 10 Companies:\n');
    
    const sortedCompanies = Array.from(uniqueCompanies.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    sortedCompanies.forEach((company, idx) => {
      const companyId = generateCompanyId(company.name);
      const normalized = normalizeCompanyName(company.name);
      const locationParsed = parseLocation(company.location);
      
      console.log(`   ${idx + 1}. ${company.name}`);
      console.log(`      • Job count: ${company.count}`);
      console.log(`      • Company ID: ${companyId}`);
      console.log(`      • Normalized name: "${normalized}"`);
      console.log(`      • Location: ${locationParsed.city || 'Unknown'}, ${locationParsed.state || 'Unknown'}`);
      console.log('');
    });

    console.log('='.repeat(80) + '\n');

    // Show sample job records
    console.log('📄 SAMPLE JOB RECORDS (First 5):\n');
    
    transformedJobs.slice(0, 5).forEach((job, idx) => {
      console.log(`   ${idx + 1}. ${job.title}`);
      console.log(`      • Job ID: ${job.job_id}`);
      console.log(`      • External ID: ${job.external_id}`);
      console.log(`      • Source: ${job.source}`);
      console.log(`      • Company: ${job.company_name} (${job.company_id})`);
      console.log(`      • Location: ${job.location}`);
      console.log(`      • Salary: ${job.min_salary ? `$${job.min_salary.toLocaleString()} - $${job.max_salary?.toLocaleString()}` : 'Not specified'}`);
      console.log(`      • Work Type: ${job.work_type || 'Not specified'}`);
      console.log(`      • Remote: ${job.remote_allowed ? 'Yes' : 'No'}`);
      console.log(`      • Posted: ${job.listed_time.toLocaleDateString()}`);
      console.log(`      • URL: ${job.job_posting_url.substring(0, 80)}...`);
      console.log('');
    });

    console.log('='.repeat(80) + '\n');

    // Show what would happen
    console.log('💾 IMPORT SIMULATION:\n');
    console.log(`   ✅ Would insert: ${transformedJobs.length} new job postings`);
    console.log(`   ✅ Would create/match: ${uniqueCompanies.size} companies`);
    console.log(`   ⚠️  Would skip: 0 duplicate jobs (checking requires database access)`);
    console.log(`\n   ℹ️  No database writes performed - this is a preview only!\n`);

    console.log('='.repeat(80) + '\n');

    console.log('✅ Preview complete! To run the actual import:\n');
    console.log('   npm run import:adzuna\n');

  } catch (error: any) {
    console.error('\n❌ Error during preview:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run preview
previewImport();
