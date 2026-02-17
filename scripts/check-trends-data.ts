import { db } from '../db/index';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function checkTrendsData() {
  console.log('🔍 Checking latest date with VALID skill data...\n');
  
  // Check latest posting that has an entry in job_skills
  const result = await db.execute(sql`
    SELECT 
      MAX(p.listed_time) as latest_valid_date,
      COUNT(*) as total_valid_postings
    FROM postings p
    JOIN job_skills js ON p.job_id = js.job_id
  `);
  
  const latest = result.rows[0];
  
  // Check distribution
  const distribution = await db.execute(sql`
    SELECT 
      DATE(p.listed_time) as posting_date,
      COUNT(*) as count
    FROM postings p
    JOIN job_skills js ON p.job_id = js.job_id
    GROUP BY DATE(p.listed_time)
    ORDER BY posting_date DESC
    LIMIT 5
  `);

  const output = `
📅 Latest Valid Skill Date: ${latest.latest_valid_date}
📊 Total Postings with Skills: ${latest.total_valid_postings}

Recent days with skill data:
${JSON.stringify(distribution.rows, null, 2)}
  `;
  
  console.log(output);

  try {
    const outFile = path.join(process.cwd(), 'trend_diagnosis.txt');
    console.log('Writing to:', outFile);
    fs.writeFileSync(outFile, output);
    console.log('Successfully wrote diagnosis to file');
  } catch (err) {
    console.error('Failed to write file:', err);
  }
}

checkTrendsData().catch(console.error);
