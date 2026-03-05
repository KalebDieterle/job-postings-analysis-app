import { db } from '../index';
import { 
  companies, skills, job_skills, job_industries, industries, 
  roleAliases, top_companies, postings, employee_counts, company_industries, benefits, salaries
} from '../schema';
import { 
  eq, sql, count, desc, asc, inArray, ilike, gte, lte, and, not, lt, gt, avg, isNotNull 
} from 'drizzle-orm';
import {
  categorizeSkill,
  DEFAULT_SKILL_CATEGORY,
  SKILL_CATEGORY_RULES,
} from '../../lib/skill-categories';
import { buildAnchoredTimeframeWindow, normalizeTimeframeDays } from '../../lib/timeframe-window';

const canonicalRole = (titleCol: any) =>
  sql`coalesce(lower(${roleAliases.canonical_name}), lower(${titleCol}))`;

const VALID_ANNUAL_SALARY_MIN = 20_000;
const VALID_ANNUAL_SALARY_MAX = 500_000;
type TrendComparisonMode = 'contiguous' | 'fallback' | 'none';
type TrendComparisonDateRange = ReturnType<typeof buildAnchoredTimeframeWindow> & {
  comparisonMode: TrendComparisonMode;
};

const isRemoteAllowed = (column: unknown) =>
  sql`LOWER(COALESCE(${column}::text, '')) IN ('1', '1.0', 'true', 't')`;

function validAnnualSalaryFilter(alias: string): ReturnType<typeof sql.raw> {
  return sql.raw(`
    ${alias}.yearly_min_salary IS NOT NULL
    AND ${alias}.yearly_min_salary BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
    AND (
      ${alias}.yearly_max_salary IS NULL
      OR (
        ${alias}.yearly_max_salary BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
        AND ${alias}.yearly_max_salary >= ${alias}.yearly_min_salary
      )
    )
  `);
}

/**
 * Get the date range for the most recent N days of data in the dataset.
 * Uses the max posting date as anchor instead of today's date.
 */
async function getMostRecentDateRange(days: number = 30) {
  const maxDate = await db
    .select({
      max_date: sql<string>`max(${postings.listed_time})`,
    })
    .from(postings);

  const mostRecentDate = maxDate[0]?.max_date
    ? new Date(maxDate[0].max_date)
    : new Date();

  return buildAnchoredTimeframeWindow(mostRecentDate, days);
}

async function getComparisonDateRange(days: number = 30): Promise<TrendComparisonDateRange> {
  const baseRange = await getMostRecentDateRange(days);

  const contiguousCoverage = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int as count
    FROM ${postings}
    WHERE ${postings.listed_time} >= ${baseRange.previousStartDate.toISOString()}::timestamp
      AND ${postings.listed_time} < ${baseRange.previousEndDate.toISOString()}::timestamp
  `);

  if (Number(contiguousCoverage.rows[0]?.count ?? 0) > 0) {
    return { ...baseRange, comparisonMode: 'contiguous' };
  }

  const fallbackAnchor = await db.execute<{ fallback_anchor: string | null }>(sql`
    SELECT MAX(${postings.listed_time})::text as fallback_anchor
    FROM ${postings}
    WHERE ${postings.listed_time} < ${baseRange.startDate.toISOString()}::timestamp
  `);

  const fallbackAnchorDate = fallbackAnchor.rows[0]?.fallback_anchor
    ? new Date(fallbackAnchor.rows[0].fallback_anchor)
    : null;

  if (!fallbackAnchorDate) {
    return { ...baseRange, comparisonMode: 'none' };
  }

  // Build a same-length previous window ending at the most recent pre-current snapshot.
  const fallbackEndExclusive = new Date(fallbackAnchorDate.getTime() + 1);
  const fallbackWindow = buildAnchoredTimeframeWindow(fallbackEndExclusive, days);

  const fallbackCoverage = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int as count
    FROM ${postings}
    WHERE ${postings.listed_time} >= ${fallbackWindow.startDate.toISOString()}::timestamp
      AND ${postings.listed_time} < ${fallbackWindow.endDate.toISOString()}::timestamp
  `);

  if (Number(fallbackCoverage.rows[0]?.count ?? 0) === 0) {
    return { ...baseRange, comparisonMode: 'none' };
  }

  return {
    ...baseRange,
    previousStartDate: fallbackWindow.startDate,
    previousEndDate: fallbackWindow.endDate,
    comparisonMode: 'fallback',
  };
}

// ===========================
// Database stats
// ===========================
export async function getDatabaseStats() {
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM ${postings}) AS total_postings,
      (SELECT COUNT(*) FROM ${companies}) AS total_companies,
      (SELECT COUNT(*) FROM ${skills}) AS total_skills,
      (SELECT COUNT(*) FROM ${job_skills}) AS total_job_skills
  `);
  return result.rows[0];
}

export async function getDataHealthDashboard(params?: {
  sourceLimit?: number;
  countryLimit?: number;
}) {
  const sourceLimit = Number.isFinite(params?.sourceLimit)
    ? Math.min(Math.max(Math.floor(params?.sourceLimit ?? 8), 1), 20)
    : 8;
  const countryLimit = Number.isFinite(params?.countryLimit)
    ? Math.min(Math.max(Math.floor(params?.countryLimit ?? 10), 1), 30)
    : 10;

  const [summaryResult, sourceResult, countryResult] = await Promise.all([
    db.execute<{
      total_postings: number;
      salary_covered: number;
      jobs_with_skills: number;
      company_linked: number;
      location_covered: number;
      remote_present: number;
      missing_source: number;
      missing_country: number;
      duplicate_external_keys: number;
      orphan_job_skills_postings: number;
      orphan_job_industries_postings: number;
      orphan_benefits_postings: number;
      orphan_salaries_postings: number;
      duplicate_job_skills_pairs: number;
      duplicate_job_industries_pairs: number;
      stale_90d: number;
      latest_posting_at: string | null;
    }>(sql`
      WITH duplicate_rows AS (
        SELECT
          GREATEST(COUNT(*) - 1, 0)::int AS duplicate_count
        FROM ${postings}
        WHERE ${postings.external_id} IS NOT NULL
          AND TRIM(${postings.external_id}) <> ''
        GROUP BY
          ${postings.external_id},
          COALESCE(TRIM(${postings.source}), ''),
          COALESCE(TRIM(${postings.country}), '')
        HAVING COUNT(*) > 1
      ),
      skill_jobs AS (
        SELECT DISTINCT js.job_id AS job_id
        FROM ${job_skills} js
        INNER JOIN ${postings} p ON p.job_id = js.job_id
      ),
      orphan_job_skills AS (
        SELECT COUNT(*)::int AS count
        FROM ${job_skills} js
        LEFT JOIN ${postings} p ON p.job_id = js.job_id
        WHERE p.job_id IS NULL
      ),
      orphan_job_industries AS (
        SELECT COUNT(*)::int AS count
        FROM ${job_industries} ji
        LEFT JOIN ${postings} p ON p.job_id = ji.job_id
        WHERE p.job_id IS NULL
      ),
      orphan_benefits AS (
        SELECT COUNT(*)::int AS count
        FROM benefits b
        LEFT JOIN ${postings} p ON p.job_id = b.job_id
        WHERE p.job_id IS NULL
      ),
      orphan_salaries AS (
        SELECT COUNT(*)::int AS count
        FROM salaries s
        LEFT JOIN ${postings} p ON p.job_id = s.job_id
        WHERE p.job_id IS NULL
      ),
      duplicate_job_skills AS (
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT js.job_id, js.skill_abr
          FROM ${job_skills} js
          GROUP BY js.job_id, js.skill_abr
          HAVING COUNT(*) > 1
        ) d
      ),
      duplicate_job_industries AS (
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT ji.job_id, ji.industry_id
          FROM ${job_industries} ji
          GROUP BY ji.job_id, ji.industry_id
          HAVING COUNT(*) > 1
        ) d
      )
      SELECT
        COUNT(*)::int AS total_postings,
        COUNT(*) FILTER (WHERE ${validAnnualSalaryFilter("postings")})::int AS salary_covered,
        (
          SELECT COUNT(*)::int
          FROM skill_jobs
        ) AS jobs_with_skills,
        COUNT(*) FILTER (WHERE ${postings.company_id} IS NOT NULL)::int AS company_linked,
        COUNT(*) FILTER (
          WHERE ${postings.location} IS NOT NULL AND TRIM(${postings.location}) <> ''
        )::int AS location_covered,
        COUNT(*) FILTER (WHERE ${postings.remote_allowed} IS NOT NULL)::int AS remote_present,
        COUNT(*) FILTER (WHERE ${postings.source} IS NULL OR TRIM(${postings.source}) = '')::int AS missing_source,
        COUNT(*) FILTER (WHERE ${postings.country} IS NULL OR TRIM(${postings.country}) = '')::int AS missing_country,
        COALESCE((SELECT SUM(duplicate_count)::int FROM duplicate_rows), 0) AS duplicate_external_keys,
        (SELECT count FROM orphan_job_skills) AS orphan_job_skills_postings,
        (SELECT count FROM orphan_job_industries) AS orphan_job_industries_postings,
        (SELECT count FROM orphan_benefits) AS orphan_benefits_postings,
        (SELECT count FROM orphan_salaries) AS orphan_salaries_postings,
        (SELECT count FROM duplicate_job_skills) AS duplicate_job_skills_pairs,
        (SELECT count FROM duplicate_job_industries) AS duplicate_job_industries_pairs,
        COUNT(*) FILTER (
          WHERE ${postings.listed_time} < NOW() - INTERVAL '90 days'
        )::int AS stale_90d,
        MAX(${postings.listed_time})::text AS latest_posting_at
      FROM ${postings}
    `),
    db.execute<{
      source: string;
      posting_count: number;
      salary_coverage_pct: number;
      skill_coverage_pct: number;
      median_salary: number;
      latest_posting_at: string | null;
    }>(sql`
      WITH skill_jobs AS (
        SELECT DISTINCT ${job_skills.job_id} AS job_id
        FROM ${job_skills}
      )
      SELECT
        COALESCE(NULLIF(LOWER(TRIM(p.source)), ''), 'unknown') AS source,
        COUNT(*)::int AS posting_count,
        ROUND(
          (
            COUNT(*) FILTER (WHERE ${validAnnualSalaryFilter("p")})::numeric
            / NULLIF(COUNT(*)::numeric, 0)
          ) * 100,
          1
        )::float AS salary_coverage_pct,
        ROUND(
          (
            COUNT(*) FILTER (WHERE sj.job_id IS NOT NULL)::numeric
            / NULLIF(COUNT(*)::numeric, 0)
          ) * 100,
          1
        )::float AS skill_coverage_pct,
        COALESCE(
          ROUND(
            PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY CASE
                WHEN ${validAnnualSalaryFilter("p")} THEN p.yearly_min_salary
              END
            )
          )::int,
          0
        ) AS median_salary,
        MAX(p.listed_time)::text AS latest_posting_at
      FROM ${postings} p
      LEFT JOIN skill_jobs sj ON p.job_id = sj.job_id
      GROUP BY 1
      ORDER BY posting_count DESC
      LIMIT ${sourceLimit}
    `),
    db.execute<{
      country: string;
      posting_count: number;
      salary_coverage_pct: number;
      skill_coverage_pct: number;
      median_salary: number;
      latest_posting_at: string | null;
    }>(sql`
      WITH skill_jobs AS (
        SELECT DISTINCT ${job_skills.job_id} AS job_id
        FROM ${job_skills}
      )
      SELECT
        COALESCE(NULLIF(UPPER(TRIM(p.country)), ''), 'UNKNOWN') AS country,
        COUNT(*)::int AS posting_count,
        ROUND(
          (
            COUNT(*) FILTER (WHERE ${validAnnualSalaryFilter("p")})::numeric
            / NULLIF(COUNT(*)::numeric, 0)
          ) * 100,
          1
        )::float AS salary_coverage_pct,
        ROUND(
          (
            COUNT(*) FILTER (WHERE sj.job_id IS NOT NULL)::numeric
            / NULLIF(COUNT(*)::numeric, 0)
          ) * 100,
          1
        )::float AS skill_coverage_pct,
        COALESCE(
          ROUND(
            PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY CASE
                WHEN ${validAnnualSalaryFilter("p")} THEN p.yearly_min_salary
              END
            )
          )::int,
          0
        ) AS median_salary,
        MAX(p.listed_time)::text AS latest_posting_at
      FROM ${postings} p
      LEFT JOIN skill_jobs sj ON p.job_id = sj.job_id
      GROUP BY 1
      ORDER BY posting_count DESC
      LIMIT ${countryLimit}
    `),
  ]);

  const summary = summaryResult.rows[0];
  const totalPostings = Number(summary?.total_postings ?? 0);
  const pct = (value: number) =>
    totalPostings > 0 ? Number(((value / totalPostings) * 100).toFixed(1)) : 0;

  return {
    summary: {
      totalPostings,
      salaryCovered: Number(summary?.salary_covered ?? 0),
      jobsWithSkills: Number(summary?.jobs_with_skills ?? 0),
      companyLinked: Number(summary?.company_linked ?? 0),
      locationCovered: Number(summary?.location_covered ?? 0),
      remotePresent: Number(summary?.remote_present ?? 0),
      missingSource: Number(summary?.missing_source ?? 0),
      missingCountry: Number(summary?.missing_country ?? 0),
      duplicateExternalKeys: Number(summary?.duplicate_external_keys ?? 0),
      orphanJobSkillsPostings: Number(summary?.orphan_job_skills_postings ?? 0),
      orphanJobIndustriesPostings: Number(summary?.orphan_job_industries_postings ?? 0),
      orphanBenefitsPostings: Number(summary?.orphan_benefits_postings ?? 0),
      orphanSalariesPostings: Number(summary?.orphan_salaries_postings ?? 0),
      duplicateJobSkillsPairs: Number(summary?.duplicate_job_skills_pairs ?? 0),
      duplicateJobIndustriesPairs: Number(summary?.duplicate_job_industries_pairs ?? 0),
      stale90d: Number(summary?.stale_90d ?? 0),
      latestPostingAt: summary?.latest_posting_at ?? null,
      salaryCoveragePct: pct(Number(summary?.salary_covered ?? 0)),
      skillCoveragePct: pct(Number(summary?.jobs_with_skills ?? 0)),
      companyLinkagePct: pct(Number(summary?.company_linked ?? 0)),
      locationCoveragePct: pct(Number(summary?.location_covered ?? 0)),
      remoteFieldCoveragePct: pct(Number(summary?.remote_present ?? 0)),
    },
    sourceBreakdown: sourceResult.rows.map((row) => ({
      source: row.source,
      postingCount: Number(row.posting_count ?? 0),
      salaryCoveragePct: Number(row.salary_coverage_pct ?? 0),
      skillCoveragePct: Number(row.skill_coverage_pct ?? 0),
      medianSalary: Number(row.median_salary ?? 0),
      latestPostingAt: row.latest_posting_at ?? null,
    })),
    countryBreakdown: countryResult.rows.map((row) => ({
      country: row.country,
      postingCount: Number(row.posting_count ?? 0),
      salaryCoveragePct: Number(row.salary_coverage_pct ?? 0),
      skillCoveragePct: Number(row.skill_coverage_pct ?? 0),
      medianSalary: Number(row.median_salary ?? 0),
      latestPostingAt: row.latest_posting_at ?? null,
    })),
  };
}

// ===========================
// Top job titles with canonical names
// ===========================
export async function getTopJobTitles(limit = 10) {
  const result = await db.execute(sql`
    SELECT COALESCE(ra.canonical_name, p.title) AS title, COUNT(*) AS count
    FROM ${postings} p
    LEFT JOIN ${roleAliases} ra ON p.title = ra.alias
    GROUP BY COALESCE(ra.canonical_name, p.title)
    ORDER BY count DESC
    LIMIT ${limit}
  `);
  return result.rows;
}

export async function getJobsByRole(roleTitle: string, limit = 100) {
  const roleLower = roleTitle.toLowerCase();
  try {
    const results = await db
      .select({
        job_id: postings.job_id,
        title: postings.title,
        company_name: postings.company_name,
        location: postings.location,
        min_salary: postings.min_salary,
        max_salary: postings.max_salary,
        listed_time: postings.listed_time,
      })
      .from(postings)
      .leftJoin(roleAliases, sql`lower(${postings.title}) = lower(${roleAliases.alias})`)
      .where(sql`coalesce(lower(${roleAliases.canonical_name}), lower(${postings.title})) = ${roleLower}`)
      .orderBy(desc(postings.listed_time))
      .limit(limit);
    
    return results;
  } catch (error) {
    console.error('Error fetching jobs by role:', error);
    throw error;
  }
}

// ===========================
// Recent jobs with company info
// ===========================
export async function getRecentJobs(limit = 10) {
  const results = await db
    .select({
      job_id: postings.job_id,
      title: postings.title,
      company_name: postings.company_name,
      location: postings.location,
      min_salary: postings.min_salary,
      max_salary: postings.max_salary,
      listed_time: postings.listed_time,
    })
    .from(postings)
    .orderBy(desc(postings.listed_time))
    .limit(limit);
  return results;
}

export async function getTopJobRoles(
  limit: number,
  filters?: { location?: string; experience?: string[]; minSalary?: number; q?: string },
  page: number = 1,
) {
  const conditions = [];
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  if (filters?.location) {
    conditions.push(sql`LOWER(${postings.location}) LIKE ${`%${filters.location.toLowerCase()}%`}`);
  }

  if (filters?.experience && filters.experience.length > 0) {
    conditions.push(inArray(postings.formatted_experience_level, filters.experience));
  }

  // UPDATED: Now filters directly on the indexed integer column 🚀
  if (filters?.minSalary && filters.minSalary > 0) {
    conditions.push(gte(postings.yearly_min_salary, filters.minSalary));
  }

  if (filters?.q) {
    conditions.push(
      sql`(
        LOWER(${postings.title}) LIKE ${`%${filters.q.toLowerCase()}%`}
        OR LOWER(${roleAliases.canonical_name}) LIKE ${`%${filters.q.toLowerCase()}%`}
      )`
    );
  }

  const query = db
    .select({
      title: sql<string>`COALESCE(${roleAliases.canonical_name}, ${postings.title})`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(postings)
    .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`);

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  return await query
    .groupBy(sql`COALESCE(${roleAliases.canonical_name}, ${postings.title})`)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit)
    .offset(offset);
}

