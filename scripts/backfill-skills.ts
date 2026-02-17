#!/usr/bin/env node
// scripts/backfill-skills.ts
// Backfills job_skills associations for postings that are missing them.
// Uses keyword matching against title + description to map jobs to functional skill categories.

import 'dotenv/config';
import { db } from '../db/index';
import { sql } from 'drizzle-orm';

/**
 * Keyword dictionary mapping each skill_abr to trigger words/phrases.
 * Uses word-boundary-aware matching to prevent false positives.
 * 
 * Each entry: [skill_abr, [keywords...]]
 * Keywords are matched case-insensitively against (title + ' ' + description).
 */
const SKILL_KEYWORDS: [string, string[]][] = [
  ['ACCT', ['accounting', 'auditing', 'bookkeeping', 'cpa', 'tax compliance', 'accounts payable', 'accounts receivable']],
  ['ADM', ['administrative', 'office manager', 'receptionist', 'executive assistant', 'office coordinator', 'clerical']],
  ['ADVR', ['advertising', 'media buyer', 'ad campaign', 'brand awareness', 'media planning', 'copywriter']],
  ['ANLS', ['analyst', 'analytics', 'data analysis', 'business intelligence', 'reporting', 'insights', 'tableau', 'power bi']],
  ['ART', ['graphic design', 'creative director', 'illustrator', 'visual design', 'ui artist', 'art director']],
  ['BD', ['business development', 'partnerships', 'strategic alliance', 'client acquisition', 'growth strategy']],
  ['CNSL', ['consulting', 'consultant', 'advisory', 'strategy consulting']],
  ['CUST', ['customer service', 'customer support', 'client success', 'customer experience', 'helpdesk', 'call center', 'support specialist']],
  ['DSGN', ['designer', 'ux design', 'ui design', 'product design', 'interaction design', 'figma', 'user experience', 'user interface']],
  ['DIST', ['distribution', 'logistics', 'warehouse', 'shipping', 'fulfillment', 'supply chain logistics']],
  ['EDU', ['education', 'training specialist', 'curriculum', 'instructional', 'teaching', 'e-learning', 'learning management']],
  ['ENG', ['engineer', 'engineering', 'devops', 'sre', 'infrastructure', 'backend', 'frontend', 'fullstack', 'full stack', 'full-stack', 'embedded', 'systems engineer']],
  ['FIN', ['finance', 'financial', 'fiscal', 'treasury', 'investment', 'portfolio', 'wealth management', 'fintech']],
  ['GENB', ['general business', 'operations', 'business operations', 'business analyst', 'process improvement', 'business process']],
  ['HCPR', ['healthcare', 'health care', 'clinical', 'nursing', 'physician', 'medical', 'patient care', 'pharmacy', 'therapist']],
  ['HR', ['human resources', 'recruiting', 'recruiter', 'talent acquisition', 'people operations', 'hris', 'compensation', 'benefits specialist', 'onboarding']],
  ['IT', ['software', 'developer', 'programmer', 'information technology', 'computing', 'tech lead', 'technical lead', 'platform', 'cloud', 'aws', 'azure', 'gcp', 'cybersecurity', 'security engineer', 'network engineer', 'sysadmin', 'devops']],
  ['LGL', ['legal', 'attorney', 'lawyer', 'paralegal', 'compliance', 'regulatory', 'contracts', 'litigation', 'intellectual property']],
  ['MGMT', ['manager', 'management', 'director', 'vice president', 'vp ', 'head of', 'lead', 'supervisor', 'team lead', 'principal']],
  ['MNFC', ['manufacturing', 'production engineer', 'plant manager', 'assembly', 'fabrication', 'lean manufacturing', 'six sigma']],
  ['MRKT', ['marketing', 'seo', 'sem', 'content marketing', 'digital marketing', 'social media', 'brand manager', 'growth marketing', 'demand generation']],
  ['OTHR', []], // No keywords — catch-all, not matched by keywords
  ['PRDM', ['product manager', 'product management', 'product owner', 'product lead', 'product strategy', 'roadmap']],
  ['PROD', ['production', 'manufacturing', 'assembly line', 'quality control', 'production planning']],
  ['PRJM', ['project manager', 'project management', 'scrum master', 'agile coach', 'pmp', 'program manager', 'program management', 'jira']],
  ['PR', ['public relations', 'communications', 'press', 'media relations', 'corporate communications', 'spokesperson']],
  ['PRCH', ['purchasing', 'procurement', 'sourcing', 'vendor management', 'supply chain', 'buyer']],
  ['QA', ['quality assurance', 'qa engineer', 'test engineer', 'testing', 'automation testing', 'sdet', 'test automation', 'quality engineer']],
  ['RSCH', ['research', 'researcher', 'r&d', 'research and development', 'scientific research', 'clinical research', 'market research']],
  ['SALE', ['sales', 'account executive', 'account manager', 'revenue', 'quota', 'sales engineer', 'inside sales', 'outside sales', 'business development representative']],
  ['SCI', ['science', 'scientist', 'biology', 'chemistry', 'physics', 'lab ', 'laboratory', 'bioinformatics', 'data scientist']],
  ['STRA', ['strategy', 'strategic planning', 'corporate strategy', 'business strategy', 'strategy analyst', 'chief strategy']],
  ['SUPL', ['supply chain', 'procurement', 'inventory', 'sourcing', 'supplier', 'demand planning', 'logistics']],
  ['TRNG', ['training', 'trainer', 'learning and development', 'l&d', 'corporate training', 'skills development', 'onboarding training']],
  ['WRT', ['writing', 'editing', 'editor', 'copywriting', 'technical writer', 'content writer', 'content creator', 'documentation']],
];

