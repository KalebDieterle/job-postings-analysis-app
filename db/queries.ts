import { db} from './index';
import { postings, companies, skills, job_skills, job_industries, industries, company_industries, company_specialties, employee_counts } 
from './schema';
import { sql, count, desc} from 'drizzle-orm'

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