// ===========================
// Top roles time series
// ===========================
export async function getTopRolesTimeSeries(limit = 10) {
  const startTime = Date.now();
  try {
    const topRolesResult = await db
      .select({ 
        title: sql<string>`COALESCE(${roleAliases.canonical_name}, ${postings.title})` 
      })
      .from(postings)
      .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`)
      .groupBy(sql`COALESCE(${roleAliases.canonical_name}, ${postings.title})`)
      .orderBy(desc(count()))
      .limit(limit);

    const topRoles = topRolesResult.map(r => r.title);
    if (topRoles.length === 0) return [];

    const result = await db.execute<{
      title: string;
      day: string;
      count: number;
    }>(sql`
      SELECT 
        COALESCE(ra.canonical_name, p.title) as title,
        DATE_TRUNC('day', p.listed_time::timestamp)::text as day,
        COUNT(*)::int as count
      FROM ${postings} p
      LEFT JOIN ${roleAliases} ra ON LOWER(p.title) = LOWER(ra.alias)
      WHERE COALESCE(ra.canonical_name, p.title) = ANY(ARRAY[${sql.join(topRoles.map(r => sql`${r}`), sql`, `)}]::text[])
      GROUP BY COALESCE(ra.canonical_name, p.title), DATE_TRUNC('day', p.listed_time::timestamp)
      ORDER BY day ASC
    `);

    return result.rows.map(row => ({
      title: row.title,
      day: row.day,
      count: Number(row.count),
    }));

  } catch (error) {
    console.error('❌ [getTopRolesTimeSeries] Error:', error);
    throw error;
  }
}

// ===========================
// Top skills for a role
// ===========================
export async function getTopSkillsForRole(roleTitle: string, limit = 10) {
  const roleLower = roleTitle.toLowerCase();
  return await db
    .select({
      skill_name: skills.skill_name,
      skill_abr: skills.skill_abr,
      count: count(),
    })
    .from(job_skills)
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .leftJoin(roleAliases, sql`lower(postings.title) = lower(${roleAliases.alias})`)
    .where(sql`${canonicalRole(postings.title)} = ${roleLower}`)
    .groupBy(skills.skill_name, skills.skill_abr)
    .orderBy(desc(count()))
    .limit(limit);
}

// ===========================
// Top companies for a role
// ===========================
export async function getTopCompaniesForRole(roleTitle: string, limit = 10) {
  const roleLower = roleTitle.toLowerCase();
  return await db
    .select({
      company_name: postings.company_name,
      count: count(),
      country: companies.country,
    })
    .from(postings)
    .leftJoin(roleAliases, sql`lower(postings.title) = lower(${roleAliases.alias})`)
    .leftJoin(companies, sql`lower(postings.company_name) = lower(${companies.name})`)
    .where(sql`coalesce(lower(${roleAliases.canonical_name}), lower(postings.title)) = ${roleLower}`)
    .groupBy(postings.company_name, companies.country)
    .orderBy(desc(count()))
    .limit(limit);
}

// ===========================
// Role statistics with normalized salaries
// ===========================
export async function getRoleStats(roleTitle: string) {
  const roleLower = roleTitle.toLowerCase();

  const results = await db
    .select({
      total_jobs: count(),
      median_min_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary}) filter (
        where ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
      )`,
      median_max_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_max_salary}) filter (
        where ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
      )`,
    })
    .from(postings)
    .leftJoin(roleAliases, sql`lower(postings.title) = lower(${roleAliases.alias})`)
    .where(sql`coalesce(lower(${roleAliases.canonical_name}), lower(postings.title)) = ${roleLower}`);

  const row = results[0] || { total_jobs: 0, median_min_salary: null, median_max_salary: null };
  return {
    total_jobs: row.total_jobs,
    median_min_salary: row.median_min_salary,
    median_max_salary: row.median_max_salary,
    // compatibility aliases
    avg_min_salary: row.median_min_salary,
    avg_max_salary: row.median_max_salary,
  };
}

// ===========================
// Data Quality Metrics
// ===========================
export async function getRoleDataQuality(roleTitle: string) {
  const result = await db
    .select({ count: count() })
    .from(postings)
    .leftJoin(job_skills, eq(postings.job_id, job_skills.job_id))
    .leftJoin(roleAliases, sql`lower(postings.title) = lower(${roleAliases.alias})`)
    .where(sql`coalesce(lower(${roleAliases.canonical_name}), lower(postings.title)) = ${roleTitle.toLowerCase()} AND ${job_skills.job_id} IS NULL`);

  return result[0]?.count ?? 0;
}

// ===========================
// Paginated list of all skills with counts and normalized avg salary
// ===========================
export async function getAllSkills(params: { page?: number; limit?: number; search?: string }) {
  const { page = 1, limit = 12, search = "" } = params;
  const offset = (page - 1) * limit;

  const conditions = search ? ilike(skills.skill_name, `%${search}%`) : undefined;

  // UPDATED: avg(yearly_min_salary) excluding $0 values
  const data = await db
    .select({
      name: skills.skill_name,
      count: count(),
      median_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary}) filter (
        where ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
      )`,
    })
    .from(skills)
    .leftJoin(job_skills, eq(skills.skill_abr, job_skills.skill_abr))
    .leftJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(conditions)
    .groupBy(skills.skill_name)
    .orderBy(desc(count()))
    .limit(limit)
    .offset(offset);

  return data.map((row) => ({
    ...row,
    avg_salary: row.median_salary, // compatibility alias
  }));
}

export async function getAllSkillsPaginated(params: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const parsedPage = Number(params.page ?? 1);
  const parsedLimit = Number(params.limit ?? 12);

  const page = Number.isFinite(parsedPage)
    ? Math.max(1, Math.floor(parsedPage))
    : 1;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(Math.floor(parsedLimit), 1), 100)
    : 12;
  const search = (params.search ?? "").trim();

  const conditions = search ? ilike(skills.skill_name, `%${search}%`) : undefined;

  const [items, totalRows] = await Promise.all([
    getAllSkills({ page, limit, search }),
    db
      .select({
        total: count(),
      })
      .from(skills)
      .where(conditions),
  ]);

  const total = Number(totalRows[0]?.total ?? 0);

  return {
    items,
    page,
    pageSize: limit,
    total,
    hasNext: page * limit < total,
  };
}

// ===========================
// Detailed stats for a specific skill
// ===========================
export async function getSkillDetails(skillName: string) {
  const skillLower = skillName.toLowerCase();

  // UPDATED: Uses yearly_min_salary
  const stats = await db
    .select({
      count: sql<number>`count(*)::int`,
      medianSalary: sql<number>`coalesce(percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary}) filter (
        where ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
      ), 0)::float`,
    })
    .from(postings)
    .innerJoin(job_skills, eq(postings.job_id, job_skills.job_id))
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .where(sql`lower(${skills.skill_name}) = ${skillLower}`);

  const topEmployers = await db
    .select({
      name: postings.company_name,
      count: sql<number>`count(*)::int`,
    })
    .from(postings)
    .innerJoin(job_skills, eq(postings.job_id, job_skills.job_id))
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .where(sql`lower(${skills.skill_name}) = ${skillLower}`)
    .groupBy(postings.company_name)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  const baseStats = stats[0] || { count: 0, medianSalary: 0 };

  return {
    count: Number(baseStats.count),
    medianSalary: Number(baseStats.medianSalary),
    avgSalary: Number(baseStats.medianSalary), // compatibility alias
    topEmployers: topEmployers || [],
    marketShare: baseStats.count > 0 ? ((Number(baseStats.count) / 123849) * 100).toFixed(2) : "0.00",
  };
}

