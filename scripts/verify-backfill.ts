import { db } from '../db/index';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function verify() {
  // Count total job_skills for Feb 2026
  const totalResult = await db.execute(sql`
    SELECT COUNT(*) as total
    FROM job_skills js
    JOIN postings p ON js.job_id = p.job_id
    WHERE p.listed_time >= '2026-02-13' AND p.listed_time < '2026-02-16'
  `);

  // Count unique jobs with skills
  const uniqueJobsResult = await db.execute(sql`
    SELECT COUNT(DISTINCT js.job_id) as unique_jobs
    FROM job_skills js
    JOIN postings p ON js.job_id = p.job_id
    WHERE p.listed_time >= '2026-02-13' AND p.listed_time < '2026-02-16'
  `);

  // Skill distribution
  const distribution = await db.execute(sql`
    SELECT s.skill_name, s.skill_abr, COUNT(*) as count
    FROM job_skills js
    JOIN postings p ON js.job_id = p.job_id
    JOIN skills s ON js.skill_abr = s.skill_abr
    WHERE p.listed_time >= '2026-02-13' AND p.listed_time < '2026-02-16'
    GROUP BY s.skill_name, s.skill_abr
    ORDER BY count DESC
  `);

  const output = {
    totalSkillAssociations: totalResult.rows[0],
    uniqueJobsWithSkills: uniqueJobsResult.rows[0],
    skillDistribution: distribution.rows,
  };

  const outFile = path.join(process.cwd(), 'backfill_verification.json');
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`Wrote verification to ${outFile}`);
}

verify().catch(console.error);
