import { X } from 'lucide-react';
import { db} from './index';
import { companies, skills, job_skills, job_industries, industries, company_industries, company_specialties, employee_counts, postings, roleAliases, top_companies } 
from './schema';
import { eq, sql, count, desc, inArray, ilike, gte, and, not, lt, gt, avg, isNotNull} from 'drizzle-orm'

const canonicalRole = (titleCol: any) =>
  sql`coalesce(lower(${roleAliases.canonical_name}), lower(${titleCol}))`;


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
    .leftJoin(companies, eq(postings.company_id, companies.company_id))
    .orderBy(desc(postings.listed_time))
    .limit(limit);
  return results;
}

// ===========================
// Trending skills
// ===========================
export async function getTrendingSkills(limit = 10) {
  const results = await db
    .select({
      skill_name: skills.skill_name,
      skill_abr: job_skills.skill_abr,
      count: count(),
    })
    .from(job_skills)
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    // Uncomment after you have recent data
    //.where(sql`${postings.listed_time} >= NOW() - INTERVAL '7 days'`)
    .groupBy(job_skills.skill_abr, skills.skill_name)
    .orderBy(desc(count()))
    .limit(limit);
  return results;
}

export async function getTopJobRoles(
  limit: number,
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
    conditions.push(
      gte(
        sql<number>`CAST(NULLIF(${postings.min_salary}, '') AS NUMERIC)`,
        filters.minSalary
      )
    );
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
    // FIXED: Case-insensitive join using sql condition
    .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`);

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  return await query
    .groupBy(sql`COALESCE(${roleAliases.canonical_name}, ${postings.title})`)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
}


// ===========================
// Top roles time series
// ===========================
export async function getTopRolesTimeSeries(limit = 10 /*, days = 30 */) {
  console.log('🔍 [getTopRolesTimeSeries] Starting with limit:', limit);
  const startTime = Date.now();

  try {
    // Step 1: Get top roles by count (with case-insensitive join)
    console.log('📊 [Step 1] Fetching top roles...');
    const step1Start = Date.now();
    
    const topRolesResult = await db
      .select({ 
        title: sql<string>`COALESCE(${roleAliases.canonical_name}, ${postings.title})` 
      })
      .from(postings)
      .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`)
      .groupBy(sql`COALESCE(${roleAliases.canonical_name}, ${postings.title})`)
      .orderBy(desc(count()))
      .limit(limit);

    console.log(`✅ [Step 1] Completed in ${Date.now() - step1Start}ms`);
    console.log(`📋 [Step 1] Found ${topRolesResult.length} roles:`, topRolesResult.map(r => r.title));

    const topRoles = topRolesResult.map(r => r.title);
    if (topRoles.length === 0) {
      console.log('⚠️ [getTopRolesTimeSeries] No roles found, returning empty array');
      return [];
    }

    // Step 2: Get timeseries data
    console.log('📈 [Step 2] Fetching timeseries data...');
    const step2Start = Date.now();
    
    const result = await db.execute<{
      title: string;
      day: string;
      count: number;
    }>(sql`
      SELECT 
        COALESCE(ra.canonical_name, p.title) as title,
        DATE_TRUNC('day', TO_TIMESTAMP(p.listed_time::numeric / 1000))::text as day,
        COUNT(*)::int as count
      FROM ${postings} p
      LEFT JOIN ${roleAliases} ra ON LOWER(p.title) = LOWER(ra.alias)
      WHERE COALESCE(ra.canonical_name, p.title) = ANY(ARRAY[${sql.raw(topRoles.map(r => `'${r.replace(/'/g, "''")}'`).join(', '))}])
      GROUP BY COALESCE(ra.canonical_name, p.title), DATE_TRUNC('day', TO_TIMESTAMP(p.listed_time::numeric / 1000))
      ORDER BY day ASC
    `);

    console.log(`✅ [Step 2] Completed in ${Date.now() - step2Start}ms`);
    console.log(`📋 [Step 2] Found ${result.rows.length} timeseries data points`);
    
    const finalResult = result.rows.map(row => ({
      title: row.title,
      day: row.day,
      count: Number(row.count),
    }));

    console.log(`🎉 [getTopRolesTimeSeries] Total time: ${Date.now() - startTime}ms`);
    return finalResult;

  } catch (error) {
    console.error('❌ [getTopRolesTimeSeries] Error:', error);
    console.log(`⏱️ [getTopRolesTimeSeries] Failed after ${Date.now() - startTime}ms`);
    throw error;
  }
}


// ===========================
// Top skills for a role
// ===========================
export async function getTopSkillsForRole(roleTitle: string, limit = 10) {
  const roleLower = roleTitle.toLowerCase();

  const results = await db
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

  return results;
}


// ===========================
// Top companies for a role
// ===========================
export async function getTopCompaniesForRole(roleTitle: string, limit = 10) {
  const roleLower = roleTitle.toLowerCase();


  const results = await db
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

  return results;
}


// ===========================
// Role statistics with numeric salaries
// ===========================
export async function getRoleStats(roleTitle: string) {
  const roleLower = roleTitle.toLowerCase();

  const results = await db
    .select({
      total_jobs: count(),
      avg_min_salary: sql<number>`AVG(CAST(NULLIF(${postings.min_salary}, '') AS DECIMAL))`,
      avg_max_salary: sql<number>`AVG(CAST(NULLIF(${postings.max_salary}, '') AS DECIMAL))`,
    })
    .from(postings)
    .leftJoin(roleAliases, sql`lower(postings.title) = lower(${roleAliases.alias})`)
    .where(sql`coalesce(lower(${roleAliases.canonical_name}), lower(postings.title)) = ${roleLower}`);

  return results[0] || { total_jobs: 0, avg_min_salary: null, avg_max_salary: null };
}


// ===========================
// Get data quality metrics for a role
// Counts postings for a role that have NO skills associated
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
// Paginated list of all skills with counts and avg salary
// ===========================
export async function getAllSkills(params: { page?: number; limit?: number; search?: string }) {
  const { page = 1, limit = 12, search = "" } = params;
  const offset = (page - 1) * limit;

  const conditions = search ? ilike(skills.skill_name, `%${search}%`) : undefined;

  const data = await db
    .select({
      name: skills.skill_name,
      count: count(),
      avg_salary: sql<number>`AVG(CAST(NULLIF(regexp_replace(${postings.min_salary}, '[^0-9.]', '', 'g'), '') AS NUMERIC))`
    })
    .from(skills)
    .leftJoin(job_skills, eq(skills.skill_abr, job_skills.skill_abr))
    .leftJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(conditions)
    .groupBy(skills.skill_name)
    .orderBy(desc(count()))
    .limit(limit)
    .offset(offset);

  return data;
}

// ===========================
// Detailed stats for a specific skill
// ===========================
export async function getSkillDetails(skillName: string) {
  const skillLower = skillName.toLowerCase();

  // Base stats
  const stats = await db
    .select({
      count: sql<number>`count(*)::int`,
      avgSalary: sql<number>`
        coalesce(
          avg(CAST(NULLIF(regexp_replace(${postings.min_salary}, '[^0-9.]', '', 'g'), '') AS NUMERIC)), 0
        )::float
      `,
    })
    .from(postings)
    .innerJoin(job_skills, eq(postings.job_id, job_skills.job_id))
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .where(sql`lower(${skills.skill_name}) = ${skillLower}`);

  // Top employers
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

  const baseStats = stats[0] || { count: 0, avgSalary: 0 };

  return {
    count: Number(baseStats.count),
    avgSalary: Number(baseStats.avgSalary),
    topEmployers: topEmployers || [],
    marketShare: baseStats.count > 0 ? ((Number(baseStats.count) / 123849) * 100).toFixed(2) : "0.00",
  };
}

// ===========================
// Related skills for a given skill
// ===========================
export async function getRelatedSkills(skillName: string, limit = 5) {
  const skillLower = skillName.toLowerCase();

  // Step 1: Get job IDs that contain this skill
  const jobIdsResult = await db
    .select({ job_id: job_skills.job_id })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .where(sql`lower(${skills.skill_name}) = ${skillLower}`);

  const jobIds = jobIdsResult.map(r => r.job_id);
  if (jobIds.length === 0) return []; // early exit if no jobs

  // Step 2: Get other skills in these jobs (exclude the original skill)
  const relatedSkills = await db
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

  return relatedSkills;
}

// ===========================
// Skill trending data by day
// ===========================
export async function getSkillTrendingData(skillName: string) {
  const skillLower = skillName.toLowerCase();

  return await db
    .select({
      day: sql<string>`date_trunc('day', to_timestamp(${postings.listed_time}::numeric / 1000))::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(postings)
    .innerJoin(job_skills, eq(postings.job_id, job_skills.job_id))
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .where(sql`lower(${skills.skill_name}) = ${skillLower}`)
    .groupBy(sql`date_trunc('day', to_timestamp(${postings.listed_time}::numeric / 1000))`)
    .orderBy(sql`date_trunc('day', to_timestamp(${postings.listed_time}::numeric / 1000)) ASC`);
}