// ===========================
// Related skills
// ===========================
export async function getRelatedSkills(skillName: string, limit = 5) {
  const skillLower = skillName.toLowerCase();
  const jobIdsResult = await db
    .select({ job_id: job_skills.job_id })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .where(sql`lower(${skills.skill_name}) = ${skillLower}`);

  const jobIds = jobIdsResult.map(r => r.job_id);
  if (jobIds.length === 0) return [];

  return await db
    .select({
      name: skills.skill_name,
      count: count(),
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .where(
      and(
        inArray(job_skills.job_id, jobIds),
        not(sql`lower(${skills.skill_name}) = ${skillLower}`)
      )
    )
    .groupBy(skills.skill_name)
    .orderBy(desc(count()))
    .limit(limit);
}

// ===========================
// Skill trending data
// ===========================
export async function getSkillTrendingData(skillName: string) {
  const skillLower = skillName.toLowerCase();
  return await db
    .select({
      day: sql<string>`date_trunc('day', ${postings.listed_time})::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(postings)
    .innerJoin(job_skills, eq(postings.job_id, job_skills.job_id))
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .where(sql`lower(${skills.skill_name}) = ${skillLower}`)
    .groupBy(sql`date_trunc('day', ${postings.listed_time})`)
    .orderBy(sql`date_trunc('day', ${postings.listed_time}) ASC`);
}

export async function getRoleInsights(roleTitle: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const currentCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(postings)
    .where(and(eq(postings.title, roleTitle), gte(postings.listed_time, thirtyDaysAgo)));

  const topSkill = await db
    .select({ name: skills.skill_name, count: sql<number>`count(*)` })
    .from(skills)
    .innerJoin(job_skills, eq(skills.skill_abr, job_skills.skill_abr))
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(eq(postings.title, roleTitle))
    .groupBy(skills.skill_name)
    .orderBy(sql`count(*) DESC`)
    .limit(1);

  return {
    count: currentCount[0]?.count || 0,
    topSkill: topSkill[0]?.name || "N/A",
    trend: 12 
  };
}

export async function getRoleGrowth(title: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [currentPeriod, previousPeriod] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(postings)
      .where(and(eq(postings.title, title), gte(postings.listed_time, thirtyDaysAgo))),
    db.select({ count: sql<number>`count(*)` })
      .from(postings)
      .where(and(
        eq(postings.title, title), 
        gte(postings.listed_time, sixtyDaysAgo), 
        lt(postings.listed_time, thirtyDaysAgo)
      )),
  ]);

  const current = currentPeriod[0].count || 0;
  const previous = previousPeriod[0].count || 0;

  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getTotalCompanyStats() {
  const [counts] = await db
    .select({
      total_companies: count(companies.company_id),
      total_postings: sql<number>`(SELECT count(*) FROM ${postings})`,
    })
    .from(companies);

  const [leader] = await db
    .select({
      name: companies.name,
      jobCount: count(postings.job_id),
      country: companies.country,
    })
    .from(companies)
    .innerJoin(postings, eq(companies.name, postings.company_name)) 
    .groupBy(companies.name, companies.country)
    .orderBy(desc(count(postings.job_id)))
    .limit(1);

  return {
    total_companies: Number(counts?.total_companies ?? 0),
    total_postings: Number(counts?.total_postings ?? 0),
    top_company_name: leader?.name ?? "N/A",
    top_company_postings: Number(leader?.jobCount ?? 0),
  };
}

export async function getTopIndustries(limit = 5) {
  return await db
    .select({
      industry_name: industries.industry_name,
      count: count(),
    })
    .from(job_industries)
    .innerJoin(postings, eq(job_industries.job_id, postings.job_id))
    .innerJoin(industries, eq(job_industries.industry_id, industries.industry_id))
    .groupBy(industries.industry_name)
    .orderBy(desc(count()))
    .limit(limit);
}

// ===========================
// All Company Data
// ===========================
export async function getAllCompanyData({
  limit = 50,
  offset = 0,
  search = "",
  location = "",
  companySize = [] as string[],
  minSalary = 0,
  minPostings = 0,
  sort = "postings",
}: {
  limit?: number;
  offset?: number;
  search?: string;
  location?: string;
  companySize?: string[];
  minSalary?: number;
  minPostings?: number;
  sort?: string;
} = {}) {
  const dbLimit = limit + 1;

  // Build size filter conditions for the HAVING clause
  const sizeConditions: ReturnType<typeof sql>[] = [];
  if (companySize.length > 0) {
    const sizeRanges = companySize.map((s) => {
      switch (s) {
        case "1-10": return sql`MAX(${employee_counts.employee_count}) BETWEEN 1 AND 10`;
        case "11-50": return sql`MAX(${employee_counts.employee_count}) BETWEEN 11 AND 50`;
        case "51-200": return sql`MAX(${employee_counts.employee_count}) BETWEEN 51 AND 200`;
        case "201-500": return sql`MAX(${employee_counts.employee_count}) BETWEEN 201 AND 500`;
        case "501-1000": return sql`MAX(${employee_counts.employee_count}) BETWEEN 501 AND 1000`;
        case "1001-5000": return sql`MAX(${employee_counts.employee_count}) BETWEEN 1001 AND 5000`;
        case "5001-10000": return sql`MAX(${employee_counts.employee_count}) BETWEEN 5001 AND 10000`;
        case "10001+": return sql`MAX(${employee_counts.employee_count}) > 10000`;
        default: return sql`TRUE`;
      }
    });
    // OR logic: match any selected size range
    sizeConditions.push(sql`(${sql.join(sizeRanges, sql` OR `)})`);
  }

  const salaryCaseExpr = sql`CASE
    WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
      AND (
        ${postings.yearly_max_salary} IS NULL
        OR (
          ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
          AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
        )
      )
    THEN ${postings.yearly_min_salary}
  END`;

  // Determine sort order
  const sortOrder = (() => {
    switch (sort) {
      case "salary":
        return desc(sql`COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${salaryCaseExpr}), 0)`);
      case "name": return asc(companies.name);
      case "size": return desc(sql`MAX(${employee_counts.employee_count})`);
      default: return desc(sql`COUNT(${postings.job_id})`);
    }
  })();

  // WHERE conditions
  const conditions = [
    and(
      sql`LOWER(${companies.name}) != 'confidential'`,
      sql`LOWER(${companies.name}) != 'confidential company'`,
      sql`LOWER(${companies.name}) NOT LIKE 'confidential (%'`,
      sql`LOWER(${companies.name}) NOT LIKE '%eox vantage%'`
    )
  ];

  if (search) conditions.push(ilike(companies.name, `%${search}%`));
  if (location) conditions.push(ilike(companies.country, `%${location}%`));

  // HAVING conditions for aggregate filters
  const havingConditions: ReturnType<typeof sql>[] = [];
  if (minPostings > 0) {
    havingConditions.push(sql`COUNT(${postings.job_id}) >= ${minPostings}`);
  }
  if (minSalary > 0) {
    havingConditions.push(
      sql`COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${salaryCaseExpr}), 0) >= ${minSalary}`
    );
  }
  havingConditions.push(...sizeConditions);

  // Use a single query with all joins to support aggregate-based features
  const baseQuery = db
    .select({
      company_id: companies.company_id,
      name: companies.name,
      country: companies.country,
      company_size: sql<number>`MAX(${employee_counts.employee_count})`,
      postings_count: sql<number>`COUNT(DISTINCT ${postings.job_id})::int`,
      median_salary: sql<number>`COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${salaryCaseExpr}), 0)::int`,
      avg_salary: sql<number>`COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${salaryCaseExpr}), 0)::int`,
    })
    .from(companies)
    .leftJoin(postings, eq(companies.name, postings.company_name))
    .leftJoin(employee_counts, eq(companies.company_id, employee_counts.company_id))
    .where(and(...conditions))
    .groupBy(companies.company_id, companies.name, companies.country);

  // Apply HAVING if any aggregate filters
  const queryWithHaving = havingConditions.length > 0
    ? baseQuery.having(and(...havingConditions.map(c => c)))
    : baseQuery;

  return await queryWithHaving
    .orderBy(sortOrder)
    .limit(dbLimit)
    .offset(offset);
}

// ===========================
// Avg Company Salary (Normalized)
// ===========================
export async function getAverageCompanySalary() {
  const companyAvgCte = db.$with("company_avg").as(
    db
      .select({
        company_id: companies.company_id,
        company: companies.name,
        median_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary})`.as("median_salary"),
        avg_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary})`.as("avg_salary"),
        posting_count: sql<number>`COUNT(${postings.job_id})::int`.as("posting_count"),
      })
      .from(companies)
      .innerJoin(postings, sql`LOWER(${companies.name}) = LOWER(${postings.company_name})`)
      .where(and(
        gte(postings.yearly_min_salary, VALID_ANNUAL_SALARY_MIN),
        lte(postings.yearly_min_salary, VALID_ANNUAL_SALARY_MAX),
        sql`(
          ${postings.yearly_max_salary} IS NULL
          OR (
            ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
            AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
          )
        )`
      ))
      .groupBy(companies.company_id, companies.name)
  );

  const globalAvgCte = db.$with("global_avg").as(
    db.select({
      global_median_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary})`.as("global_median_salary"),
      global_avg_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary})`.as("global_avg_salary"),
    })
    .from(postings)
    .where(and(
      gte(postings.yearly_min_salary, VALID_ANNUAL_SALARY_MIN),
      lte(postings.yearly_min_salary, VALID_ANNUAL_SALARY_MAX),
      sql`(
        ${postings.yearly_max_salary} IS NULL
        OR (
          ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
          AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
        )
      )`
    ))
  );

  return db
    .with(companyAvgCte, globalAvgCte)
    .select({
      company: companyAvgCte.company,
      median_salary: companyAvgCte.median_salary,
      avg_salary: companyAvgCte.avg_salary,
      posting_count: companyAvgCte.posting_count,
      global_median_salary: globalAvgCte.global_median_salary,
      global_avg_salary: globalAvgCte.global_avg_salary,
    })
    .from(companyAvgCte)
    .crossJoin(globalAvgCte)
    .orderBy(desc(companyAvgCte.median_salary))
    .limit(10);
}

// ===========================
// Top Companies By Size
// ===========================
export async function getTopCompaniesBySize() {
  const companySizeCte = db.$with("company_size").as(
    db
      .select({
        company_id: companies.company_id,
        company: companies.name,
        employee_count: employee_counts.employee_count,
        median_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (
          ORDER BY CASE
            WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
              AND (
                ${postings.yearly_max_salary} IS NULL
                OR (
                  ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
                  AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
                )
              )
            THEN ${postings.yearly_min_salary}
          END
        )`.as("median_salary"),
        avg_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (
          ORDER BY CASE
            WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
              AND (
                ${postings.yearly_max_salary} IS NULL
                OR (
                  ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
                  AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
                )
              )
            THEN ${postings.yearly_min_salary}
          END
        )`.as("avg_salary"),
        posting_count: sql<number>`COUNT(${postings.job_id})::int`.as("posting_count"),
      })
      .from(companies)
      .innerJoin(employee_counts, eq(companies.company_id, employee_counts.company_id))
      .leftJoin(postings, sql`LOWER(${companies.name}) = LOWER(${postings.company_name})`)
      .groupBy(companies.company_id, companies.name, employee_counts.employee_count)
  );

  const globalAvgCte = db.$with("global_avg").as(
    db.select({
      global_median_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (
        ORDER BY CASE WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX} THEN ${postings.yearly_min_salary} END
      )`.as("global_median_salary"),
      global_avg_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (
        ORDER BY CASE WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX} THEN ${postings.yearly_min_salary} END
      )`.as("global_avg_salary"),
    }).from(postings)
  );

  return db
    .with(companySizeCte, globalAvgCte)
    .select({
      company: companySizeCte.company,
      employee_count: companySizeCte.employee_count,
      median_salary: companySizeCte.median_salary,
      avg_salary: companySizeCte.avg_salary,
      posting_count: companySizeCte.posting_count,
      global_median_salary: globalAvgCte.global_median_salary,
      global_avg_salary: globalAvgCte.global_avg_salary,
    })
    .from(companySizeCte)
    .crossJoin(globalAvgCte)
    .orderBy(desc(companySizeCte.employee_count))
    .limit(10);
}

// ===========================
// Top Fortune Companies Stats
// ===========================
export async function getAvgSalaryPerEmployeeForTop10Fortune() {
  // STEP 1: Rank the employee counts by time_recorded
  const rankedCounts = db.$with("ranked_counts").as(
    db
      .select({
        company_id: employee_counts.company_id,
        employee_count: employee_counts.employee_count,
        rn: sql<number>`row_number() over (partition by ${employee_counts.company_id} order by ${employee_counts.time_recorded} desc)`.as("rn"),
      })
      .from(employee_counts)
  );

  // STEP 2: Filter to get ONLY the latest count (rn = 1)
  const latestCounts = db.$with("latest_counts").as(
    db
      .select({
        company_id: rankedCounts.company_id,
        employee_count: sql<number>`${rankedCounts.employee_count}::int`.as("employee_count"),
      })
      .from(rankedCounts)
      .where(eq(rankedCounts.rn, 1))
  );

  // STEP 3: Main query joining the cleaned data
  return await db
    .with(rankedCounts, latestCounts)
    .select({
      company: top_companies.name,
      fortune_rank: top_companies.fortune_rank,
      median_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary})`.mapWith(Number),
      avg_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary})`.mapWith(Number),
      employee_count: sql<number>`COALESCE(${latestCounts.employee_count}, 0)`.mapWith(Number),
      posting_count: sql<number>`COUNT(${postings.job_id})`.mapWith(Number),
    })
    .from(top_companies)
    .innerJoin(companies, eq(top_companies.name, companies.name))
    .leftJoin(latestCounts, eq(companies.company_id, latestCounts.company_id))
    .leftJoin(postings, eq(companies.name, postings.company_name))
    .where(and(
      gte(postings.yearly_min_salary, VALID_ANNUAL_SALARY_MIN),
      lte(postings.yearly_min_salary, VALID_ANNUAL_SALARY_MAX),
      sql`(
        ${postings.yearly_max_salary} IS NULL
        OR (
          ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
          AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
        )
      )`
    ))
    .groupBy(top_companies.name, top_companies.fortune_rank, latestCounts.employee_count)
    .orderBy(top_companies.fortune_rank)
    .limit(10);
}

export async function getCompanyBySlug(slug: string) {
  if (!slug) throw new Error("Slug is required");
  return (await db
    .select()
    .from(companies)
    .where(sql`lower(regexp_replace(${companies.name}, '[^a-z0-9]', '', 'gi')) = lower(regexp_replace(${slug}, '[^a-z0-9]', '', 'gi'))`)
    .limit(1))[0] || null;
}

export async function getCompanyJobStats(companyName: string) {
  const result = await db
    .select({
      total_postings: sql<number>`COUNT(*)::int`,
      active_postings: sql<number>`COUNT(CASE WHEN ${postings.closed_time} IS NULL THEN 1 END)::int`,
      median_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (
        ORDER BY CASE
          WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
            AND (
              ${postings.yearly_max_salary} IS NULL
              OR (
                ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
                AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
              )
            )
          THEN ${postings.yearly_min_salary}
        END
      )`,
      avg_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (
        ORDER BY CASE
          WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
            AND (
              ${postings.yearly_max_salary} IS NULL
              OR (
                ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
                AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
              )
            )
          THEN ${postings.yearly_min_salary}
        END
      )`,
      remote_count: sql<number>`SUM(CASE WHEN ${isRemoteAllowed(postings.remote_allowed)} THEN 1 ELSE 0 END)::int`,
    })
    .from(postings)
    .where(eq(postings.company_name, companyName));

  return result[0];
}

export async function getCompanyTopRoles(companyName: string, limit = 10) {
  return await db
    .select({
      title: sql<string>`COALESCE(${roleAliases.canonical_name}, ${postings.title})`,
      count: sql<number>`COUNT(*)::int`,
      median_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (
        ORDER BY CASE
          WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
            AND (
              ${postings.yearly_max_salary} IS NULL
              OR (
                ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
                AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
              )
            )
          THEN ${postings.yearly_min_salary}
        END
      )`,
      avg_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (
        ORDER BY CASE
          WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
            AND (
              ${postings.yearly_max_salary} IS NULL
              OR (
                ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
                AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
              )
            )
          THEN ${postings.yearly_min_salary}
        END
      )`,
    })
    .from(postings)
    .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`)
    .where(sql`LOWER(${postings.company_name}) = LOWER(${companyName})`)
    .groupBy(sql`COALESCE(${roleAliases.canonical_name}, ${postings.title})`)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
}

