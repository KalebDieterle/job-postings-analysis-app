import { db } from '../db/index';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function testTrendQueries() {
  console.log('Testing getTrendingSkills query...\n');

  // This is the exact query from getTrendingSkills in queries.ts
  const skillsResult = await db.execute(sql`
    WITH current_period AS (
      SELECT 
        s.skill_name as name,
        COUNT(*)::int as count,
        COALESCE(AVG(p.yearly_min_salary) FILTER (WHERE p.yearly_min_salary > 0), 0)::float as avg_salary
      FROM "skills" s
      INNER JOIN "job_skills" js ON s.skill_abr = js.skill_abr
      INNER JOIN "postings" p ON js.job_id = p.job_id
      WHERE p.listed_time >= '2026-02-13' AND p.listed_time < '2026-02-16'
      GROUP BY s.skill_name
      HAVING COUNT(*) > 0
    ),
    previous_period AS (
      SELECT 
        s.skill_name as name,
        COUNT(*)::int as count,
        COALESCE(AVG(p.yearly_min_salary) FILTER (WHERE p.yearly_min_salary > 0), 0)::float as avg_salary
      FROM "skills" s
      INNER JOIN "job_skills" js ON s.skill_abr = js.skill_abr
      INNER JOIN "postings" p ON js.job_id = p.job_id
      WHERE p.listed_time >= '2024-04-05' AND p.listed_time < '2024-04-21'
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
    ORDER BY growth_percentage DESC
    LIMIT 10
  `);

  const output = {
    trendingSkillsCount: skillsResult.rows.length,
    trendingSkills: skillsResult.rows,
  };

  const outFile = path.join(process.cwd(), 'trends_query_test.json');
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`Wrote ${skillsResult.rows.length} trending skills to ${outFile}`);
}

testTrendQueries().catch(console.error);
