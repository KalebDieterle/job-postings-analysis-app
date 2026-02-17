import { db } from '../db/index';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function querySkills() {
  // Get all skills
  const allSkills = await db.execute(sql`
    SELECT skill_abr, skill_name 
    FROM skills 
    ORDER BY skill_name
  `);
  
  // Get sample Feb 2026 posting descriptions
  const samplePostings = await db.execute(sql`
    SELECT job_id, title, LEFT(description, 500) as desc_snippet
    FROM postings
    WHERE listed_time >= '2026-02-13' AND listed_time < '2026-02-16'
    LIMIT 5
  `);

  // Get count of postings with non-null description
  const descCounts = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(description) as with_desc,
      COUNT(*) FILTER (WHERE LENGTH(description) > 100) as long_desc
    FROM postings
    WHERE listed_time >= '2026-02-13' AND listed_time < '2026-02-16'
  `);

  const output = {
    totalSkills: allSkills.rows.length,
    skills: allSkills.rows,
    descriptionCounts: descCounts.rows[0],
    samplePostings: samplePostings.rows,
  };

  const outFile = path.join(process.cwd(), 'skills_analysis.json');
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`Wrote ${allSkills.rows.length} skills to ${outFile}`);
}

querySkills().catch(console.error);