export async function getCompanyTopSkills(companyName: string, limit = 15) {
  return await db
    .select({
      skill_name: skills.skill_name,
      skill_abr: skills.skill_abr,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(postings)
    .innerJoin(job_skills, eq(postings.job_id, job_skills.job_id))
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .where(sql`LOWER(${postings.company_name}) = LOWER(${companyName})`)
    .groupBy(skills.skill_name, skills.skill_abr)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
}

export async function getCompanyPostingsTimeSeries(companyName: string) {
  const result = await db.execute<{ month: string; count: number }>(sql`
    SELECT TO_CHAR(DATE_TRUNC('month', listed_time::timestamp), 'YYYY-MM') as month, COUNT(*)::int as count
    FROM ${postings}
    WHERE LOWER(company_name) = LOWER(${companyName})
    GROUP BY DATE_TRUNC('month', listed_time::timestamp)
    ORDER BY month ASC
  `);
  return result.rows;
}

export async function getCompanyLocationDistribution(companyName: string) {
  return await db
    .select({ location: postings.location, count: sql<number>`COUNT(*)::int` })
    .from(postings)
    .where(and(sql`LOWER(${postings.company_name}) = LOWER(${companyName})`, isNotNull(postings.location), not(eq(postings.location, ''))))
    .groupBy(postings.location)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(10);
}

export async function getCompanyExperienceLevels(companyName: string) {
  return await db
    .select({ experience_level: postings.formatted_experience_level, count: sql<number>`COUNT(*)::int` })
    .from(postings)
    .where(and(sql`LOWER(${postings.company_name}) = LOWER(${companyName})`, isNotNull(postings.formatted_experience_level)))
    .groupBy(postings.formatted_experience_level)
    .orderBy(desc(sql`COUNT(*)`));
}

export async function getCompanySalaryDistribution(companyName: string) {
  // UPDATED: CASE statement now uses the clean yearly_min_salary column instead of regex
  return (await db.execute<{ salary_range: string; count: number }>(sql`
    SELECT 
      CASE 
        WHEN yearly_min_salary < 50000 THEN 'Under $50k'
        WHEN yearly_min_salary < 75000 THEN '$50k-$75k'
        WHEN yearly_min_salary < 100000 THEN '$75k-$100k'
        WHEN yearly_min_salary < 150000 THEN '$100k-$150k'
        WHEN yearly_min_salary < 200000 THEN '$150k-$200k'
        ELSE 'Over $200k'
      END as salary_range,
      COUNT(*)::int as count
    FROM ${postings}
    WHERE LOWER(company_name) = LOWER(${companyName})
      AND yearly_min_salary IS NOT NULL 
    GROUP BY salary_range
    ORDER BY MIN(yearly_min_salary)
  `)).rows;
}

export async function getCompanyRecentPostings(companyName: string, limit = 10) {
  return await db
    .select({
      job_id: postings.job_id,
      title: postings.title,
      location: postings.location,
      min_salary: postings.min_salary,
      max_salary: postings.max_salary,
      listed_time: postings.listed_time,
      remote_allowed: postings.remote_allowed,
      formatted_experience_level: postings.formatted_experience_level,
      job_posting_url: postings.job_posting_url,
    })
    .from(postings)
    .where(sql`LOWER(${postings.company_name}) = LOWER(${companyName})`)
    .orderBy(desc(postings.listed_time))
    .limit(limit);
}

/**
 * Get aggregated stats by location
 */
export async function getJobsByLocation() {
  return await db
    .select({
      location: postings.location,
      city: companies.city,
      state: companies.state,
      country: companies.country,
      jobCount: sql<number>`count(distinct ${postings.job_id})`.as('job_count'),
      companyCount: sql<number>`count(distinct ${postings.company_id})`.as('company_count'),
      avgMinSalary: sql<number>`avg(${postings.yearly_min_salary}) filter (where ${postings.yearly_min_salary} > 0)`.as('avg_min_salary'),
      avgMaxSalary: sql<number>`avg(${postings.yearly_max_salary}) filter (where ${postings.yearly_max_salary} > 0)`.as('avg_max_salary'),
      remoteCount: sql<number>`count(*) filter (where ${isRemoteAllowed(postings.remote_allowed)})`.as('remote_count'),
    })
    .from(postings)
    .leftJoin(companies, sql`LOWER(TRIM(${companies.name})) = LOWER(TRIM(${postings.company_name}))`)
    .where(isNotNull(postings.location))
    .groupBy(postings.location, companies.city, companies.state, companies.country)
    .orderBy(desc(sql`count(distinct ${postings.job_id})`));
}

/**
 * Get aggregated stats by city across all companies
 */
export async function getJobsByCity() {
  const cityExpr = sql<string>`
    CASE 
      WHEN ${postings.location} ~ '^[^,]+, [A-Z]{2}$' THEN TRIM(SPLIT_PART(${postings.location}, ',', 1))
      WHEN ${postings.location} ~ '^[^,]+, [^,]+$' THEN TRIM(SPLIT_PART(${postings.location}, ',', 1))
      ELSE ${postings.location}
    END
  `;
  const stateExpr = sql<string>`
    CASE 
      WHEN ${postings.location} ~ '^[^,]+, [A-Z]{2}$' THEN TRIM(SPLIT_PART(${postings.location}, ',', 2))
      WHEN ${postings.location} ~ '^[^,]+, [^,]+$' THEN TRIM(SPLIT_PART(${postings.location}, ',', 2))
      ELSE NULL
    END
  `;

  return await db
    .select({
      location: cityExpr,
      city: cityExpr,
      state: stateExpr,
      country: postings.country,
      lat: sql<number | null>`MAX(${companies.lat})`,
      lng: sql<number | null>`MAX(${companies.lng})`,
      jobCount: sql<number>`count(distinct ${postings.job_id})::int`,
      companyCount: sql<number>`count(distinct lower(trim(${postings.company_name})))::int`,
      medianSalary: sql<number>`round(percentile_cont(0.5) within group (
        order by case
          when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
            and (
              ${postings.yearly_max_salary} is null
              or (
                ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                and ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
              )
            )
          then ${postings.yearly_min_salary}
        end
      ))::int`,
      avgSalary: sql<number>`round(percentile_cont(0.5) within group (
        order by case
          when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
            and (
              ${postings.yearly_max_salary} is null
              or (
                ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                and ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
              )
            )
          then ${postings.yearly_min_salary}
        end
      ))::int`,
      remoteRatio: sql<number>`(
        count(*) FILTER (WHERE ${isRemoteAllowed(postings.remote_allowed)})::float / NULLIF(count(*), 0)
      )`,
    })
    .from(postings)
    .leftJoin(
      companies,
      sql`LOWER(TRIM(${companies.name})) = LOWER(TRIM(${postings.company_name}))`
    )
    .where(
      and(
        isNotNull(postings.location),
        sql`${postings.location} != ''`
      )
    )
    .groupBy(cityExpr, stateExpr, postings.country)
    .orderBy(desc(sql`count(distinct ${postings.job_id})`));
}

export async function getJobsByCityFiltered(params: {
  q?: string;
  state?: string;
  country?: string;
  minSalary?: number;
  minJobs?: number;
  sort?: 'jobs' | 'salary' | 'name';
  page?: number;
  limit?: number;
}) {
  const {
    q = '',
    state = '',
    country = '',
    minSalary = 0,
    minJobs = 0,
    sort = 'jobs',
    page = 1,
    limit = 50,
  } = params;

  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), 5000)
    : 50;
  const offset = (safePage - 1) * safeLimit;
  const safeSort = sort === 'salary' || sort === 'name' ? sort : 'jobs';
  const search = q.trim().toLowerCase();
  const stateFilter = state.trim().toLowerCase();
  const countryFilter = country.trim().toLowerCase();

  const whereConditions: ReturnType<typeof sql>[] = [];

  if (search) {
    whereConditions.push(
      sql`(
        lower(coalesce(city, '')) like ${`%${search}%`}
        or lower(coalesce(state, '')) like ${`%${search}%`}
        or lower(coalesce(country, '')) like ${`%${search}%`}
      )`
    );
  }

  if (stateFilter) {
    whereConditions.push(sql`lower(coalesce(state, '')) = ${stateFilter}`);
  }

  if (countryFilter) {
    whereConditions.push(
      sql`lower(coalesce(country, '')) like ${`%${countryFilter}%`}`
    );
  }

  if (minSalary > 0) {
    whereConditions.push(sql`coalesce(avg_salary, 0) >= ${minSalary}`);
  }

  if (minJobs > 0) {
    whereConditions.push(sql`coalesce(job_count, 0) >= ${minJobs}`);
  }

  const whereClause =
    whereConditions.length > 0
      ? sql.join(whereConditions, sql.raw(' AND '))
      : sql`TRUE`;

  const orderByClause =
    safeSort === 'salary'
      ? sql.raw('avg_salary DESC NULLS LAST, job_count DESC, city ASC')
      : safeSort === 'name'
        ? sql.raw('city ASC, job_count DESC')
        : sql.raw('job_count DESC, city ASC');

  const result = await db.execute<{
    city: string | null;
    state: string | null;
    country: string | null;
    lat: number | null;
    lng: number | null;
    job_count: number;
    company_count: number;
    median_salary: number | null;
    avg_salary: number | null;
    remote_ratio: number | null;
    total_count: number;
    total_jobs: number;
  }>(sql`
    WITH parsed AS (
      SELECT
        p.job_id,
        p.company_name,
        p.yearly_min_salary,
        p.yearly_max_salary,
        p.remote_allowed,
        CASE
          WHEN p.location ~ '^[^,]+, [A-Z]{2}$' THEN TRIM(SPLIT_PART(p.location, ',', 1))
          WHEN p.location ~ '^[^,]+, [^,]+$' THEN TRIM(SPLIT_PART(p.location, ',', 1))
          ELSE p.location
        END AS city,
        CASE
          WHEN p.location ~ '^[^,]+, [A-Z]{2}$' THEN TRIM(SPLIT_PART(p.location, ',', 2))
          WHEN p.location ~ '^[^,]+, [^,]+$' THEN TRIM(SPLIT_PART(p.location, ',', 2))
          ELSE NULL
        END AS state,
        p.country
      FROM "postings" p
      WHERE p.location IS NOT NULL
        AND p.location != ''
    ),
    base AS (
      SELECT
        parsed.city AS city,
        parsed.state AS state,
        parsed.country AS country,
        MAX(${companies.lat}) AS lat,
        MAX(${companies.lng}) AS lng,
        count(distinct parsed.job_id)::int AS job_count,
        count(distinct lower(trim(parsed.company_name)))::int AS company_count,
        round(percentile_cont(0.5) within group (
          order by case
            when parsed.yearly_min_salary between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
              and (
                parsed.yearly_max_salary is null
                or (
                  parsed.yearly_max_salary between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                  and parsed.yearly_max_salary >= parsed.yearly_min_salary
                )
              )
            then parsed.yearly_min_salary
          end
        ))::int AS median_salary,
        round(percentile_cont(0.5) within group (
          order by case
            when parsed.yearly_min_salary between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
              and (
                parsed.yearly_max_salary is null
                or (
                  parsed.yearly_max_salary between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                  and parsed.yearly_max_salary >= parsed.yearly_min_salary
                )
              )
            then parsed.yearly_min_salary
          end
        ))::int AS avg_salary,
        (
          count(*) FILTER (
            WHERE LOWER(COALESCE(parsed.remote_allowed::text, '')) IN ('1', '1.0', 'true', 't')
          )::float / NULLIF(count(*), 0)
        ) AS remote_ratio
      FROM parsed
      LEFT JOIN ${companies}
        ON LOWER(TRIM(${companies.name})) = LOWER(TRIM(parsed.company_name))
      GROUP BY parsed.city, parsed.state, parsed.country
    ),
    filtered AS (
      SELECT *
      FROM base
      WHERE ${whereClause}
    ),
    paged AS (
      SELECT *
      FROM filtered
      ORDER BY ${orderByClause}
      LIMIT ${safeLimit}
      OFFSET ${offset}
    )
    SELECT
      p.city,
      p.state,
      p.country,
      p.lat,
      p.lng,
      p.job_count,
      p.company_count,
      p.median_salary,
      p.avg_salary,
      p.remote_ratio,
      (SELECT count(*)::int FROM filtered) AS total_count,
      (SELECT coalesce(sum(job_count), 0)::int FROM filtered) AS total_jobs
    FROM paged p
  `);

  const rows = result.rows;

  return {
    items: rows.map((row) => ({
      location: row.city,
      city: row.city,
      state: row.state,
      country: row.country,
      lat: row.lat,
      lng: row.lng,
      jobCount: Number(row.job_count || 0),
      companyCount: Number(row.company_count || 0),
      medianSalary: row.median_salary ? Number(row.median_salary) : 0,
      avgSalary: row.avg_salary ? Number(row.avg_salary) : 0,
      remoteRatio: row.remote_ratio ? Number(row.remote_ratio) : 0,
    })),
    total: Number(rows[0]?.total_count ?? 0),
    totalJobs: Number(rows[0]?.total_jobs ?? 0),
  };
}

/**
 * Get detailed stats for a specific location
 */

/**
 * Get jobs by country for choropleth map
 */
