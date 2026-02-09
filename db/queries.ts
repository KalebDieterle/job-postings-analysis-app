import { db } from './index';
import { 
  companies, skills, job_skills, job_industries, industries, 
  roleAliases, top_companies, postings, employee_counts, company_industries 
} from './schema';
import { 
  eq, sql, count, desc, inArray, ilike, gte, and, not, lt, gt, avg, isNotNull 
} from 'drizzle-orm';

const canonicalRole = (titleCol: any) =>
  sql`coalesce(lower(${roleAliases.canonical_name}), lower(${titleCol}))`;

/**
 * Get the date range for the most recent N days of data in the dataset.
 * Uses the max posting date as anchor instead of today's date.
 */
async function getMostRecentDateRange(days: number = 30) {
  const maxDate = await db
    .select({
      max_date: sql<string>`max(to_timestamp(${postings.listed_time}::double precision / 1000))`,
    })
    .from(postings);

  const mostRecentDate = maxDate[0]?.max_date
    ? new Date(maxDate[0].max_date)
    : new Date();

  const startDate = new Date(mostRecentDate);
  startDate.setDate(startDate.getDate() - days);

  return { startDate, endDate: mostRecentDate };
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
        DATE_TRUNC('day', TO_TIMESTAMP(p.listed_time::numeric / 1000))::text as day,
        COUNT(*)::int as count
      FROM ${postings} p
      LEFT JOIN ${roleAliases} ra ON LOWER(p.title) = LOWER(ra.alias)
      WHERE COALESCE(ra.canonical_name, p.title) = ANY(${topRoles})
      GROUP BY COALESCE(ra.canonical_name, p.title), DATE_TRUNC('day', TO_TIMESTAMP(p.listed_time::numeric / 1000))
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

  // UPDATED: Now uses yearly_min/max columns directly
  const results = await db
    .select({
      total_jobs: count(),
      avg_min_salary: avg(postings.yearly_min_salary),
      avg_max_salary: avg(postings.yearly_max_salary),
    })
    .from(postings)
    .leftJoin(roleAliases, sql`lower(postings.title) = lower(${roleAliases.alias})`)
    .where(sql`coalesce(lower(${roleAliases.canonical_name}), lower(postings.title)) = ${roleLower}`);

  return results[0] || { total_jobs: 0, avg_min_salary: null, avg_max_salary: null };
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

  // UPDATED: Simple avg(yearly_min_salary) replaces the regex mess
  const data = await db
    .select({
      name: skills.skill_name,
      count: count(),
      avg_salary: avg(postings.yearly_min_salary)
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

  // UPDATED: Uses yearly_min_salary
  const stats = await db
    .select({
      count: sql<number>`count(*)::int`,
      avgSalary: sql<number>`coalesce(avg(${postings.yearly_min_salary}), 0)::float`,
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

  const baseStats = stats[0] || { count: 0, avgSalary: 0 };

  return {
    count: Number(baseStats.count),
    avgSalary: Number(baseStats.avgSalary),
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
}: { limit?: number; offset?: number; search?: string; location?: string } = {}) {
  const dbLimit = limit + 1;
  let topQuery: any = db
    .select({
      company_id: companies.company_id,
      name: companies.name,
      postings_count: sql<number>`COUNT(${postings.job_id})::int`.as('postings_count'),
    })
    .from(companies)
    .leftJoin(postings, eq(companies.name, postings.company_name));

  const conditions = [
    and(
      sql`LOWER(${companies.name}) != 'confidential'`,
      sql`LOWER(${companies.name}) != 'confidential company'`,
      sql`LOWER(${companies.name}) NOT LIKE 'confidential (%'`,
      sql`LOWER(${companies.name}) NOT LIKE '%eox vantage%'`
    )
  ];

  if (search) conditions.push(ilike(companies.name, `%${search}%`));
  if (location) conditions.push(eq(companies.country, location));

  topQuery = topQuery.where(and(...conditions))
    .groupBy(companies.company_id, companies.name)
    .orderBy(desc(sql`COUNT(${postings.job_id})`))
    .limit(dbLimit)
    .offset(offset);

  const topCompaniesCte = db.$with("top_companies").as(topQuery);

  return await db
    .with(topCompaniesCte)
    .select({
      company_id: topCompaniesCte.company_id,
      name: topCompaniesCte.name,
      country: companies.country,
      company_size: sql<number>`MAX(${employee_counts.employee_count})`,
      postings_count: topCompaniesCte.postings_count,
    })
    .from(topCompaniesCte)
    .leftJoin(companies, eq(topCompaniesCte.company_id, companies.company_id))
    .leftJoin(employee_counts, eq(companies.company_id, employee_counts.company_id))
    .groupBy(topCompaniesCte.company_id, topCompaniesCte.name, companies.country, topCompaniesCte.postings_count)
    .orderBy(desc(topCompaniesCte.postings_count));
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
        // FIX: Using Median (percentile_cont) instead of AVG to ignore outliers 🚀
        avg_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_max_salary})`.as("avg_salary"),
        posting_count: sql<number>`COUNT(${postings.job_id})::int`.as("posting_count"),
      })
      .from(companies)
      .innerJoin(postings, sql`LOWER(${companies.name}) = LOWER(${postings.company_name})`)
      // SANITY FILTER: Exclude obvious data errors (e.g., $208M or $0)
      .where(and(
        gt(postings.yearly_max_salary, 10000), 
        lt(postings.yearly_max_salary, 1500000)
      ))
      .groupBy(companies.company_id, companies.name)
  );

  const globalAvgCte = db.$with("global_avg").as(
    db.select({
      global_avg_salary: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_max_salary})`.as("global_avg_salary"),
    })
    .from(postings)
    .where(and(gt(postings.yearly_max_salary, 10000), lt(postings.yearly_max_salary, 1500000)))
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
    .orderBy(desc(companyAvgCte.avg_salary))
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
        // UPDATED: Now uses yearly_min_salary
        avg_salary: avg(postings.yearly_min_salary).as("avg_salary"),
        posting_count: sql<number>`COUNT(${postings.job_id})::int`.as("posting_count"),
      })
      .from(companies)
      .innerJoin(employee_counts, eq(companies.company_id, employee_counts.company_id))
      .leftJoin(postings, sql`LOWER(${companies.name}) = LOWER(${postings.company_name})`)
      .groupBy(companies.company_id, companies.name, employee_counts.employee_count)
  );

  const globalAvgCte = db.$with("global_avg").as(
    db.select({
      global_avg_salary: avg(postings.yearly_min_salary).as("global_avg_salary"),
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
      // Robust AVG with the sanity filter applied below
      avg_salary: avg(postings.yearly_max_salary).mapWith(Number), 
      employee_count: sql<number>`COALESCE(${latestCounts.employee_count}, 0)`.mapWith(Number),
      posting_count: sql<number>`COUNT(${postings.job_id})`.mapWith(Number),
    })
    .from(top_companies)
    .innerJoin(companies, eq(top_companies.name, companies.name))
    .leftJoin(latestCounts, eq(companies.company_id, latestCounts.company_id))
    .leftJoin(postings, eq(companies.name, postings.company_name))
    // FIX: Sanity filter to keep the graph realistic 🚀
    .where(and(
      gt(postings.yearly_max_salary, 20000), 
      lt(postings.yearly_max_salary, 1200000)
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
      // UPDATED: Now uses yearly_min_salary
      avg_salary: avg(postings.yearly_min_salary),
      remote_count: sql<number>`SUM(CASE WHEN ${postings.remote_allowed} IN ('1', 'true') THEN 1 ELSE 0 END)::int`,
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
      // UPDATED: Now uses yearly_min_salary
      avg_salary: avg(postings.yearly_min_salary),
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
    SELECT TO_CHAR(DATE_TRUNC('month', TO_TIMESTAMP(listed_time::numeric / 1000)), 'YYYY-MM') as month, COUNT(*)::int as count
    FROM ${postings}
    WHERE LOWER(company_name) = LOWER(${companyName})
    GROUP BY DATE_TRUNC('month', TO_TIMESTAMP(listed_time::numeric / 1000))
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
      avgMinSalary: sql<number>`avg(${postings.yearly_min_salary})`.as('avg_min_salary'),
      avgMaxSalary: sql<number>`avg(${postings.yearly_max_salary})`.as('avg_max_salary'),
      // Fix: Compare text to string '1' or 'true'
      remoteCount: sql<number>`count(*) filter (where ${postings.remote_allowed} IN ('1', 'true'))`.as('remote_count'),
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
  return await db
    .select({
      city: companies.city,
      state: sql<string>`COALESCE(
        MIN(${companies.state}) FILTER (WHERE LENGTH(${companies.state}) <= 3 AND ${companies.state} != '0'),
        MIN(${companies.state}) FILTER (WHERE ${companies.state} != '0')
      )`,
      country: companies.country,
      lat: sql<number>`AVG(${companies.lat})`,
      lng: sql<number>`AVG(${companies.lng})`,
      jobCount: sql<number>`count(distinct ${postings.job_id})::int`,
      companyCount: sql<number>`count(distinct ${postings.company_id})::int`,
      avgSalary: sql<number>`round(avg((${postings.yearly_min_salary} + ${postings.yearly_max_salary}) / 2))::int`,
      // Fix: cast text to float for ratio calculation
      remoteRatio: sql<number>`(
        count(*) FILTER (WHERE ${postings.remote_allowed} IN ('1', 'true'))::float / NULLIF(count(*), 0)
      )`,
    })
    .from(companies)
    .innerJoin(
      postings,
      sql`LOWER(TRIM(${companies.name})) = LOWER(TRIM(${postings.company_name}))`
    )
    .where(
      and(
        isNotNull(companies.city),
        isNotNull(companies.lat),
        isNotNull(companies.lng)
      )
    )
    .groupBy(companies.city, companies.state, companies.country)
    .orderBy(desc(sql`count(distinct ${postings.job_id})`));
}

/**
 * Get detailed stats for a specific location
 */

/**
 * Get jobs by country for choropleth map
 */
export async function getJobsByCountry() {
  return await db
    .select({
      country: companies.country,
      jobCount: sql<number>`count(distinct ${postings.job_id})`.as('job_count'),
      avgSalary: sql<number>`avg(${postings.normalized_salary}::numeric)`.as('avg_salary'),
      cities: sql<string[]>`array_agg(distinct ${companies.city})`.as('cities'),
    })
    .from(companies)
    .innerJoin(postings, sql`LOWER(TRIM(${companies.name})) = LOWER(TRIM(${postings.company_name}))`)
    .where(isNotNull(companies.country))
    .groupBy(companies.country)
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
      avgMinSalary: sql<number>`min(${postings.yearly_min_salary})`.as("avg_min_salary"),
      avgMaxSalary: sql<number>`max(${postings.yearly_max_salary})`.as("avg_max_salary"),
      avgMedSalary: sql<number>`round(avg(${postings.yearly_med_salary}))`.as("avg_med_salary"),
      // Fix: Robust string comparison
      remoteJobs: sql<number>`count(*) filter (where ${postings.remote_allowed} IN ('1', 'true'))`.as("remote_jobs"),
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
export async function getTrendingSkills(params: {
  timeframe?: number; // days to look back (default 30)
  limit?: number;
  sortBy?: 'demand' | 'salary';
}) {
  const { timeframe = 30, limit = 24, sortBy = 'demand' } = params;
  const timeframeSec = timeframe * 24 * 60 * 60;
  
  // Single optimized query with max_date anchor calculated in CTE
  const result = await db.execute<{
    name: string;
    current_count: number;
    previous_count: number;
    current_salary: number;
    previous_salary: number;
    growth_percentage: number;
    salary_change: number;
    trend_status: string;
  }>(sql`
    WITH date_bounds AS (
      SELECT 
        MAX(p.listed_time::numeric / 1000) as max_ts
      FROM ${postings} p
    ),
    current_period AS (
      SELECT 
        s.skill_name as name,
        COUNT(*)::int as count,
        COALESCE(AVG(p.yearly_min_salary), 0)::float as avg_salary
      FROM ${skills} s
      INNER JOIN ${job_skills} js ON s.skill_abr = js.skill_abr
      INNER JOIN ${postings} p ON js.job_id = p.job_id
      CROSS JOIN date_bounds db
      WHERE (p.listed_time::numeric / 1000) >= (db.max_ts - ${timeframeSec})
      GROUP BY s.skill_name
      HAVING COUNT(*) > 5
    ),
    previous_period AS (
      SELECT 
        s.skill_name as name,
        COUNT(*)::int as count,
        COALESCE(AVG(p.yearly_min_salary), 0)::float as avg_salary
      FROM ${skills} s
      INNER JOIN ${job_skills} js ON s.skill_abr = js.skill_abr
      INNER JOIN ${postings} p ON js.job_id = p.job_id
      CROSS JOIN date_bounds db
      WHERE (p.listed_time::numeric / 1000) >= (db.max_ts - ${2 * timeframeSec})
        AND (p.listed_time::numeric / 1000) < (db.max_ts - ${timeframeSec})
      GROUP BY s.skill_name
    )
    SELECT 
      c.name,
      c.count as current_count,
      COALESCE(p.count, 0)::int as previous_count,
      c.avg_salary as current_salary,
      COALESCE(p.avg_salary, 0)::float as previous_salary,
      CASE 
        WHEN COALESCE(p.count, 0) = 0 THEN 100.0
        ELSE ROUND(((c.count - COALESCE(p.count, 0))::float / GREATEST(p.count, 1)::float * 100)::numeric, 1)
      END as growth_percentage,
      ROUND((c.avg_salary - COALESCE(p.avg_salary, 0))::numeric, 0) as salary_change,
      CASE
        WHEN COALESCE(p.count, 0) = 0 AND c.count > 10 THEN 'breakout'
        WHEN c.count > COALESCE(p.count, 0) THEN 'rising'
        ELSE 'falling'
      END as trend_status
    FROM current_period c
    LEFT JOIN previous_period p ON c.name = p.name
    ORDER BY ${sortBy === 'salary' ? sql.raw('salary_change DESC') : sql.raw('growth_percentage DESC')}
    LIMIT ${limit}
  `);
  
  return result.rows.map(row => ({
    name: row.name,
    currentCount: Number(row.current_count),
    previousCount: Number(row.previous_count),
    currentSalary: Number(row.current_salary),
    previousSalary: Number(row.previous_salary),
    growthPercentage: Number(row.growth_percentage),
    salaryChange: Number(row.salary_change),
    trendStatus: row.trend_status as 'rising' | 'falling' | 'breakout',
  }));
}

// ===========================
// Trending Stats Overview (Max-Date Anchored)
// ===========================
export async function getTrendingStats(timeframe = 30) {
  const timeframeSec = timeframe * 24 * 60 * 60;
  
  const result = await db.execute<{
    top_gainer: string;
    top_gainer_growth: number;
    avg_growth: number;
    highest_salary_jump: string;
    highest_salary_increase: number;
    new_entries: number;
    max_date: string;
  }>(sql`
    WITH date_bounds AS (
      SELECT 
        MAX(p.listed_time::numeric / 1000) as max_ts
      FROM ${postings} p
    ),
    current_period AS (
      SELECT 
        s.skill_name as name,
        COUNT(*)::int as count,
        COALESCE(AVG(p.yearly_min_salary), 0)::float as avg_salary
      FROM ${skills} s
      INNER JOIN ${job_skills} js ON s.skill_abr = js.skill_abr
      INNER JOIN ${postings} p ON js.job_id = p.job_id
      CROSS JOIN date_bounds db
      WHERE (p.listed_time::numeric / 1000) >= (db.max_ts - ${timeframeSec})
      GROUP BY s.skill_name
      HAVING COUNT(*) > 5
    ),
    previous_period AS (
      SELECT 
        s.skill_name as name,
        COUNT(*)::int as count,
        COALESCE(AVG(p.yearly_min_salary), 0)::float as avg_salary
      FROM ${skills} s
      INNER JOIN ${job_skills} js ON s.skill_abr = js.skill_abr
      INNER JOIN ${postings} p ON js.job_id = p.job_id
      CROSS JOIN date_bounds db
      WHERE (p.listed_time::numeric / 1000) >= (db.max_ts - ${2 * timeframeSec})
        AND (p.listed_time::numeric / 1000) < (db.max_ts - ${timeframeSec})
      GROUP BY s.skill_name
    ),
    growth_data AS (
      SELECT 
        c.name,
        c.count as current_count,
        COALESCE(p.count, 0) as previous_count,
        c.avg_salary as current_salary,
        COALESCE(p.avg_salary, 0) as previous_salary,
        CASE 
          WHEN COALESCE(p.count, 0) = 0 THEN 100.0
          ELSE ROUND(((c.count - COALESCE(p.count, 0))::float / GREATEST(p.count, 1)::float * 100)::numeric, 1)
        END as growth_percentage,
        ROUND((c.avg_salary - COALESCE(p.avg_salary, 0))::numeric, 0) as salary_change
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
      TO_CHAR(TO_TIMESTAMP((SELECT max_ts FROM date_bounds)), 'Mon YYYY') as max_date
  `);
  
  const stats = result.rows[0];
  return {
    topGainer: stats?.top_gainer || 'N/A',
    topGainerGrowth: Number(stats?.top_gainer_growth || 0),
    avgGrowth: Number(stats?.avg_growth || 0),
    highestSalaryJump: stats?.highest_salary_jump || 'N/A',
    highestSalaryIncrease: Number(stats?.highest_salary_increase || 0),
    newEntries: Number(stats?.new_entries || 0),
    dataAsOf: stats?.max_date || 'Unknown',
  };
}

// ===========================
// Role Analytics Queries
// ===========================

export async function getAverageSalary(
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
      avg_salary: avg(postings.yearly_min_salary),
    })
    .from(postings)
    .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`);

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  const result = await query;
  return Number(result[0]?.avg_salary || 0);
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
      COUNT(*) FILTER (WHERE LOWER(location) LIKE '%remote%')::int as remote
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

  conditions.push(sql`to_timestamp(${postings.listed_time}::double precision / 1000) >= to_timestamp(${cutoffDate.getTime() / 1000})`);

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
      week: sql<string>`TO_CHAR(DATE_TRUNC('week', to_timestamp(${postings.listed_time}::double precision / 1000)), 'YYYY-MM-DD')`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(postings)
    .leftJoin(roleAliases, sql`LOWER(${postings.title}) = LOWER(${roleAliases.alias})`)
    .where(and(...conditions))
    .groupBy(sql`DATE_TRUNC('week', to_timestamp(${postings.listed_time}::double precision / 1000))`)
    .orderBy(sql`DATE_TRUNC('week', to_timestamp(${postings.listed_time}::double precision / 1000)) ASC`);
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
    total_companies: number;
    total_skills: number;
  }>(sql`
    SELECT 
      (SELECT COUNT(*)::int FROM ${postings}) as total_jobs,
      (SELECT ROUND(AVG(yearly_min_salary))::int FROM ${postings} WHERE yearly_min_salary IS NOT NULL) as avg_salary,
      (SELECT COUNT(DISTINCT company_id)::int FROM ${companies}) as total_companies,
      (SELECT COUNT(*)::int FROM ${skills}) as total_skills
  `);

  const stats = result.rows[0];
  
  // Calculate monthly growth (last 30 days vs previous 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const growthResult = await db.execute<{ current: number; previous: number }>(sql`
    SELECT 
      COUNT(*) FILTER (WHERE to_timestamp(listed_time::double precision / 1000) >= ${thirtyDaysAgo.toISOString()}::timestamp)::int as current,
      COUNT(*) FILTER (WHERE to_timestamp(listed_time::double precision / 1000) >= ${sixtyDaysAgo.toISOString()}::timestamp 
                         AND to_timestamp(listed_time::double precision / 1000) < ${thirtyDaysAgo.toISOString()}::timestamp)::int as previous
    FROM ${postings}
  `);

  const growth = growthResult.rows[0];
  const monthlyGrowth = growth?.previous > 0 
    ? Math.round(((growth.current - growth.previous) / growth.previous) * 100)
    : 0;

  return {
    totalJobs: Number(stats?.total_jobs ?? 0) || 0,
    avgSalary: Number(stats?.avg_salary ?? 0) || 0,
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
    avg_salary: number;
    top_skills: string;
  }>(sql`
    WITH company_stats AS (
      SELECT 
        p.company_name,
        COUNT(DISTINCT p.job_id)::int as open_positions,
        ROUND(AVG(p.yearly_min_salary))::int as avg_salary
      FROM ${postings} p
      WHERE p.company_name IS NOT NULL
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
      cs.avg_salary,
      STRING_AGG(csk.skill_name, '|' ORDER BY csk.skill_count DESC) FILTER (WHERE csk.rn <= 3) as top_skills
    FROM company_stats cs
    LEFT JOIN company_skills csk ON cs.company_name = csk.company_name AND csk.rn <= 3
    GROUP BY cs.company_name, cs.open_positions, cs.avg_salary
    ORDER BY cs.open_positions DESC
  `);

  return result.rows.map(row => ({
    company_name: row.company_name,
    open_positions: Number(row.open_positions),
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
      WHERE p.yearly_min_salary IS NOT NULL 
        AND p.yearly_min_salary > 10000 
        AND p.yearly_min_salary < 1000000
    ),
    highest AS (
      SELECT role, AVG(salary)::int as avg_salary
      FROM salary_data
      GROUP BY role
      ORDER BY avg_salary DESC
      LIMIT 1
    ),
    lowest AS (
      SELECT role, AVG(salary)::int as avg_salary
      FROM salary_data
      GROUP BY role
      HAVING COUNT(*) > 10
      ORDER BY avg_salary ASC
      LIMIT 1
    )
    SELECT 
      (SELECT role FROM highest) as highest_role,
      (SELECT avg_salary FROM highest) as highest_salary,
      (SELECT role FROM lowest) as lowest_role,
      (SELECT avg_salary FROM lowest) as lowest_salary,
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

  const conditions = [];

  if (search) {
    conditions.push(ilike(skills.skill_name, `%${search}%`));
  }

  // Build the base query
  let query = db
    .select({
      name: skills.skill_name,
      count: sql<number>`count(*)::int`,
      avg_salary: sql<number>`coalesce(avg(${postings.yearly_min_salary}), 0)::float`,
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
      sql`count(*) >= ${demandMin}`,
      sql`count(*) <= ${demandMax}`,
      sql`coalesce(avg(${postings.yearly_min_salary}), 0) >= ${salaryMin}`,
      sql`coalesce(avg(${postings.yearly_min_salary}), 0) <= ${salaryMax}`
    )
  ) as any;

  // Apply sorting
  switch (sort) {
    case "salary":
      query = query.orderBy(desc(sql`coalesce(avg(${postings.yearly_min_salary}), 0)`)) as any;
      break;
    case "name":
      query = query.orderBy(skills.skill_name) as any;
      break;
    case "demand":
    default:
      query = query.orderBy(desc(sql`count(*)`)) as any;
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
      day: sql<string>`date_trunc('day', to_timestamp(${postings.listed_time}::double precision / 1000))::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(
      and(
        sql`to_timestamp(${postings.listed_time}::double precision / 1000) >= ${daysAgo.toISOString()}::timestamp`,
        inArray(
          skills.skill_name,
          skillNames.map((n) => n)
        )
      )
    )
    .groupBy(
      skills.skill_name,
      sql`date_trunc('day', to_timestamp(${postings.listed_time}::double precision / 1000))`
    )
    .orderBy(sql`date_trunc('day', to_timestamp(${postings.listed_time}::double precision / 1000)) ASC`);
}

export async function getCategoryDistribution() {
  // This would ideally use a category column in the skills table
  // For now, we'll return the top skills grouped by demand tiers
  const allSkills = await db
    .select({
      name: skills.skill_name,
      count: sql<number>`count(*)::int`,
    })
    .from(skills)
    .leftJoin(job_skills, eq(skills.skill_abr, job_skills.skill_abr))
    .groupBy(skills.skill_name)
    .orderBy(desc(sql`count(*)`))
    .limit(100);

  // Simple categorization based on skill name patterns
  const categories = {
    'Programming Languages': 0,
    'Frameworks & Libraries': 0,
    'Databases & Data': 0,
    'DevOps & Cloud': 0,
    'Tools & Platforms': 0,
    'AI/ML & Data Science': 0,
  };

  allSkills.forEach((skill) => {
    const name = skill.name.toLowerCase();
    if (
      name.includes('python') ||
      name.includes('java') ||
      name.includes('javascript') ||
      name.includes('typescript') ||
      name.includes('c++') ||
      name.includes('c#') ||
      name.includes('go') ||
      name.includes('rust') ||
      name.includes('ruby') ||
      name.includes('php')
    ) {
      categories['Programming Languages']++;
    } else if (
      name.includes('react') ||
      name.includes('angular') ||
      name.includes('vue') ||
      name.includes('node') ||
      name.includes('django') ||
      name.includes('flask') ||
      name.includes('spring') ||
      name.includes('.net')
    ) {
      categories['Frameworks & Libraries']++;
    } else if (
      name.includes('sql') ||
      name.includes('postgres') ||
      name.includes('mysql') ||
      name.includes('mongo') ||
      name.includes('redis') ||
      name.includes('elasticsearch') ||
      name.includes('database')
    ) {
      categories['Databases & Data']++;
    } else if (
      name.includes('docker') ||
      name.includes('kubernetes') ||
      name.includes('aws') ||
      name.includes('azure') ||
      name.includes('gcp') ||
      name.includes('terraform') ||
      name.includes('jenkins') ||
      name.includes('ci/cd') ||
      name.includes('devops')
    ) {
      categories['DevOps & Cloud']++;
    } else if (
      name.includes('git') ||
      name.includes('jira') ||
      name.includes('figma') ||
      name.includes('tableau') ||
      name.includes('power bi')
    ) {
      categories['Tools & Platforms']++;
    } else if (
      name.includes('machine learning') ||
      name.includes('ai') ||
      name.includes('tensorflow') ||
      name.includes('pytorch') ||
      name.includes('data science') ||
      name.includes('pandas') ||
      name.includes('numpy')
    ) {
      categories['AI/ML & Data Science']++;
    }
  });

  return Object.entries(categories).map(([category, count]) => ({
    category,
    count,
  }));
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

  // Average salary across all skills
  const avgSalary = await db
    .select({
      avg_salary: sql<number>`coalesce(avg(${postings.yearly_min_salary}), 0)::float`,
    })
    .from(postings)
    .where(isNotNull(postings.yearly_min_salary));

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
      sql`to_timestamp(${postings.listed_time}::double precision / 1000) >= ${thirtyDaysAgo.toISOString()}::timestamp`
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
      avg_salary: sql<number>`coalesce(avg(${postings.yearly_min_salary}), 0)::float`,
    })
    .from(job_skills)
    .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
    .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
    .where(isNotNull(postings.yearly_min_salary))
    .groupBy(skills.skill_name)
    .orderBy(desc(sql`coalesce(avg(${postings.yearly_min_salary}), 0)`))
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
    avgSalary: Math.round(Number(avgSalary[0]?.avg_salary || 0)),
    topSkill: topSkill[0]?.name || 'N/A',
    topSkillCount: topSkill[0]?.count || 0,
    newSkills: Number(newSkills[0]?.count || 0),
    fastestGrowingSkill: fastestGrowing?.skill_name || 'N/A',
    fastestGrowthRate: fastestGrowing?.growth_percentage || 0,
    highestPaidSkill: highestPaid[0]?.name || 'N/A',
    highestPaidSalary: Math.round(Number(highestPaid[0]?.avg_salary || 0)),
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
      avg_salary: sql<number>`round(percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_max_salary}))::int`,
    })
    .from(companies)
    .innerJoin(postings, sql`LOWER(TRIM(${companies.name})) = LOWER(TRIM(${postings.company_name}))`)
    .where(
      and(
        isNotNull(postings.yearly_max_salary),
        gt(postings.yearly_max_salary, 10000),
        lt(postings.yearly_max_salary, 1500000)
      )
    )
    .groupBy(companies.company_id, companies.name)
    .having(sql`COUNT(${postings.job_id}) >= 5`)
    .orderBy(desc(sql`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${postings.yearly_max_salary})`))
    .limit(1);

  console.log('🔍 Hero Stats - Highest Paying:', highestPaying[0]);

  // Most active industry - FIXED: Use company_name JOIN via companies table
  const topIndustry = await db
    .select({
      industry: company_industries.industry,
      count: sql<number>`count(distinct ${postings.job_id})::int`,
    })
    .from(company_industries)
    .innerJoin(companies, eq(company_industries.company_id, companies.company_id))
    .innerJoin(postings, sql`LOWER(TRIM(${companies.name})) = LOWER(TRIM(${postings.company_name}))`)
    .where(isNotNull(company_industries.industry))
    .groupBy(company_industries.industry)
    .orderBy(desc(sql`count(distinct ${postings.job_id})`))
    .limit(1);

  console.log('🔍 Hero Stats - Top Industry:', topIndustry[0]);

  const stats = {
    totalCompanies: totalCompanies[0]?.count || 0,
    avgPostings: avgPostingsValue,
    highestPayingCompany: highestPaying[0]?.name || 'N/A',
    highestPayingSalary: highestPaying[0]?.avg_salary || 0,
    mostActiveIndustry: topIndustry[0]?.industry || 'N/A',
    mostActiveIndustryCount: topIndustry[0]?.count || 0,
  };

  console.log('📊 Complete Hero Stats:', stats);

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
      // FIXED: Using company_name JOIN with yearly_max_salary median and sanity filters
      avg_salary: sql<number>`round(
        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY CASE 
            WHEN ${postings.yearly_max_salary} > 10000 AND ${postings.yearly_max_salary} < 1500000 
            THEN ${postings.yearly_max_salary} 
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