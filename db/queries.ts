import { db } from './index';
import { 
  companies, skills, job_skills, job_industries, industries, 
  roleAliases, top_companies, postings, employee_counts 
} from './schema';
import { 
  eq, sql, count, desc, inArray, ilike, gte, and, not, lt, gt, avg, isNotNull 
} from 'drizzle-orm';

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
    .limit(limit);
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
      WHERE COALESCE(ra.canonical_name, p.title) = ANY(ARRAY[${sql.raw(topRoles.map(r => `'${r.replace(/'/g, "''")}'`).join(', '))}])
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
      name: topCompaniesCte.name,
      country: companies.country,
      company_size: sql<number>`MAX(${employee_counts.employee_count})`,
      postings_count: topCompaniesCte.postings_count,
    })
    .from(topCompaniesCte)
    .leftJoin(companies, eq(topCompaniesCte.company_id, companies.company_id))
    .leftJoin(employee_counts, eq(companies.company_id, employee_counts.company_id))
    .groupBy(topCompaniesCte.name, companies.country, topCompaniesCte.postings_count)
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
      remote_count: sql<number>`SUM(CASE WHEN LOWER(CAST(${postings.remote_allowed} AS TEXT)) ~ '^(1(\\.0+)?|true|t)$' THEN 1 ELSE 0 END)::int`,
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