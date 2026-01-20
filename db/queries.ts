import { db} from './index';
import { postings, companies, skills, job_skills, job_industries, industries, company_industries, company_specialties, employee_counts } 
from './schema';
import { eq, sql, count, desc} from 'drizzle-orm'

// Test Query: total counts
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

//Get top 10 Job titles

export async function getTopJobTitles() {
    const results = await db.select({
        title: postings.title,
        count: count(),
    })
    .from(postings)
    .groupBy(postings.title)
    .orderBy(desc(count()))
    .limit(10);
    return results;
}

// Get jobs with company info

export async function getRecentJobs(limit = 10){
    const results = await db.select({
        job_id: postings.job_id,
        title: postings.title,
        company_name: postings.company_name,
        location: postings.location,
        minSalary: postings.min_salary,
        maxSalary: postings.max_salary,
        listed_time: postings.listed_time,
    })
    .from(postings)
    .leftJoin(companies, sql`${postings.company_id} = ${companies.company_id}`)
    .orderBy(desc(postings.listed_time))
    .limit(limit);

    return results;
}

// Trending skills

export async function getTrendingSkills(limit = 10) {
try{
  const results = await db
    .select({
      skill_abr: job_skills.skill_abr,
      skill_name: skills.skill_name,
      count: count(),
    })
    .from(job_skills)
    .innerJoin(postings, sql`${job_skills.job_id} = ${postings.job_id}`)
    .innerJoin(skills, sql`${job_skills.skill_abr} = ${skills.skill_abr}`)
    //.where(sql`${postings.listed_time} >= CURRENT_TIMESTAMP - INTERVAL '7 days'`) // **UNCOMMENT ONCE UP-TO-DATE DATA IS AVAILABLE **
    .groupBy(job_skills.skill_abr, skills.skill_name)
    .orderBy(desc(count()))
    .limit(limit);


  return results;
} catch (error) {
  console.error("Error fetching trending skills:", error);
  throw error;
}
}

export async function getTopJobRoles(limit = 20){ 
  const results = await db .select({ 
  title: postings.title, 
  count: count(), }) 
  .from(postings) 
  .groupBy(postings.title) 
  .orderBy(desc(count())) 
  .limit(limit); 
  return results;
}

export async function getTopRolesTimeSeries(
  topN = 20
): Promise<{ title: string; day: string; count: number }[]> {
  const top = await getTopJobRoles(topN);
  return top.map((r: any) => ({
    title: String(r.title),
    day: "", // no time-series available; single aggregate point
    count: Number(r.count),
  }));
}

// Get jobs by role title
export async function getJobsByRole(roleTitle: string, limit = 100) {
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
      .where(eq(postings.title, roleTitle))
      .orderBy(desc(postings.listed_time))
      .limit(limit);
    
    return results;
  } catch (error) {
    console.error('Error fetching jobs by role:', error);
    throw error;
  }
}

// Get top skills for a given role
export async function getTopSkillsForRole(roleTitle: string, limit = 10) {
  try {
    const results = await db
      .select({
        skill_name: skills.skill_name,
        skill_abr: skills.skill_abr,
        count: count(),
      })
      .from(job_skills)
      .innerJoin(postings, eq(job_skills.job_id, postings.job_id))
      .innerJoin(skills, eq(job_skills.skill_abr, skills.skill_abr))
      .where(eq(postings.title, roleTitle))
      .groupBy(skills.skill_name, skills.skill_abr)
      .orderBy(desc(count()))
      .limit(limit);
    
    return results;
  } catch (error) {
    console.error('Error fetching skills for role:', error);
    throw error;
  }
}


// Get top companies hiring for a given role
export async function getTopCompaniesForRole(roleTitle: string, limit = 10) {
  try {
    const results = await db
      .select({
        company_name: postings.company_name,
        count: count(),
      })
      .from(postings)
      .where(eq(postings.title, roleTitle))
      .groupBy(postings.company_name)
      .orderBy(desc(count()))
      .limit(limit);
    
    return results;
  } catch (error) {
    console.error('Error fetching companies for role:', error);
    throw error;
  }
}

// Get role statistics
export async function getRoleStats(roleTitle: string) {
  try {
    const results = await db
      .select({
        total_jobs: count(),
        avg_min_salary: sql<number>`AVG(CAST(${postings.min_salary} AS DECIMAL))`,
        avg_max_salary: sql<number>`AVG(CAST(${postings.max_salary} AS DECIMAL))`,
      })
      .from(postings)
      .where(eq(postings.title, roleTitle));
    
    return results[0] || { total_jobs: 0, avg_min_salary: null, avg_max_salary: null };
  } catch (error) {
    console.error('Error fetching role stats:', error);
    throw error;
  }
}

// Get data quality metrics for a role where there is not missing skill data.
export async function getRoleDataQuality(roleTitle: string) {
  const result = await db
    .select({
      count: count(),
    })
    .from(postings)
    .leftJoin(job_skills, eq(postings.job_id, job_skills.job_id))
    .where(sql`${postings.title} = ${roleTitle} AND ${job_skills.job_id} IS NULL`);
    
  return result[0]?.count ?? 0;
}