export async function getRoleInsights(roleTitle: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Get count for last 30 days vs previous 30 days
  const currentCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(postings)
    .where(and(eq(postings.title, roleTitle), gte(postings.listed_time, thirtyDaysAgo)));

  // 2. Get the top skill for this role
  // This assumes you have a join table or skills associated with postings
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
    // Hardcoded trend for example, or calculate (current - previous) / previous
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
    // We link the company name from 'postings' (column 29) 
    // to the name in 'companies' (column 5)
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

  const results = await db
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

  return results;
}

interface GetAllCompanyDataParams {
  limit?: number;
  offset?: number;
  search?: string;
  location?: string;
}

export async function getAllCompanyData({
  limit = 50,
  offset = 0,
  search = "",
  location = "",
}: GetAllCompanyDataParams = {}) {
  let query = db
    .select({
      name: companies.name,
      country: companies.country,
      company_size: sql<number>`MAX(${employee_counts.employee_count})`, // Use MAX or AVG
      postings_count: sql<number>`COUNT(${postings.job_id})::int`,
    })
    .from(companies)
    .leftJoin(
      employee_counts, 
      eq(companies.company_id, employee_counts.company_id)
    )
    .leftJoin(
      postings,
      eq(companies.name, postings.company_name)
    )
    .groupBy(companies.name, companies.country) // Remove employee_count from groupBy
    .$dynamic();

  if (search) {
    query = query.where(ilike(companies.name, `%${search}%`));
  }

  if (location) {
    query = query.where(eq(companies.country, location));
  }

  return await query
    .orderBy(desc(sql`COUNT(${postings.job_id})`))
    .limit(limit)
    .offset(offset);
}

