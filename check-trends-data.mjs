import 'dotenv/config';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

async function checkTrendsData() {
  console.log('🔍 Checking postings date range...\n');
  
  // Check postings date range
  const dateRange = await db.execute(sql`
    SELECT 
      MAX(listed_time) as max_date,
      MIN(listed_time) as min_date,
      COUNT(*) as total_postings,
      COUNT(DISTINCT listed_time::date) as distinct_days
    FROM postings
  `);
  
  console.log('📅 Postings Date Range:');
  console.log(JSON.stringify(dateRange.rows[0], null, 2));
  
  // Check current period (last 30 days from max_date)
  const currentPeriod = await db.execute(sql`
    WITH date_bounds AS (
      SELECT MAX(listed_time) as max_date FROM postings
    )
    SELECT 
      COUNT(DISTINCT p.job_id) as job_count,
      COUNT(DISTINCT s.skill_name) as unique_skills,
      MIN(p.listed_time) as period_start,
      MAX(p.listed_time) as period_end
    FROM postings p
    INNER JOIN job_skills js ON p.job_id = js.job_id
    INNER JOIN skills s ON js.skill_abr = s.skill_abr
    CROSS JOIN date_bounds db
    WHERE p.listed_time >= (db.max_date - INTERVAL '30 days')
  `);
  
  console.log('\n📊 Current Period (Last 30 days from max_date):');
  console.log(JSON.stringify(currentPeriod.rows[0], null, 2));
  
  // Check skills with > 5 postings in current period
  const skillCounts = await db.execute(sql`
    WITH date_bounds AS (
      SELECT MAX(listed_time) as max_date FROM postings
    )
    SELECT 
      s.skill_name,
      COUNT(*)::int as posting_count
    FROM skills s
    INNER JOIN job_skills js ON s.skill_abr = js.skill_abr
    INNER JOIN postings p ON js.job_id = p.job_id
    CROSS JOIN date_bounds db
    WHERE p.listed_time >= (db.max_date - INTERVAL '30 days')
    GROUP BY s.skill_name
    HAVING COUNT(*) > 5
    ORDER BY posting_count DESC
    LIMIT 10
  `);
  
  console.log('\n🔥 Top Skills (with > 5 postings):');
  console.log(JSON.stringify(skillCounts.rows, null, 2));
  
  if (skillCounts.rows.length === 0) {
    console.log('\n⚠️  NO SKILLS met the HAVING COUNT(*) > 5 threshold!');
    console.log('This is why getTrendingSkills() returns empty array.');
  }
  
  process.exit(0);
}

checkTrendsData().catch(console.error);
