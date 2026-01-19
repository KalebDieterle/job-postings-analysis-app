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