// db/queries.ts

export async function getAverageCompanySalary() {
  const companyAvgCte = db.$with("company_avg").as(
    db
      .select({
        company_id: companies.company_id,
        company: companies.name,
        avg_salary: sql<number>`
          AVG(
            CAST(
              NULLIF(
                regexp_replace(${postings.min_salary}, '[^0-9.]', '', 'g'),
                ''
              ) AS NUMERIC
            )
          )
        `.as("avg_salary"),
        posting_count: sql<number>`COUNT(${postings.job_id})::int`.as("posting_count"),
      })
      .from(companies)
      .innerJoin(postings, sql`LOWER(${companies.name}) = LOWER(${postings.company_name})`)
      .groupBy(companies.company_id, companies.name)
  );

  const globalAvgCte = db.$with("global_avg").as(
    db.select({
      global_avg_salary: sql<number>`
        AVG(CAST(NULLIF(regexp_replace(${postings.min_salary}, '[^0-9.]', '', 'g'), '') AS NUMERIC))
      `.as("global_avg_salary"),
    }).from(postings)
  );

  return db
    .with(companyAvgCte, globalAvgCte)
    .select({
      company: companyAvgCte.company,
      avg_salary: companyAvgCte.avg_salary,
      posting_count: companyAvgCte.posting_count,
      global_avg_salary: globalAvgCte.global_avg_salary,
    })
    .from(companyAvgCte)
    .crossJoin(globalAvgCte)
    .where(sql`${companyAvgCte.avg_salary} IS NOT NULL`)
    .orderBy(desc(companyAvgCte.avg_salary))
    .limit(10);
}