export async function getJobsByCountry() {
  // Uses postings.country directly for better coverage
  // Uses calculated salary from yearly_min/max for consistency
  return await db
    .select({
      country: postings.country,
      jobCount: sql<number>`count(distinct ${postings.job_id})::int`.as('job_count'),
      medianSalary: sql<number>`round(percentile_cont(0.5) within group (
        order by case
          when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
            and (
              ${postings.yearly_max_salary} is null
              or (
                ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                and ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
              )
            )
          then ${postings.yearly_min_salary}
        end
      ))::int`.as('median_salary'),
      avgSalary: sql<number>`round(percentile_cont(0.5) within group (
        order by case
          when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
            and (
              ${postings.yearly_max_salary} is null
              or (
                ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                and ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
              )
            )
          then ${postings.yearly_min_salary}
        end
      ))::int`.as('avg_salary'),
      cities: sql<string[]>`array_agg(distinct ${postings.location})`.as('cities'),
    })
    .from(postings)
    .where(
      and(
        isNotNull(postings.country),
        sql`${postings.country} != ''`
      )
    )
    .groupBy(postings.country)
    .orderBy(desc(sql`count(distinct ${postings.job_id})`));
}

/**
 * Get detailed stats for a specific location
 */
export async function getLocationStats(locationSlug: string) {
  const result = await db
    .select({
      location: postings.location,
      city: companies.city,
      state: companies.state,
      country: companies.country,
      totalJobs: sql<number>`count(distinct ${postings.job_id})`.as("total_jobs"),
      totalCompanies: sql<number>`count(distinct ${postings.company_id})`.as("total_companies"),
      medianMinSalary: sql<number>`percentile_cont(0.5) within group (
        order by case when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX} then ${postings.yearly_min_salary} end
      )`.as("median_min_salary"),
      medianMaxSalary: sql<number>`percentile_cont(0.5) within group (
        order by case when ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX} then ${postings.yearly_max_salary} end
      )`.as("median_max_salary"),
      medianSalary: sql<number>`round(percentile_cont(0.5) within group (
        order by case
          when ${postings.yearly_med_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
            then ${postings.yearly_med_salary}
          when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
            then ${postings.yearly_min_salary}
        end
      ))`.as("median_salary"),
      avgMinSalary: sql<number>`percentile_cont(0.5) within group (
        order by case when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX} then ${postings.yearly_min_salary} end
      )`.as("avg_min_salary"),
      avgMaxSalary: sql<number>`percentile_cont(0.5) within group (
        order by case when ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX} then ${postings.yearly_max_salary} end
      )`.as("avg_max_salary"),
      avgMedSalary: sql<number>`round(percentile_cont(0.5) within group (
        order by case
          when ${postings.yearly_med_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
            then ${postings.yearly_med_salary}
          when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
            then ${postings.yearly_min_salary}
        end
      ))`.as("avg_med_salary"),
      remoteJobs: sql<number>`count(*) filter (where ${isRemoteAllowed(postings.remote_allowed)})`.as("remote_jobs"),
      totalViews: sql<number>`sum(CAST(round(CAST(COALESCE(NULLIF(${postings.views}, ''), '0') AS numeric)) AS bigint))`.as("total_views"),
      totalApplies: sql<number>`sum(CAST(round(CAST(COALESCE(NULLIF(${postings.applies}, ''), '0') AS numeric)) AS bigint))`.as("total_applies"),
    })
    .from(postings)
    .leftJoin(companies, sql`LOWER(TRIM(${companies.name})) = LOWER(TRIM(${postings.company_name}))`)
    .where(
      sql`lower(regexp_replace(${postings.location}, '[^a-zA-Z0-9]+', '-', 'g')) = lower(regexp_replace(${locationSlug}, '[^a-zA-Z0-9]+', '-', 'g'))`
    )
    .groupBy(postings.location, companies.city, companies.state, companies.country);

  return result[0] || null;
}

/**
 * Get top skills for a specific location
 */