/**
 * Match skills for a given title + description using word-boundary-aware matching.
 * Returns array of matched skill_abr values.
 */
function matchSkills(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const matched: string[] = [];

  for (const [skillAbr, keywords] of SKILL_KEYWORDS) {
    if (keywords.length === 0) continue; // Skip OTHR (no keywords)

    for (const keyword of keywords) {
      // Word boundary check: ensure the keyword isn't part of a larger word
      // e.g., "java" should not match "javascript"
      const kw = keyword.toLowerCase();
      const idx = text.indexOf(kw);
      if (idx === -1) continue;

      // Check word boundaries
      const charBefore = idx > 0 ? text[idx - 1] : ' ';
      const charAfter = idx + kw.length < text.length ? text[idx + kw.length] : ' ';

      const isWordBoundaryBefore = /[\s,;:.()\-\/]/.test(charBefore) || idx === 0;
      // For multi-word keywords, we don't require a strict boundary after
      // (e.g., "project manag" should match "project management" and "project manager")
      const isWordBoundaryAfter = kw.includes(' ') || /[\s,;:.()\-\/]/.test(charAfter) || (idx + kw.length === text.length);

      if (isWordBoundaryBefore && isWordBoundaryAfter) {
        matched.push(skillAbr);
        break; // One match per skill is enough
      }
    }
  }

  return matched;
}

/**
 * Main backfill function
 */