export async function getTopCompaniesBySize() {
  const companySizeCte = db.$with("company_size").as(
    db
      .select({
        company_id: companies.company_id,
        company: companies.name,
        employee_count: employee_counts.employee_count,
        avg_salary: sql<number>`
          COALESCE(
            AVG(CAST(NULLIF(regexp_replace(${postings.min_salary}, '[^0-9.]', '', 'g'), '') AS NUMERIC)), 
            0
          )
        `.as("avg_salary"),
        posting_count: sql<number>`COUNT(${postings.job_id})::int`.as("posting_count"),
      })
      .from(companies)
      .innerJoin(employee_counts, eq(companies.company_id, employee_counts.company_id))
      // FIX: Use leftJoin so companies like Walmart show up even with 0 postings
      .leftJoin(postings, sql`LOWER(${companies.name}) = LOWER(${postings.company_name})`)
      .groupBy(companies.company_id, companies.name, employee_counts.employee_count)
  );

  const globalAvgCte = db.$with("global_avg").as(
    db.select({
      global_avg_salary: sql<number>`
        AVG(CAST(NULLIF(regexp_replace(${postings.min_salary}, '[^0-9.]', '', 'g'), '') AS NUMERIC))
      `.as("global_avg_salary"),
    }).from(postings)
  );

  return db
    .with(companySizeCte, globalAvgCte)
    .select({
      company: companySizeCte.company,
      employee_count: companySizeCte.employee_count,
      avg_salary: companySizeCte.avg_salary,
      posting_count: companySizeCte.posting_count,
      global_avg_salary: globalAvgCte.global_avg_salary,
    })
    .from(companySizeCte)
    .crossJoin(globalAvgCte)
    .orderBy(desc(companySizeCte.employee_count)) // Order by size at DB level
    .limit(10);
}


export async function getAvgSalaryPerEmployeeForTop10Fortune() {
  const rankedEmployeeCounts = db.$with("ranked_counts").as(
    db
      .select({
        company_id: employee_counts.company_id,
        employee_count: employee_counts.employee_count,
        rn: sql<number>`
          ROW_NUMBER() OVER (
            PARTITION BY ${employee_counts.company_id}
            ORDER BY ${employee_counts.time_recorded} DESC
          )
        `.as("rn"),
      })
      .from(employee_counts)
  );

  const latestEmployeeCounts = db.$with("latest_counts").as(
    db
      .select({
        company_id: rankedEmployeeCounts.company_id,
        employee_count: sql<number>`CAST(${rankedEmployeeCounts.employee_count} AS INTEGER)`.as("employee_count"),
      })
      .from(rankedEmployeeCounts)
      .where(eq(rankedEmployeeCounts.rn, 1))
  );

  return await db
    .with(rankedEmployeeCounts, latestEmployeeCounts)
    .select({
      company: top_companies.name,
      fortune_rank: top_companies.fortune_rank,
      // Actual average salary, no longer divided by employee count
      avg_salary: sql<number>`
        COALESCE(AVG(
          CAST(
            NULLIF(regexp_replace(${postings.min_salary}, '[^0-9.]', '', 'g'), '') 
          AS NUMERIC)
        ), 0)
      `.mapWith(Number), 
      employee_count: sql<number>`COALESCE(${latestEmployeeCounts.employee_count}, 0)`.mapWith(Number),
      posting_count: sql<number>`COUNT(${postings.job_id})`.mapWith(Number),
    })
    .from(top_companies)
    .innerJoin(companies, eq(top_companies.name, companies.name))
    .leftJoin(
      latestEmployeeCounts,
      eq(companies.company_id, latestEmployeeCounts.company_id)
    )
    .leftJoin(postings, eq(companies.name, postings.company_name))
    .groupBy(
      top_companies.name,
      top_companies.fortune_rank,
      latestEmployeeCounts.employee_count
    )
    .orderBy(top_companies.fortune_rank)
    .limit(10);
}