export async function getTopSkillsByLocation(locationSlug: string, limit = 15) {
  return await db
    .select({
      skillName: skills.skill_name,
      skillAbr: skills.skill_abr,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(job_skills)
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .where(
      sql`lower(regexp_replace(${postings.location}, '[^a-zA-Z0-9]+', '-', 'g')) = lower(regexp_replace(${locationSlug}, '[^a-zA-Z0-9]+', '-', 'g'))`
    )
    .groupBy(skills.skill_name, skills.skill_abr)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

/**
 * Get top companies hiring in a specific location
 */
export async function getTopCompaniesByLocation(locationSlug: string, limit = 10) {
  return await db
    .select({
      companyName: companies.name,
      companyId: companies.company_id,
      jobCount: sql<number>`count(*)`.as('job_count'),
      description: companies.description,
      companySize: companies.company_size,
    })
    .from(postings)
    .innerJoin(companies, sql`LOWER(TRIM(${companies.name})) = LOWER(TRIM(${postings.company_name}))`)
    .where(
      sql`lower(regexp_replace(${postings.location}, '[^a-zA-Z0-9]+', '-', 'g')) = lower(regexp_replace(${locationSlug}, '[^a-zA-Z0-9]+', '-', 'g'))`
    )
    .groupBy(
      companies.name,
      companies.company_id,
      companies.description,
      companies.company_size
    )
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

/**
 * Get recent postings for a location
 */
export async function getRecentJobsByLocation(locationSlug: string, limit = 20) {
  return await db
    .select({
      jobId: postings.job_id,
      title: postings.title,
      companyName: postings.company_name,
      location: postings.location,
      salaryMin: postings.yearly_min_salary,
      salaryMax: postings.yearly_max_salary,
      listedTime: postings.listed_time,
      remoteAllowed: postings.remote_allowed,
      experienceLevel: postings.formatted_experience_level,
      jobPostingUrl: postings.job_posting_url,
    })
    .from(postings)
    .where(
      sql`lower(regexp_replace(${postings.location}, '[^a-zA-Z0-9]+', '-', 'g')) = lower(regexp_replace(${locationSlug}, '[^a-zA-Z0-9]+', '-', 'g'))`
    )
    .orderBy(desc(postings.listed_time))
    .limit(limit);
}

// ===========================
// Trending Skills with Growth Analysis (Max-Date Anchored)
// ===========================

export async function getTrendingSkills(
  timeframeDays: number = 30,
  limit: number = 10,
  sortBy: 'demand' | 'salary' = 'demand'
) {
  const days = normalizeTimeframeDays(timeframeDays);
  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), 100)
    : 10;
  const safeSortBy = sortBy === 'salary' ? 'salary' : 'demand';

  const { startDate, endDate, previousStartDate, previousEndDate, comparisonMode } =
    await getComparisonDateRange(days);
  const isComparable = comparisonMode === 'contiguous';

  const orderByClause =
    isComparable
      ? safeSortBy === 'salary'
        ? sql.raw('salary_change DESC, growth_percentage DESC, current_count DESC')
        : sql.raw('growth_percentage DESC, current_count DESC, salary_change DESC')
      : safeSortBy === 'salary'
        ? sql.raw('current_salary DESC, current_count DESC')
        : sql.raw('current_count DESC, current_salary DESC');

  const result = await db.execute<{
    name: string;
    current_count: number;
    previous_count: number;
    current_salary: number;
    previous_salary: number;
    growth_percentage: number;
    salary_change: number;
    trend_status: 'breakout' | 'rising' | 'falling';
    comparison_mode: TrendComparisonMode;
  }>(sql`
    WITH current_period AS (
      SELECT 
        s.skill_name as name,
        COUNT(*)::int as count,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY CASE WHEN p.yearly_min_salary BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX} THEN p.yearly_min_salary END
        ), 0)::float as median_salary
      FROM "skills" s
      INNER JOIN "job_skills" js ON s.skill_abr = js.skill_abr
      INNER JOIN "postings" p ON js.job_id = p.job_id
      WHERE p.listed_time >= ${startDate.toISOString()}::timestamp
        AND p.listed_time <= ${endDate.toISOString()}::timestamp
      GROUP BY s.skill_name
      HAVING COUNT(*) > 0
    ),
    previous_period AS (
      SELECT 
        s.skill_name as name,
        COUNT(*)::int as count,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY CASE WHEN p.yearly_min_salary BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX} THEN p.yearly_min_salary END
        ), 0)::float as median_salary
      FROM "skills" s
      INNER JOIN "job_skills" js ON s.skill_abr = js.skill_abr
      INNER JOIN "postings" p ON js.job_id = p.job_id
      WHERE p.listed_time >= ${previousStartDate.toISOString()}::timestamp
        AND p.listed_time < ${previousEndDate.toISOString()}::timestamp
      GROUP BY s.skill_name
    )
    SELECT 
      c.name,
      c.count as current_count,
      COALESCE(p.count, 0)::int as previous_count,
      c.median_salary as current_salary,
      COALESCE(p.median_salary, 0)::float as previous_salary,
      CASE 
        WHEN ${isComparable} = false THEN 0.0
        WHEN COALESCE(p.count, 0) = 0 THEN 100.0
        ELSE ROUND(((c.count - COALESCE(p.count, 0))::float / GREATEST(p.count, 1)::float * 100)::numeric, 1)
      END as growth_percentage,
      ROUND((c.median_salary - COALESCE(p.median_salary, 0))::numeric, 0) as salary_change,
      CASE
        WHEN ${isComparable} = false AND c.count > COALESCE(p.count, 0) THEN 'rising'
        WHEN ${isComparable} = false THEN 'falling'
        WHEN COALESCE(p.count, 0) = 0 AND c.count > 10 THEN 'breakout'
        WHEN c.count > COALESCE(p.count, 0) THEN 'rising'
        ELSE 'falling'
      END as trend_status,
      ${comparisonMode}::text as comparison_mode
    FROM current_period c
    LEFT JOIN previous_period p ON c.name = p.name
    ORDER BY ${orderByClause}
    LIMIT ${safeLimit}
  `);

  return result.rows;
}

function getSkillCategorySql() {
  const caseClauses = SKILL_CATEGORY_RULES.flatMap((rule) =>
    rule.keywords.map((keyword) =>
      sql`WHEN lower(${skills.skill_name}) LIKE ${`%${keyword}%`} THEN ${rule.category}`
    )
  );

  return sql<string>`CASE ${sql.join(caseClauses, sql.raw(' '))} ELSE ${DEFAULT_SKILL_CATEGORY} END`;
}

// ===========================
// Trending Stats Overview (Max-Date Anchored)
// ===========================

export async function getTrendingStats(timeframe: number = 30) {
  const days = normalizeTimeframeDays(timeframe);
  const { startDate, endDate, previousStartDate, previousEndDate, comparisonMode } =
    await getComparisonDateRange(days);
  const isComparable = comparisonMode === 'contiguous';

  const result = await db.execute<{
    top_gainer: string | null;
    top_gainer_growth: number | null;
    avg_growth: number | null;
    highest_salary_jump: string | null;
    highest_salary_increase: number | null;
    new_entries: number | null;
    max_date: string | null;
  }>(sql`
    WITH current_period AS (
      SELECT 
        s.skill_name as name,
        COUNT(*)::int as count,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY CASE WHEN p.yearly_min_salary BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX} THEN p.yearly_min_salary END
        ), 0)::float as median_salary
      FROM "skills" s
      INNER JOIN "job_skills" js ON s.skill_abr = js.skill_abr
      INNER JOIN "postings" p ON js.job_id = p.job_id
      WHERE p.listed_time >= ${startDate.toISOString()}::timestamp
        AND p.listed_time <= ${endDate.toISOString()}::timestamp
      GROUP BY s.skill_name
      HAVING COUNT(*) > 0
    ),
    previous_period AS (
      SELECT 
        s.skill_name as name,
        COUNT(*)::int as count,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY CASE WHEN p.yearly_min_salary BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX} THEN p.yearly_min_salary END
        ), 0)::float as median_salary
      FROM "skills" s
      INNER JOIN "job_skills" js ON s.skill_abr = js.skill_abr
      INNER JOIN "postings" p ON js.job_id = p.job_id
      WHERE p.listed_time >= ${previousStartDate.toISOString()}::timestamp
        AND p.listed_time < ${previousEndDate.toISOString()}::timestamp
      GROUP BY s.skill_name
    ),
    growth_data AS (
      SELECT 
        c.name,
        c.count as current_count,
        COALESCE(p.count, 0) as previous_count,
        c.median_salary as current_salary,
        COALESCE(p.median_salary, 0) as previous_salary,
        CASE 
          WHEN COALESCE(p.count, 0) = 0 THEN 100.0
          ELSE ROUND(((c.count - COALESCE(p.count, 0))::float / GREATEST(p.count, 1)::float * 100)::numeric, 1)
        END as growth_percentage,
        ROUND((c.median_salary - COALESCE(p.median_salary, 0))::numeric, 0) as salary_change
      FROM current_period c
      LEFT JOIN previous_period p ON c.name = p.name
    )
    SELECT 
      (SELECT name FROM growth_data ORDER BY growth_percentage DESC LIMIT 1) as top_gainer,
      (SELECT growth_percentage FROM growth_data ORDER BY growth_percentage DESC LIMIT 1) as top_gainer_growth,
      COALESCE((SELECT AVG(growth_percentage) FROM growth_data WHERE growth_percentage > 0), 0)::float as avg_growth,
      (SELECT name FROM growth_data ORDER BY salary_change DESC LIMIT 1) as highest_salary_jump,
      COALESCE((SELECT salary_change FROM growth_data ORDER BY salary_change DESC LIMIT 1), 0) as highest_salary_increase,
      (SELECT COUNT(*) FROM growth_data WHERE previous_count = 0)::int as new_entries,
      ${endDate.toISOString().slice(0, 10)} as max_date
  `);

  const row = result.rows[0];
  const previousEndDisplay = new Date(previousEndDate.getTime() - 1);

  return {
    topGainer: isComparable ? row?.top_gainer ?? 'No Data' : 'N/A',
    topGainerGrowth: isComparable ? Number(row?.top_gainer_growth ?? 0) : 0,
    avgGrowth: isComparable ? Number(row?.avg_growth ?? 0) : 0,
    highestSalaryJump: row?.highest_salary_jump ?? 'No Data',
    highestSalaryIncrease: Number(row?.highest_salary_increase ?? 0),
    newEntries: Number(row?.new_entries ?? 0),
    dataAsOf: row?.max_date ?? 'N/A',
    comparisonMode,
    comparisonWindow: {
      currentStart: startDate.toISOString().slice(0, 10),
      currentEnd: endDate.toISOString().slice(0, 10),
      previousStart: previousStartDate.toISOString().slice(0, 10),
      previousEnd: previousEndDisplay.toISOString().slice(0, 10),
    },
  };
}

export async function getSourceCountrySegmentation(
  timeframeDays: number = 30,
  sourceLimit: number = 6,
  countryLimit: number = 8,
) {
  const days = normalizeTimeframeDays(timeframeDays);
  const { startDate, endDate } = await getMostRecentDateRange(days);

  const safeSourceLimit = Number.isFinite(sourceLimit)
    ? Math.min(Math.max(Math.floor(sourceLimit), 1), 20)
    : 6;
  const safeCountryLimit = Number.isFinite(countryLimit)
    ? Math.min(Math.max(Math.floor(countryLimit), 1), 20)
    : 8;

  const [sourceResult, countryResult, totalsResult] = await Promise.all([
    db.execute<{
      source: string;
      posting_count: number;
      share_pct: number;
      median_salary: number;
    }>(sql`
      SELECT
        COALESCE(NULLIF(LOWER(TRIM(${postings.source})), ''), 'unknown') AS source,
        COUNT(*)::int AS posting_count,
        ROUND((COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0)) * 100, 1)::float AS share_pct,
        COALESCE(
          ROUND(
            PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY CASE
                WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
                  AND (
                    ${postings.yearly_max_salary} IS NULL
                    OR (
                      ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
                      AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
                    )
                  )
                THEN ${postings.yearly_min_salary}
              END
            )
          )::int,
          0
        ) AS median_salary
      FROM ${postings}
      WHERE ${postings.listed_time} >= ${startDate.toISOString()}::timestamp
        AND ${postings.listed_time} <= ${endDate.toISOString()}::timestamp
      GROUP BY 1
      ORDER BY posting_count DESC
      LIMIT ${safeSourceLimit}
    `),
    db.execute<{
      country: string;
      posting_count: number;
      share_pct: number;
      median_salary: number;
    }>(sql`
      SELECT
        COALESCE(NULLIF(UPPER(TRIM(${postings.country})), ''), 'UNKNOWN') AS country,
        COUNT(*)::int AS posting_count,
        ROUND((COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0)) * 100, 1)::float AS share_pct,
        COALESCE(
          ROUND(
            PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY CASE
                WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
                  AND (
                    ${postings.yearly_max_salary} IS NULL
                    OR (
                      ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
                      AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
                    )
                  )
                THEN ${postings.yearly_min_salary}
              END
            )
          )::int,
          0
        ) AS median_salary
      FROM ${postings}
      WHERE ${postings.listed_time} >= ${startDate.toISOString()}::timestamp
        AND ${postings.listed_time} <= ${endDate.toISOString()}::timestamp
      GROUP BY 1
      ORDER BY posting_count DESC
      LIMIT ${safeCountryLimit}
    `),
    db.execute<{ total_postings: number }>(sql`
      SELECT COUNT(*)::int AS total_postings
      FROM ${postings}
      WHERE ${postings.listed_time} >= ${startDate.toISOString()}::timestamp
        AND ${postings.listed_time} <= ${endDate.toISOString()}::timestamp
    `),
  ]);

  return {
    sourceBreakdown: sourceResult.rows.map((row) => ({
      source: row.source,
      postingCount: Number(row.posting_count ?? 0),
      sharePct: Number(row.share_pct ?? 0),
      medianSalary: Number(row.median_salary ?? 0),
    })),
    countryBreakdown: countryResult.rows.map((row) => ({
      country: row.country,
      postingCount: Number(row.posting_count ?? 0),
      sharePct: Number(row.share_pct ?? 0),
      medianSalary: Number(row.median_salary ?? 0),
    })),
    totalPostings: Number(totalsResult.rows[0]?.total_postings ?? 0),
    window: {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    },
  };
}

// ===========================
// Role Analytics Queries
// ===========================

export async function getAverageSalary(
  filters?: { location?: string; experience?: string[]; minSalary?: number; q?: string }
) {
  return getMedianSalary(filters);
}

export async function getMedianSalary(
  filters?: { location?: string; experience?: string[]; minSalary?: number; q?: string }
) {
  const conditions = [];

  conditions.push(sql`${postings.yearly_min_salary} IS NOT NULL`);
  conditions.push(
    sql`${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}`
  );
  conditions.push(
    sql`(
      ${postings.yearly_max_salary} IS NULL
      OR (
        ${postings.yearly_max_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
        AND ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
      )
    )`
  );

  if (filters?.location) {
    conditions.push(sql`LOWER(${postings.location}) LIKE ${`%${filters.location.toLowerCase()}%`}`);
  }

  if (filters?.experience && filters.experience.length > 0) {
    conditions.push(inArray(postings.formatted_experience_level, filters.experience));
  }

  if (filters?.minSalary && filters.minSalary > 0) {
    conditions.push(gte(postings.yearly_min_salary, filters.minSalary));
  }

  if (filters?.q) {
    conditions.push(
      sql`(
        LOWER(${postings.title}) LIKE ${`%${filters.q.toLowerCase()}%`}
        OR LOWER(${roleAliases.canonical_name}) LIKE ${`%${filters.q.toLowerCase()}%`}
      )`
    );
  }

  const query = db
    .select({
      median_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary})`,
    })
    .from(postings)
    .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`);

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  const result = await query;
  return Number(result[0]?.median_salary || 0);
}

export async function getTopLocation(
  filters?: { location?: string; experience?: string[]; minSalary?: number; q?: string }
) {
  const conditions = [];

  if (filters?.location) {
    conditions.push(sql`LOWER(${postings.location}) LIKE ${`%${filters.location.toLowerCase()}%`}`);
  }

  if (filters?.experience && filters.experience.length > 0) {
    conditions.push(inArray(postings.formatted_experience_level, filters.experience));
  }

  if (filters?.minSalary && filters.minSalary > 0) {
    conditions.push(gte(postings.yearly_min_salary, filters.minSalary));
  }

  if (filters?.q) {
    conditions.push(
      sql`(
        LOWER(${postings.title}) LIKE ${`%${filters.q.toLowerCase()}%`}
        OR LOWER(${roleAliases.canonical_name}) LIKE ${`%${filters.q.toLowerCase()}%`}
      )`
    );
  }

  const query = db
    .select({
      location: postings.location,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(postings)
    .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`)
    .where(and(isNotNull(postings.location), ...(conditions.length > 0 ? conditions : [])))
    .groupBy(postings.location)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(1);

  const result = await query;
  return result[0] || { location: 'N/A', count: 0 };
}

export async function getRemotePercentage(
  filters?: { location?: string; experience?: string[]; minSalary?: number; q?: string }
) {
  const conditions = [];

  if (filters?.location) {
    conditions.push(sql`LOWER(${postings.location}) LIKE ${`%${filters.location.toLowerCase()}%`}`);
  }

  if (filters?.experience && filters.experience.length > 0) {
    conditions.push(inArray(postings.formatted_experience_level, filters.experience));
  }

  if (filters?.minSalary && filters.minSalary > 0) {
    conditions.push(gte(postings.yearly_min_salary, filters.minSalary));
  }

  if (filters?.q) {
    conditions.push(
      sql`(
        LOWER(${postings.title}) LIKE ${`%${filters.q.toLowerCase()}%`}
        OR LOWER(${roleAliases.canonical_name}) LIKE ${`%${filters.q.toLowerCase()}%`}
      )`
    );
  }

  const query = db.execute<{ total: number; remote: number }>(sql`
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (
        WHERE LOWER(COALESCE(p.remote_allowed::text, '')) IN ('1', '1.0', 'true', 't')
      )::int as remote
    FROM ${postings} p
    LEFT JOIN ${roleAliases} ra ON LOWER(p.title) = LOWER(ra.alias)
    ${conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``}
  `);

  const result = await query;
  const stats = result.rows[0];
  if (!stats || stats.total === 0) return 0;
  return Math.round((stats.remote / stats.total) * 100);
}

export async function getRoleDistribution(
  limit = 10,
  filters?: { location?: string; experience?: string[]; minSalary?: number; q?: string }
) {
  const conditions = [];

  if (filters?.location) {
    conditions.push(sql`LOWER(${postings.location}) LIKE ${`%${filters.location.toLowerCase()}%`}`);
  }

  if (filters?.experience && filters.experience.length > 0) {
    conditions.push(inArray(postings.formatted_experience_level, filters.experience));
  }

  if (filters?.minSalary && filters.minSalary > 0) {
    conditions.push(gte(postings.yearly_min_salary, filters.minSalary));
  }

  if (filters?.q) {
    conditions.push(
      sql`(
        LOWER(${postings.title}) LIKE ${`%${filters.q.toLowerCase()}%`}
        OR LOWER(${roleAliases.canonical_name}) LIKE ${`%${filters.q.toLowerCase()}%`}
      )`
    );
  }

  const query = db
    .select({
      title: sql<string>`COALESCE(${roleAliases.canonical_name}, ${postings.title})`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(postings)
    .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`);

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  return await query
    .groupBy(sql`COALESCE(${roleAliases.canonical_name}, ${postings.title})`)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
}

export async function getSkillsFrequency(
  limit = 20,
  filters?: { location?: string; experience?: string[]; minSalary?: number; q?: string }
) {
  const conditions = [];

  if (filters?.location) {
    conditions.push(sql`LOWER(${postings.location}) LIKE ${`%${filters.location.toLowerCase()}%`}`);
  }

  if (filters?.experience && filters.experience.length > 0) {
    conditions.push(inArray(postings.formatted_experience_level, filters.experience));
  }

  if (filters?.minSalary && filters.minSalary > 0) {
    conditions.push(gte(postings.yearly_min_salary, filters.minSalary));
  }

  if (filters?.q) {
    conditions.push(
      sql`(
        LOWER(${postings.title}) LIKE ${`%${filters.q.toLowerCase()}%`}
        OR LOWER(${roleAliases.canonical_name}) LIKE ${`%${filters.q.toLowerCase()}%`}
      )`
    );
  }

  const query = db
    .select({
      skill_name: skills.skill_name,
      skill_abr: skills.skill_abr,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(skills)
    .innerJoin(job_skills, eq(skills.skill_abr, job_skills.skill_abr))
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`);

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  return await query
    .groupBy(skills.skill_name, skills.skill_abr)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
}

export async function getPostingTimeline(
  days = 90,
  filters?: { location?: string; experience?: string[]; minSalary?: number; q?: string }
) {
  const conditions = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  conditions.push(sql`${postings.listed_time} >= ${cutoffDate.toISOString()}::timestamp`);

  if (filters?.location) {
    conditions.push(sql`LOWER(${postings.location}) LIKE ${`%${filters.location.toLowerCase()}%`}`);
  }

  if (filters?.experience && filters.experience.length > 0) {
    conditions.push(inArray(postings.formatted_experience_level, filters.experience));
  }

  if (filters?.minSalary && filters.minSalary > 0) {
    conditions.push(gte(postings.yearly_min_salary, filters.minSalary));
  }

  if (filters?.q) {
    conditions.push(
      sql`(
        LOWER(${postings.title}) LIKE ${`%${filters.q.toLowerCase()}%`}
        OR LOWER(${roleAliases.canonical_name}) LIKE ${`%${filters.q.toLowerCase()}%`}
      )`
    );
  }

  return await db
    .select({
      week: sql<string>`TO_CHAR(DATE_TRUNC('week', ${postings.listed_time}), 'YYYY-MM-DD')`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(postings)
    .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`)
    .where(and(...conditions))
    .groupBy(sql`DATE_TRUNC('week', ${postings.listed_time})`)
    .orderBy(sql`DATE_TRUNC('week', ${postings.listed_time}) ASC`);
}

export async function getExperienceDistribution(
  filters?: { location?: string; experience?: string[]; minSalary?: number; q?: string }
) {
  const conditions = [];

  if (filters?.location) {
    conditions.push(sql`LOWER(${postings.location}) LIKE ${`%${filters.location.toLowerCase()}%`}`);
  }

  if (filters?.experience && filters.experience.length > 0) {
    conditions.push(inArray(postings.formatted_experience_level, filters.experience));
  }

  if (filters?.minSalary && filters.minSalary > 0) {
    conditions.push(gte(postings.yearly_min_salary, filters.minSalary));
  }

  if (filters?.q) {
    conditions.push(
      sql`(
        LOWER(${postings.title}) LIKE ${`%${filters.q.toLowerCase()}%`}
        OR LOWER(${roleAliases.canonical_name}) LIKE ${`%${filters.q.toLowerCase()}%`}
      )`
    );
  }

  const query = db
    .select({
      level: postings.formatted_experience_level,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(postings)
    .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`)
    .where(and(isNotNull(postings.formatted_experience_level), ...(conditions.length > 0 ? conditions : [])))
    .groupBy(postings.formatted_experience_level)
    .orderBy(desc(sql`COUNT(*)`));

  return await query;
}

// ===========================
// Home Page Analytics Queries
// ===========================

export async function getTotalStats() {
  const result = await db.execute<{
    total_jobs: number;
    avg_salary: number;
    median_salary: number;
    salary_sample_size: number;
    total_companies: number;
    total_skills: number;
  }>(sql`
    WITH salary_data AS (
      SELECT p.yearly_min_salary
      FROM "postings" p
      WHERE ${validAnnualSalaryFilter("p")}
    )
    SELECT
      (SELECT COUNT(*)::int FROM "postings") as total_jobs,
      (SELECT ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY yearly_min_salary))::int FROM salary_data) as median_salary,
      (SELECT COUNT(*)::int FROM salary_data) as salary_sample_size,
      (SELECT ROUND(AVG(yearly_min_salary))::int FROM salary_data) as avg_salary,
      (SELECT COUNT(DISTINCT company_id)::int FROM "companies") as total_companies,
      (SELECT COUNT(*)::int FROM "skills") as total_skills
  `);

  const stats = result.rows[0];
  
  // Calculate monthly growth (last 30 days vs previous 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const growthResult = await db.execute<{ current: number; previous: number }>(sql`
    SELECT 
      -- Now that listed_time is a TIMESTAMP, compare it directly
      COUNT(*) FILTER (WHERE listed_time >= ${thirtyDaysAgo.toISOString()}::timestamp)::int as current,
      COUNT(*) FILTER (WHERE listed_time >= ${sixtyDaysAgo.toISOString()}::timestamp 
                         AND listed_time < ${thirtyDaysAgo.toISOString()}::timestamp)::int as previous
    FROM "postings"
  `);

  const growth = growthResult.rows[0];
  const monthlyGrowth = (growth?.previous ?? 0) > 0 
    ? Math.round(((growth.current - growth.previous) / growth.previous) * 100)
    : 0;

  return {
    totalJobs: Number(stats?.total_jobs ?? 0) || 0,
    medianSalary: Number(stats?.median_salary ?? 0) || 0,
    avgSalary: Number(stats?.median_salary ?? stats?.avg_salary ?? 0) || 0,
    salarySampleSize: Number(stats?.salary_sample_size ?? 0) || 0,
    totalCompanies: Number(stats?.total_companies ?? 0) || 0,
    totalSkills: Number(stats?.total_skills ?? 0) || 0,
    monthlyGrowth: Number.isFinite(monthlyGrowth) ? monthlyGrowth : 0,
  };
}

export async function getIndustryBreakdown(limit = 10) {
  return await db
    .select({
      industry_name: industries.industry_name,
      count: sql<number>`COUNT(DISTINCT ${postings.job_id})::int`,
    })
    .from(industries)
    .innerJoin(job_industries, eq(industries.industry_id, job_industries.industry_id))
    .innerJoin(postings, eq(job_industries.job_id, postings.job_id))
    .groupBy(industries.industry_name)
    .orderBy(desc(sql`COUNT(DISTINCT ${postings.job_id})`))
    .limit(limit);
}

export async function getTopHiringCompanies(limit = 6) {
  const result = await db.execute<{
    company_name: string;
    open_positions: number;
    median_salary: number;
    avg_salary: number;
    top_skills: string;
  }>(sql`
    WITH company_stats AS (
      SELECT 
        p.company_name,
        COUNT(DISTINCT p.job_id)::int as open_positions,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.yearly_min_salary))::int as median_salary
      FROM ${postings} p
      WHERE p.company_name IS NOT NULL
        AND ${validAnnualSalaryFilter("p")}
      GROUP BY p.company_name
      ORDER BY open_positions DESC
      LIMIT ${limit}
    ),
    company_skills AS (
      SELECT 
        p.company_name,
        s.skill_name,
        COUNT(*)::int as skill_count,
        ROW_NUMBER() OVER (PARTITION BY p.company_name ORDER BY COUNT(*) DESC) as rn
      FROM ${postings} p
      INNER JOIN ${job_skills} js ON p.job_id = js.job_id
      INNER JOIN ${skills} s ON js.skill_abr = s.skill_abr
      WHERE p.company_name IN (SELECT company_name FROM company_stats)
      GROUP BY p.company_name, s.skill_name
    )
    SELECT 
      cs.company_name,
      cs.open_positions,
      cs.median_salary,
      cs.median_salary as avg_salary,
      STRING_AGG(csk.skill_name, '|' ORDER BY csk.skill_count DESC) FILTER (WHERE csk.rn <= 3) as top_skills
    FROM company_stats cs
    LEFT JOIN company_skills csk ON cs.company_name = csk.company_name AND csk.rn <= 3
    GROUP BY cs.company_name, cs.open_positions, cs.median_salary
    ORDER BY cs.open_positions DESC
  `);

  return result.rows.map(row => ({
    company_name: row.company_name,
    open_positions: Number(row.open_positions),
    median_salary: Number(row.median_salary),
    avg_salary: Number(row.avg_salary),
    top_skills: row.top_skills ? row.top_skills.split('|') : [],
  }));
}

export async function getSalaryInsights() {
  const result = await db.execute<{
    highest_role: string;
    highest_salary: number;
    lowest_role: string;
    lowest_salary: number;
    median_salary: number;
    min_salary: number;
    max_salary: number;
  }>(sql`
    WITH salary_data AS (
      SELECT 
        COALESCE(ra.canonical_name, p.title) as role,
        p.yearly_min_salary as salary
      FROM ${postings} p
      LEFT JOIN ${roleAliases} ra ON LOWER(p.title) = LOWER(ra.alias)
      WHERE ${validAnnualSalaryFilter("p")}
    ),
    highest AS (
      SELECT role, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary)::int as median_salary
      FROM salary_data
      GROUP BY role
      ORDER BY median_salary DESC
      LIMIT 1
    ),
    lowest AS (
      SELECT role, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary)::int as median_salary
      FROM salary_data
      GROUP BY role
      HAVING COUNT(*) > 10
      ORDER BY median_salary ASC
      LIMIT 1
    )
    SELECT 
      (SELECT role FROM highest) as highest_role,
      (SELECT median_salary FROM highest) as highest_salary,
      (SELECT role FROM lowest) as lowest_role,
      (SELECT median_salary FROM lowest) as lowest_salary,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary)::int as median_salary,
      MIN(salary)::int as min_salary,
      MAX(salary)::int as max_salary
    FROM salary_data
  `);

  const stats = result.rows[0];
  return {
    highestRole: stats.highest_role || 'N/A',
    highestSalary: Number(stats.highest_salary || 0),
    lowestRole: stats.lowest_role || 'N/A',
    lowestSalary: Number(stats.lowest_salary || 0),
    medianSalary: Number(stats.median_salary || 0),
    minSalary: Number(stats.min_salary || 0),
    maxSalary: Number(stats.max_salary || 0),
  };
}

export async function getRecentPostings(limit = 10) {
  return await db
    .select({
      job_id: postings.job_id,
      title: postings.title,
      company_name: postings.company_name,
      location: postings.location,
      min_salary: postings.yearly_min_salary,
      max_salary: postings.yearly_max_salary,
      listed_time: postings.listed_time,
    })
    .from(postings)
    .orderBy(desc(postings.listed_time))
    .limit(limit);
}

// ===========================
// Enhanced Skills Queries for Analytics
// ===========================

export async function getSkillsWithFilters(params: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string[];
  demandMin?: number;
  demandMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  experience?: string[];
  sort?: 'demand' | 'salary' | 'name' | 'trending' | 'growth';
}) {
  const {
    page = 1,
    limit = 24,
    search = "",
    category = [],
    demandMin = 0,
    demandMax = 100000,
    salaryMin = 0,
    salaryMax = 1000000,
    sort = "demand",
  } = params;
  const offset = (page - 1) * limit;
  const skillCategorySql = getSkillCategorySql();

  const conditions = [];

  if (search) {
    conditions.push(ilike(skills.skill_name, `%${search}%`));
  }
  if (category.length > 0) {
    conditions.push(
      sql`${skillCategorySql} IN (${sql.join(
        category.map((selected) => sql`${selected}`),
        sql`, `
      )})`
    );
  }

  // Build the base query
  let query = db
    .select({
      name: skills.skill_name,
      count: sql<number>`count(${job_skills.job_id})::int`,
      median_salary: sql<number>`coalesce(
        percentile_cont(0.5) within group (
          order by case
            when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
              and (
                ${postings.yearly_max_salary} is null
                or (
                  ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                  and ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
                )
              )
            then ${postings.yearly_min_salary}
          end
        ),
        0
      )::float`,
      avg_salary: sql<number>`coalesce(
        percentile_cont(0.5) within group (
          order by case
            when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
              and (
                ${postings.yearly_max_salary} is null
                or (
                  ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                  and ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
                )
              )
            then ${postings.yearly_min_salary}
          end
        ),
        0
      )::float`,
    })
    .from(skills)
    .leftJoin(job_skills, eq(skills.skill_abr, job_skills.skill_abr))
    .leftJoin(postings, eq(job_skills.job_id, postings.job_id));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.groupBy(skills.skill_name) as any;

  // Apply HAVING clauses for demand and salary filters
  query = query.having(
    and(
      sql`count(${job_skills.job_id}) >= ${demandMin}`,
      sql`count(${job_skills.job_id}) <= ${demandMax}`,
      sql`coalesce(percentile_cont(0.5) within group (
        order by case
          when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
            and (
              ${postings.yearly_max_salary} is null
              or (
                ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                and ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
              )
            )
          then ${postings.yearly_min_salary}
        end
      ), 0) >= ${salaryMin}`,
      sql`coalesce(percentile_cont(0.5) within group (
        order by case
          when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
            and (
              ${postings.yearly_max_salary} is null
              or (
                ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                and ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
              )
            )
          then ${postings.yearly_min_salary}
        end
      ), 0) <= ${salaryMax}`
    )
  ) as any;

  // Apply sorting
  switch (sort) {
    case "salary":
      query = query.orderBy(desc(sql`coalesce(percentile_cont(0.5) within group (
        order by case
          when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
            and (
              ${postings.yearly_max_salary} is null
              or (
                ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                and ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
              )
            )
          then ${postings.yearly_min_salary}
        end
      ), 0)`)) as any;
      break;
    case "name":
      query = query.orderBy(skills.skill_name) as any;
      break;
    case "demand":
    default:
      query = query.orderBy(desc(sql`count(${job_skills.job_id})`)) as any;
      break;
  }

  query = query.limit(limit).offset(offset) as any;

  return await query;
}

export async function getTrendingSkillsData(params: {
  days?: number;
  minGrowth?: number;
  limit?: number;
}) {
  const { days = 30, minGrowth = 20, limit = 20 } = params;

  // Calculate the date threshold
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - days);

  const twoPeriodsAgo = new Date();
  twoPeriodsAgo.setDate(twoPeriodsAgo.getDate() - days * 2);

  // Get recent period skill counts
  const recentCounts = await db
    .select({
      skill_name: skills.skill_name,
      count: sql<number>`count(*)::int`,
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(gte(postings.listed_time, daysAgo))
    .groupBy(skills.skill_name);

  // Get previous period skill counts
  const previousCounts = await db
    .select({
      skill_name: skills.skill_name,
      count: sql<number>`count(*)::int`,
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(and(gte(postings.listed_time, twoPeriodsAgo), lt(postings.listed_time, daysAgo)))
    .groupBy(skills.skill_name);

  // Calculate growth
  const skillGrowth = recentCounts.map((recent) => {
    const previous = previousCounts.find((p) => p.skill_name === recent.skill_name);
    const prevCount = previous?.count || 0;
    const recentCount = recent.count;
    const growth =
      prevCount > 0 ? ((recentCount - prevCount) / prevCount) * 100 : 100;

    return {
      skill_name: recent.skill_name,
      recent_count: recentCount,
      previous_count: prevCount,
      growth_percentage: Math.round(growth * 10) / 10,
    };
  });

  // Filter by minimum growth and sort
  return skillGrowth
    .filter((s) => s.growth_percentage >= minGrowth)
    .sort((a, b) => b.growth_percentage - a.growth_percentage)
    .slice(0, limit);
}

export async function getHighPayingSkills(params: {
  minSalary?: number;
  limit?: number;
}) {
  const { minSalary = 120000, limit = 20 } = params;

  return await db
    .select({
      name: skills.skill_name,
      count: sql<number>`count(*)::int`,
      avg_salary: sql<number>`coalesce(avg(${postings.yearly_min_salary}), 0)::float`,
    })
    .from(skills)
    .leftJoin(job_skills, eq(skills.skill_abr, job_skills.skill_abr))
    .leftJoin(postings, eq(job_skills.job_id, postings.job_id))
    .groupBy(skills.skill_name)
    .having(sql`coalesce(avg(${postings.yearly_min_salary}), 0) >= ${minSalary}`)
    .orderBy(desc(sql`coalesce(avg(${postings.yearly_min_salary}), 0)`))
    .limit(limit);
}

export async function getEmergingSkills(limit = 20) {
  // Skills tagged as emerging tech (AI/ML, blockchain, quantum, etc.)
  const emergingKeywords = [
    '%AI%',
    '%Machine Learning%',
    '%Deep Learning%',
    '%Neural Network%',
    '%TensorFlow%',
    '%PyTorch%',
    '%Blockchain%',
    '%Quantum%',
    '%GPT%',
    '%LLM%',
    '%Transformer%',
    '%Diffusion%',
    '%Stable Diffusion%',
    '%Langchain%',
    '%Vector Database%',
    '%Web3%',
    '%Cryptocurrency%',
  ];

  // Build OR conditions for ILIKE
  const conditions = emergingKeywords.map((keyword) =>
    ilike(skills.skill_name, keyword)
  );

  return await db
    .select({
      name: skills.skill_name,
      count: sql<number>`count(*)::int`,
      avg_salary: sql<number>`coalesce(avg(${postings.yearly_min_salary}), 0)::float`,
    })
    .from(skills)
    .leftJoin(job_skills, eq(skills.skill_abr, job_skills.skill_abr))
    .leftJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(sql`(${sql.join(conditions, sql.raw(' OR '))})`)
    .groupBy(skills.skill_name)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

export async function getSkillGrowthStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Get recent 30 days
  const recentSkills = await db
    .select({
      skill_name: skills.skill_name,
      count: sql<number>`count(*)::int`,
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(gte(postings.listed_time, thirtyDaysAgo))
    .groupBy(skills.skill_name);

  // Get 30-60 days ago
  const previousSkills = await db
    .select({
      skill_name: skills.skill_name,
      count: sql<number>`count(*)::int`,
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(and(gte(postings.listed_time, sixtyDaysAgo), lt(postings.listed_time, thirtyDaysAgo)))
    .groupBy(skills.skill_name);

  // Calculate growth for all skills
  const growthMap = new Map();

  recentSkills.forEach((recent) => {
    const previous = previousSkills.find((p) => p.skill_name === recent.skill_name);
    const prevCount = previous?.count || 0;
    const recentCount = recent.count;
    const growth =
      prevCount > 0 ? ((recentCount - prevCount) / prevCount) * 100 : 100;

    growthMap.set(recent.skill_name, {
      skill_name: recent.skill_name,
      growth_percentage: Math.round(growth * 10) / 10,
      recent_count: recentCount,
      previous_count: prevCount,
    });
  });

  return Array.from(growthMap.values());
}

export async function getSkillTimeline(params: {
  skillNames: string[];
  days?: number;
}) {
  const { skillNames, days = 90 } = params;

  const { startDate: daysAgo } = await getMostRecentDateRange(days);

  return await db
    .select({
      skill_name: skills.skill_name,
      day: sql<string>`date_trunc('day', ${postings.listed_time})::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(
      and(
        sql`${postings.listed_time} >= ${daysAgo.toISOString()}::timestamp`,
        inArray(
          skills.skill_name,
          skillNames.map((n) => n)
        )
      )
    )
    .groupBy(
      skills.skill_name,
      sql`date_trunc('day', ${postings.listed_time})`
    )
    .orderBy(sql`date_trunc('day', ${postings.listed_time}) ASC`);
}