async function backfillSkills() {
  console.log('🔧 SKILL BACKFILL SCRIPT\n');
  console.log('='.repeat(60));

  // Step 1: Verify skill_abr values in our dictionary match the DB
  const dbSkills = await db.execute(sql`SELECT skill_abr FROM skills ORDER BY skill_abr`);
  const dbSkillAbrs = new Set(dbSkills.rows.map((r: any) => r.skill_abr));
  const dictSkillAbrs = new Set(SKILL_KEYWORDS.map(([abr]) => abr));

  const missingInDb = [...dictSkillAbrs].filter(a => !dbSkillAbrs.has(a));
  const missingInDict = [...dbSkillAbrs].filter(a => !dictSkillAbrs.has(a));

  if (missingInDb.length > 0) {
    console.log(`⚠️  Skills in dictionary but NOT in DB: ${missingInDb.join(', ')}`);
  }
  if (missingInDict.length > 0) {
    console.log(`ℹ️  Skills in DB but NOT in dictionary: ${missingInDict.join(', ')}`);
  }

  console.log(`\n📋 Skills dictionary: ${SKILL_KEYWORDS.length} categories`);
  console.log(`📋 Skills in database: ${dbSkillAbrs.size} categories\n`);

  // Step 2: Load Feb 2026 postings
  const postingsResult = await db.execute(sql`
    SELECT job_id, title, description
    FROM postings
    WHERE listed_time >= '2026-02-13' AND listed_time < '2026-02-16'
  `);

  const jobs = postingsResult.rows as { job_id: string; title: string; description: string }[];
  console.log(`📊 Found ${jobs.length} Feb 2026 postings to process\n`);

  if (jobs.length === 0) {
    console.log('❌ No postings found. Exiting.');
    process.exit(0);
  }

  // Step 3: Check for existing job_skills entries (avoid duplicates)
  const existingCheck = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM job_skills js
    JOIN postings p ON js.job_id = p.job_id
    WHERE p.listed_time >= '2026-02-13' AND p.listed_time < '2026-02-16'
  `);
  const existingCount = Number((existingCheck.rows[0] as any).count);

  if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing job_skills entries for Feb 2026 postings.`);
    console.log('   These will be skipped (ON CONFLICT DO NOTHING).\n');
  }

  // Step 4: Match skills and collect inserts
  let totalPairs = 0;
  let jobsWithSkills = 0;
  let jobsWithoutSkills = 0;
  const skillCounts: Record<string, number> = {};
  const allPairs: { job_id: string; skill_abr: string }[] = [];

  for (const job of jobs) {
    const matched = matchSkills(job.title, job.description || '');

    if (matched.length > 0) {
      jobsWithSkills++;
      for (const skillAbr of matched) {
        // Only insert if skill_abr exists in DB
        if (dbSkillAbrs.has(skillAbr)) {
          allPairs.push({ job_id: job.job_id, skill_abr: skillAbr });
          skillCounts[skillAbr] = (skillCounts[skillAbr] || 0) + 1;
          totalPairs++;
        }
      }
    } else {
      jobsWithoutSkills++;
    }
  }

  console.log(`✅ Matching complete:`);
  console.log(`   Jobs with skill matches: ${jobsWithSkills} (${((jobsWithSkills / jobs.length) * 100).toFixed(1)}%)`);
  console.log(`   Jobs without matches:    ${jobsWithoutSkills}`);
  console.log(`   Total (job, skill) pairs: ${totalPairs}`);
  console.log(`   Avg skills per matched job: ${(totalPairs / Math.max(jobsWithSkills, 1)).toFixed(1)}\n`);

  // Show skill distribution
  console.log('📊 Skill Distribution:');
  const sorted = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]);
  for (const [abr, count] of sorted) {
    const pct = ((count / jobs.length) * 100).toFixed(1);
    console.log(`   ${abr.padEnd(6)} → ${String(count).padStart(5)} jobs (${pct}%)`);
  }
  console.log('');

  // Step 5: Batch insert into job_skills
  console.log(`💾 Inserting ${totalPairs} skill associations...`);

  const BATCH_SIZE = 500;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < allPairs.length; i += BATCH_SIZE) {
    const batch = allPairs.slice(i, i + BATCH_SIZE);

    // Build VALUES clause for batch insert
    const valuesClauses = batch.map(
      p => sql`(${p.job_id}, ${p.skill_abr})`
    );

    try {
      // Use raw SQL for batch insert with ON CONFLICT
      const result = await db.execute(sql`
        INSERT INTO job_skills (job_id, skill_abr)
        VALUES ${sql.join(valuesClauses, sql`, `)}
        ON CONFLICT DO NOTHING
      `);

      const batchInserted = Number(result.rowCount ?? batch.length);
      inserted += batchInserted;
      skipped += batch.length - batchInserted;

      const progress = Math.min(i + BATCH_SIZE, allPairs.length);
      console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchInserted} inserted, ${batch.length - batchInserted} skipped (${progress}/${allPairs.length})`);
    } catch (error: any) {
      console.error(`   ❌ Batch error:`, error.message);
      // Fall back to individual inserts for this batch
      for (const pair of batch) {
        try {
          await db.execute(sql`
            INSERT INTO job_skills (job_id, skill_abr)
            VALUES (${pair.job_id}, ${pair.skill_abr})
            ON CONFLICT DO NOTHING
          `);
          inserted++;
        } catch {
          skipped++;
        }
      }
    }
  }

  console.log(`\n✅ BACKFILL COMPLETE`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Skipped (already existed): ${skipped}`);

  // Step 6: Verify
  const verifyResult = await db.execute(sql`
    SELECT COUNT(*) as total_skills
    FROM job_skills js
    JOIN postings p ON js.job_id = p.job_id
    WHERE p.listed_time >= '2026-02-13' AND p.listed_time < '2026-02-16'
  `);
  console.log(`\n📊 Verification: ${(verifyResult.rows[0] as any).total_skills} total job_skills entries for Feb 2026 postings`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Backfill completed successfully!\n');

  process.exit(0);
}

backfillSkills().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
