// lib/adzuna-import-helpers.ts
import { createHash } from 'crypto';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/db';
import { postings, companies } from '@/db/schema';
import type { AdzunaJob } from './adzuna/types';

/**
 * Rate limiter class to respect Adzuna API limits:
 * - 25 requests per minute
 * - 250 requests per day
 * - 1,000 requests per week
 * - 2,500 requests per month
 */
export class AdzunaRateLimiter {
  private requestCount = 0;
  private dailyLimit: number;
  private delayMs: number;
  private lastRequestTime = 0;

  constructor(
    dailyLimit = 240, // Leave 10 request buffer under 250/day limit
    delayMs = 2500    // 2.5 seconds between requests (24 req/min, safely under 25/min)
  ) {
    this.dailyLimit = dailyLimit;
    this.delayMs = delayMs;
  }

  async waitForNextRequest(): Promise<void> {
    if (this.requestCount >= this.dailyLimit) {
      throw new Error(
        `Daily API limit reached (${this.requestCount}/${this.dailyLimit} requests). Please try again tomorrow.`
      );
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.delayMs) {
      const waitTime = this.delayMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  getRemainingRequests(): number {
    return this.dailyLimit - this.requestCount;
  }

  getUsageStats(): { used: number; limit: number; remaining: number } {
    return {
      used: this.requestCount,
      limit: this.dailyLimit,
      remaining: this.getRemainingRequests(),
    };
  }
}

/**
 * Normalize company name for matching and ID generation
 * Removes common suffixes, extra whitespace, and special characters
 * Handles generic names like "Anonymous" and "Confidential"
 */
export function normalizeCompanyName(companyName: string, locationForGeneric?: string): string {
  if (!companyName || companyName.trim() === '') {
    return 'unknown';
  }

  let normalized = companyName
    .toLowerCase()
    .trim()
    // Remove common business suffixes
    .replace(/\s+(inc\.?|llc\.?|corp\.?|corporation\.?|ltd\.?|limited\.?|co\.?|company)$/i, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters but keep spaces and hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();

  // Handle generic/anonymous company names
  const genericNames = ['anonymous', 'confidential', 'confidential company', 'undisclosed'];
  if (genericNames.includes(normalized)) {
    // Make generic names unique by appending location
    if (locationForGeneric) {
      const locationNormalized = locationForGeneric.toLowerCase().replace(/[^a-z0-9]/g, '');
      normalized = `${normalized}-${locationNormalized}`;
    }
  }

  return normalized || 'unknown';
}

/**
 * Generate a deterministic company ID from company name + location
 * Uses SHA-256 hash of: normalized_name + city + state
 * 
 * WHY: Prevents company identity collisions when multiple companies share the same name
 * but operate in different locations (e.g. "ABC Company" in CA vs TX)
 * 
 * @param companyName - Raw company name from job posting
 * @param city - City name (optional, normalized to lowercase)
 * @param state - State abbreviation (optional, normalized to lowercase)
 * @returns 16-character hex hash
 */
export function generateCompanyId(
  companyName: string,
  city?: string | null,
  state?: string | null
): string {
  // Get normalized company name (may include location for generic names)
  const normalized = normalizeCompanyName(companyName);
  
  // Normalize location components (lowercase, trim)
  const cityNorm = (city || '').toLowerCase().trim();
  const stateNorm = (state || '').toLowerCase().trim();
  
  // Create composite key: name|city|state
  // Even if city/state are empty, we include the separator for consistency
  const composite = `${normalized}|${cityNorm}|${stateNorm}`;
  
  return createHash('sha256').update(composite).digest('hex').substring(0, 16);
}

/**
 * Parse location string to extract city and state
 * Examples: "San Francisco, CA" -> { city: "San Francisco", state: "CA" }
 */
export function parseLocation(locationDisplay: string): {
  city: string | null;
  state: string | null;
  country: string;
} {
  const parts = locationDisplay.split(',').map(p => p.trim());
  
  if (parts.length >= 2) {
    const state = parts[parts.length - 1];
    const city = parts[parts.length - 2];
    return { city, state, country: 'United States' };
  }
  
  return { city: parts[0] || null, state: null, country: 'United States' };
}

/**
 * Transform Adzuna job to our database schema
 * 
 * UPDATED: Now includes country field for global job deduplication
 * Company ID now uses parsed city+state instead of full location string
 */
export function transformAdzunaJob(job: AdzunaJob, country: string = 'US'): {
  job_id: string;
  external_id: string;
  source: string;
  country: string;
  company_name: string;
  company_id: string;
  title: string;
  description: string | null;
  location: string;
  min_salary: number | null;
  max_salary: number | null;
  yearly_min_salary: number | null;
  yearly_max_salary: number | null;
  med_salary: number | null;
  yearly_med_salary: number | null;
  pay_period: string;
  currency: string;
  compensation_type: string;
  job_posting_url: string;
  application_url: string;
  listed_time: Date;
  original_listed_time: Date;
  work_type: string | null;
  formatted_work_type: string | null;
  remote_allowed: boolean;
  sponsored: boolean;
  import_timestamp: Date;
} {
  const companyName = job.company.display_name;
  const locationDisplay = job.location.display_name;
  
  // Parse location to extract city and state
  const location = parseLocation(locationDisplay);
  
  // Generate company ID using parsed city+state (not full location string)
  const companyId = generateCompanyId(companyName, location.city, location.state);
  
  // Adzuna salaries are typically annual, but we'll store them as-is
  const minSalary = job.salary_min ?? null;
  const maxSalary = job.salary_max ?? null;
  const medSalary = minSalary && maxSalary ? Math.round((minSalary + maxSalary) / 2) : null;
  
  // Generate a unique job_id from external_id and source
  const jobId = `adzuna_${job.id}`;
  
  return {
    job_id: jobId,
    external_id: job.id,
    source: 'adzuna',
    country, // Required for global deduplication
    company_name: companyName,
    company_id: companyId,
    title: job.title,
    description: job.description || null,
    location: job.location.display_name,
    min_salary: minSalary,
    max_salary: maxSalary,
    yearly_min_salary: minSalary, // Assuming annual
    yearly_max_salary: maxSalary,
    med_salary: medSalary,
    yearly_med_salary: medSalary,
    pay_period: 'YEARLY',
    currency: 'USD',
    compensation_type: 'salary',
    job_posting_url: job.redirect_url,
    application_url: job.redirect_url,
    listed_time: new Date(job.created),
    original_listed_time: new Date(job.created),
    work_type: job.contract_type ?? null,
    formatted_work_type: job.contract_type ?? null,
    remote_allowed: job.location.display_name.toLowerCase().includes('remote'),
    sponsored: false,
    import_timestamp: new Date(),
  };
}

/**
 * Find existing company by company_id or create a new one
 * Returns the company_id
 * 
 * CRITICAL: Company ID now includes location (city+state) to prevent identity collisions
 * Same company name in different locations = different company_id
 */
export async function findOrCreateCompany(
  companyName: string,
  locationDisplay: string
): Promise<string> {
  // Validate input
  if (!companyName || companyName.trim() === '') {
    console.warn('⚠️  Empty company name provided, using "Unknown Company"');
    companyName = 'Unknown Company';
  }

  // Parse location to extract city and state
  const location = parseLocation(locationDisplay);
  
  // Generate deterministic company ID (now includes city+state for uniqueness)
  const companyId = generateCompanyId(companyName, location.city, location.state);
  const normalizedName = normalizeCompanyName(companyName, locationDisplay);
  
  // STEP 1: Check if company exists by company_id (PRIMARY KEY lookup - fastest)
  const existingById = await db
    .select({ 
      company_id: companies.company_id,
      name: companies.name 
    })
    .from(companies)
    .where(eq(companies.company_id, companyId))
    .limit(1);

  if (existingById.length > 0) {
    // Company found by ID
    return existingById[0].company_id;
  }

  // STEP 2: Company doesn't exist - create it
  try {
    await db.insert(companies).values({
      company_id: companyId,
      name: companyName,
      city: location.city,
      state: location.state,
      country: location.country,
      description: null,
      company_size: null,
      zip_code: null,
      address: null,
      url: null,
      lat: null,
      lng: null,
    });
    
    console.log(`✅ Created new company: ${companyName} (${location.city}, ${location.state}) → ${companyId}`);
    return companyId;
    
  } catch (error: any) {
    // Handle duplicate key violation (PostgreSQL error code 23505)
    if (error.code === '23505' || error.message.includes('duplicate key')) {
      console.log(`ℹ️  Company already exists (caught via conflict): ${companyName} (${companyId})`);
      
      // Retry the SELECT to get the existing company_id
      const retry = await db
        .select({ company_id: companies.company_id })
        .from(companies)
        .where(eq(companies.company_id, companyId))
        .limit(1);
      
      if (retry.length > 0) {
        return retry[0].company_id;
      }
      
      // If still not found, something is wrong
      console.error(`❌ Failed to find company after conflict: ${companyName}`);
      throw new Error(`Company conflict but cannot retrieve: ${companyName}`);
    }
    
    // Re-throw other errors
    console.error(`❌ Error creating company ${companyName}:`, error.message);
    throw error;
  }
}

/**
 * Check if a job already exists in the database
 * UPDATED: Now checks by (external_id, source, country) for global uniqueness
 */
export async function jobExists(
  externalId: string,
  source: string,
  country: string
): Promise<boolean> {
  const result = await db
    .select({ job_id: postings.job_id })
    .from(postings)
    .where(
      and(
        eq(postings.external_id, externalId),
        eq(postings.source, source),
        eq(postings.country, country)
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Batch insert jobs with conflict handling
 * Uses (external_id, source, country) for deduplication
 * UPDATED: Now includes country field for global uniqueness
 */
export async function batchInsertJobs(
  jobs: Awaited<ReturnType<typeof transformAdzunaJob>>[]
): Promise<{ inserted: number; updated: number; failed: number }> {
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const exists = await jobExists(job.external_id, job.source, job.country);
      
      if (exists) {
        // Update existing job
        await db
          .update(postings)
          .set({
            title: job.title,
            description: job.description,
            min_salary: job.min_salary,
            max_salary: job.max_salary,
            yearly_min_salary: job.yearly_min_salary,
            yearly_max_salary: job.yearly_max_salary,
            med_salary: job.med_salary,
            yearly_med_salary: job.yearly_med_salary,
            location: job.location,
            work_type: job.work_type,
            formatted_work_type: job.formatted_work_type,
            remote_allowed: job.remote_allowed,
            country: job.country, // Update country field
            import_timestamp: new Date(),
          })
          .where(
            and(
              eq(postings.external_id, job.external_id),
              eq(postings.source, job.source),
              eq(postings.country, job.country)
            )
          );
        updated++;
      } else {
        // Insert new job
        await db.insert(postings).values(job);
        inserted++;
      }
    } catch (error: any) {
      console.error(`❌ Failed to insert job ${job.external_id}:`, error.message);
      failed++;
    }
  }

  return { inserted, updated, failed };
}

/**
 * Validation function to check data quality
 */
export function validateJobData(job: AdzunaJob): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!job.id) {
    warnings.push('Missing job ID');
  }

  if (!job.title || job.title.trim() === '') {
    warnings.push('Missing or empty title');
  }

  if (!job.company?.display_name) {
    warnings.push('Missing company name');
  }

  if (!job.location?.display_name) {
    warnings.push('Missing location');
  }

  if (!job.description || job.description.trim() === '') {
    warnings.push('Missing or empty description');
  }

  if (!job.redirect_url) {
    warnings.push('Missing redirect URL');
  }

  if (!job.created) {
    warnings.push('Missing created date');
  }

  const isValid = warnings.length === 0;
  return { isValid, warnings };
}