export async function getCategoryDistribution() {
  const categories = await db
    .select({
      skill_name: skills.skill_name,
      count: sql<number>`count(${job_skills.job_id})::int`,
    })
    .from(skills)
    .leftJoin(job_skills, eq(skills.skill_abr, job_skills.skill_abr))
    .where(isNotNull(job_skills.job_id))
    .groupBy(skills.skill_name)
    .orderBy(desc(sql`count(${job_skills.job_id})`));

  const groupedByCategory = new Map<string, number>();

  for (const row of categories) {
    const category = categorizeSkill(row.skill_name);
    const count = Number(row.count);
    groupedByCategory.set(category, (groupedByCategory.get(category) ?? 0) + count);
  }

  const categoryRows = Array.from(groupedByCategory.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const totalDemand = categoryRows.reduce((sum, row) => sum + row.count, 0);

  return categoryRows
    .filter((row) => row.count > 0)
    .map((row) => {
      return {
        category: row.category,
        count: row.count,
        percentage:
          totalDemand > 0 ? Number(((row.count / totalDemand) * 100).toFixed(1)) : 0,
      };
    });
}

export async function getSkillsAdvancedStats() {
  const { startDate: thirtyDaysAgo } = await getMostRecentDateRange(30);

  // Total skills tracked
  const totalSkills = await db
    .select({ count: sql<number>`count(distinct ${skills.skill_name})::int` })
    .from(skills);

  // Average demand (jobs per skill)
const avgDemandData = await db
  .select({
    total_jobs: sql<number>`count(*)::int`,
    unique_skills: sql<number>`count(distinct ${job_skills.skill_abr})::int`,
  })
  .from(job_skills);

const avgDemandValue = avgDemandData[0]?.unique_skills 
  ? Math.round(avgDemandData[0].total_jobs / avgDemandData[0].unique_skills)
  : 0;

  // Median salary across all skills using quality-filtered annual rows
  const medianSalary = await db
    .select({
      median_salary: sql<number>`coalesce(
        percentile_cont(0.5) within group (
          order by case
            when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
              and (
                ${postings.yearly_max_salary} is null
                or (
                  ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                  and ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
                )
              )
            then ${postings.yearly_min_salary}
          end
        ),
        0
      )::float`,
    })
    .from(postings);

  // Most in-demand skill
  const topSkill = await db
    .select({
      name: skills.skill_name,
      count: sql<number>`count(*)::int`,
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .groupBy(skills.skill_name)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  // Skills added this month (approximation based on first appearance)
  const newSkills = await db
    .select({
      count: sql<number>`count(distinct ${skills.skill_name})::int`,
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(
      sql`${postings.listed_time} >= ${thirtyDaysAgo.toISOString()}::timestamp`
    );

  // Fastest growing skill
  const growthStats = await getSkillGrowthStats();
  const fastestGrowing = growthStats.sort(
    (a, b) => b.growth_percentage - a.growth_percentage
  )[0];

  // Highest paid skill
  const highestPaid = await db
    .select({
      name: skills.skill_name,
      median_salary: sql<number>`coalesce(
        percentile_cont(0.5) within group (
          order by case
            when ${postings.yearly_min_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
              and (
                ${postings.yearly_max_salary} is null
                or (
                  ${postings.yearly_max_salary} between ${VALID_ANNUAL_SALARY_MIN} and ${VALID_ANNUAL_SALARY_MAX}
                  and ${postings.yearly_max_salary} >= ${postings.yearly_min_salary}
                )
              )
            then ${postings.yearly_min_salary}
          end
        ),
        0
      )::float`,
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(and(
      isNotNull(postings.yearly_min_salary),
      gte(postings.yearly_min_salary, VALID_ANNUAL_SALARY_MIN),
      lte(postings.yearly_min_salary, VALID_ANNUAL_SALARY_MAX),
    ))
    .groupBy(skills.skill_name)
    .orderBy(desc(sql`coalesce(percentile_cont(0.5) within group (order by ${postings.yearly_min_salary}), 0)`))
    .limit(1);

  // Most versatile skill (appears in most diverse roles)
  const mostVersatile = await db
    .select({
      name: skills.skill_name,
      role_count: sql<number>`count(distinct ${postings.title})::int`,
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .groupBy(skills.skill_name)
    .orderBy(desc(sql`count(distinct ${postings.title})`))
    .limit(1);

  return {
    totalSkills: Number(totalSkills[0]?.count || 0),
    avgDemand: avgDemandValue,
    medianSalary: Math.round(Number(medianSalary[0]?.median_salary || 0)),
    avgSalary: Math.round(Number(medianSalary[0]?.median_salary || 0)),
    topSkill: topSkill[0]?.name || 'N/A',
    topSkillCount: topSkill[0]?.count || 0,
    newSkills: Number(newSkills[0]?.count || 0),
    fastestGrowingSkill: fastestGrowing?.skill_name || 'N/A',
    fastestGrowthRate: fastestGrowing?.growth_percentage || 0,
    highestPaidSkill: highestPaid[0]?.name || 'N/A',
    highestPaidSalary: Math.round(Number(highestPaid[0]?.median_salary || 0)),
    mostVersatileSkill: mostVersatile[0]?.name || 'N/A',
    mostVersatileRoleCount: mostVersatile[0]?.role_count || 0,
  };
}

export async function getRelatedSkillsEnhanced(skillName: string, limit = 10) {
  const skillLower = skillName.toLowerCase();

  // Get job IDs that require this skill
  const jobIdsResult = await db
    .select({ job_id: job_skills.job_id })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .where(sql`lower(${skills.skill_name}) = ${skillLower}`);

  const jobIds = jobIdsResult.map((r) => r.job_id);
  if (jobIds.length === 0) return [];

  // Find skills that commonly appear with this skill
  return await db
    .select({
      name: skills.skill_name,
      count: sql<number>`count(*)::int`,
      co_occurrence_rate: sql<number>`(count(*)::float / ${jobIds.length} * 100)::float`,
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .where(
      and(
        inArray(job_skills.job_id, jobIds),
        not(sql`lower(${skills.skill_name}) = ${skillLower}`)
      )
    )
    .groupBy(skills.skill_name)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
}

// ===========================
// Companies Page Enhancements
// ===========================

export async function getCompaniesHeroStats() {
  // Total companies
  const totalCompanies = await db
    .select({ count: sql<number>`count(distinct ${companies.company_id})::int` })
    .from(companies);

  // Average postings per company
  const avgPostings = await db.execute(sql`
    SELECT round(avg(posting_count))::int as avg
    FROM (
      SELECT count(*)::int as posting_count
      FROM ${postings}
      GROUP BY company_id
    ) company_counts
  `);

  const avgPostingsValue = Number(avgPostings.rows[0]?.avg || 0);

  // Highest paying company - FIXED: Using company_name JOIN with sanity filters
  const highestPaying = await db
    .select({
      name: companies.name,
      median_salary: sql<number>`round(percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary}))::int`,
      avg_salary: sql<number>`round(percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary}))::int`,
    })
    .from(companies)
    .innerJoin(postings, sql`LOWER(TRIM(${companies.name})) = LOWER(TRIM(${postings.company_name}))`)
    .where(
      and(
        isNotNull(postings.yearly_min_salary),
        gte(postings.yearly_min_salary, VALID_ANNUAL_SALARY_MIN),
        lte(postings.yearly_min_salary, VALID_ANNUAL_SALARY_MAX)
      )
    )
    .groupBy(companies.company_id, companies.name)
    .having(sql`COUNT(${postings.job_id}) >= 5`)
    .orderBy(desc(sql`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_min_salary})`))
    .limit(1);

  // Most active industry from job_industries coverage (best overlap with live postings)
  const topIndustryFromJobs = await db
    .select({
      industry: industries.industry_name,
      count: sql<number>`count(distinct ${postings.job_id})::int`,
    })
    .from(job_industries)
    .innerJoin(postings, eq(job_industries.job_id, postings.job_id))
    .innerJoin(industries, eq(job_industries.industry_id, industries.industry_id))
    .where(isNotNull(industries.industry_name))
    .groupBy(industries.industry_name)
    .orderBy(desc(sql`count(distinct ${postings.job_id})`))
    .limit(1);

  // Fallback for environments where job_industries is not populated
  const topIndustryFromTopCompanies = await db.execute<{
    industry: string | null;
    count: number;
  }>(sql`
    SELECT
      tc.industry as industry,
      COUNT(DISTINCT p.job_id)::int as count
    FROM ${top_companies} tc
    INNER JOIN ${postings} p
      ON LOWER(TRIM(tc.name)) = LOWER(TRIM(p.company_name))
    WHERE tc.industry IS NOT NULL
      AND tc.industry <> ''
    GROUP BY tc.industry
    ORDER BY count DESC
    LIMIT 1
  `);

  const topIndustry = topIndustryFromJobs[0]
    ? {
        industry: topIndustryFromJobs[0].industry,
        count: Number(topIndustryFromJobs[0].count ?? 0),
      }
    : topIndustryFromTopCompanies.rows[0]
      ? {
          industry: topIndustryFromTopCompanies.rows[0].industry ?? "N/A",
          count: Number(topIndustryFromTopCompanies.rows[0].count ?? 0),
        }
      : null;

  const stats = {
    totalCompanies: totalCompanies[0]?.count || 0,
    avgPostings: avgPostingsValue,
    highestPayingCompany: highestPaying[0]?.name || 'N/A',
    highestPayingSalary: highestPaying[0]?.median_salary || highestPaying[0]?.avg_salary || 0,
    mostActiveIndustry: topIndustry?.industry || 'N/A',
    mostActiveIndustryCount: topIndustry?.count || 0,
  };

  return stats;
}

export async function getCompanyComparisonData(companyIds: string[]) {
  if (companyIds.length === 0) return [];
  
  console.log('🔍 Comparison Query - Company IDs:', companyIds);
  
  const results = await db
    .select({
      company_id: companies.company_id,
      name: companies.name,
      location: sql<string>`CONCAT_WS(', ', ${companies.city}, ${companies.state}, ${companies.country})`,
      company_size: companies.company_size,
      posting_count: sql<number>`count(${postings.job_id})::int`,
      median_salary: sql<number>`round(
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY CASE 
            WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
            THEN ${postings.yearly_min_salary}
            ELSE NULL 
          END
        )
      )::int`,
      avg_salary: sql<number>`round(
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY CASE 
            WHEN ${postings.yearly_min_salary} BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
            THEN ${postings.yearly_min_salary} 
            ELSE NULL 
          END
        )
      )::int`,
      industry_count: sql<number>`count(distinct ${company_industries.industry})::int`,
    })
    .from(companies)
    .leftJoin(postings, sql`LOWER(TRIM(${companies.name})) = LOWER(TRIM(${postings.company_name}))`)
    .leftJoin(company_industries, eq(companies.company_id, company_industries.company_id))
    .where(inArray(companies.company_id, companyIds))
    .groupBy(companies.company_id, companies.name, companies.city, companies.state, companies.country, companies.company_size);
  
  console.log('📊 Comparison Results:', results);

  return results;
}

// ===========================
// Salary benchmark by role
// ===========================
export async function getRolesSalaryBenchmark(limit = 15) {
  const result = await db.execute<{
    title: string;
    median_salary: number;
    avg_salary: number;
    posting_count: number;
    salary_coverage: number;
  }>(sql`
    WITH role_totals AS (
      SELECT
        COALESCE(ra.canonical_name, p.title) AS title,
        COUNT(*)::int AS total_count
      FROM ${postings} p
      LEFT JOIN ${roleAliases} ra ON LOWER(p.title) = LOWER(ra.alias)
      GROUP BY COALESCE(ra.canonical_name, p.title)
    ),
    role_salary AS (
      SELECT
        COALESCE(ra.canonical_name, p.title) AS title,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.yearly_min_salary))::int AS median_salary,
        COUNT(*)::int AS salary_count
      FROM ${postings} p
      LEFT JOIN ${roleAliases} ra ON LOWER(p.title) = LOWER(ra.alias)
      WHERE ${validAnnualSalaryFilter("p")}
      GROUP BY COALESCE(ra.canonical_name, p.title)
      HAVING COUNT(*) >= 10
    )
    SELECT
      rs.title,
      rs.median_salary,
      rs.median_salary AS avg_salary,
      rt.total_count AS posting_count,
      ROUND(rs.salary_count::numeric / rt.total_count * 100)::int AS salary_coverage
    FROM role_salary rs
    JOIN role_totals rt ON rs.title = rt.title
    ORDER BY rs.median_salary DESC
    LIMIT ${limit}
  `);

  return result.rows.map(row => ({
    title: row.title,
    median_salary: Number(row.median_salary),
    avg_salary: Number(row.avg_salary),
    posting_count: Number(row.posting_count),
    salary_coverage: Number(row.salary_coverage),
  }));
}

