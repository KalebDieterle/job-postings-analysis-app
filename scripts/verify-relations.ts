#!/usr/bin/env node
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../db/index';

type IntegrityCheck = {
  name: string;
  value: number;
  threshold: number;
  passed: boolean;
};

const MAX_ORPHAN_JOB_SKILLS_POSTINGS = Number(
  process.env.VERIFY_MAX_ORPHAN_JOB_SKILLS_POSTINGS ?? 0,
);
const MAX_ORPHAN_JOB_INDUSTRIES_POSTINGS = Number(
  process.env.VERIFY_MAX_ORPHAN_JOB_INDUSTRIES_POSTINGS ?? 0,
);
const MAX_ORPHAN_BENEFITS_POSTINGS = Number(
  process.env.VERIFY_MAX_ORPHAN_BENEFITS_POSTINGS ?? 0,
);
const MAX_ORPHAN_SALARIES_POSTINGS = Number(
  process.env.VERIFY_MAX_ORPHAN_SALARIES_POSTINGS ?? 0,
);
const MAX_DUPLICATE_JOB_SKILLS_PAIRS = Number(
  process.env.VERIFY_MAX_DUPLICATE_JOB_SKILLS_PAIRS ?? 0,
);
const MAX_DUPLICATE_JOB_INDUSTRIES_PAIRS = Number(
  process.env.VERIFY_MAX_DUPLICATE_JOB_INDUSTRIES_PAIRS ?? 0,
);

async function getCount(query: ReturnType<typeof sql>): Promise<number> {
  const result = await db.execute<{ count: number }>(query);
  return Number(result.rows[0]?.count ?? 0);
}

function render(checks: IntegrityCheck[]) {
  const failed = checks.filter((check) => !check.passed);
  const passed = failed.length === 0;

  console.log(`\n[verify:relations] ${passed ? 'PASS' : 'FAIL'}`);
  checks.forEach((check) => {
    const status = check.passed ? 'PASS' : 'FAIL';
    console.log(
      `- ${status}: ${check.name} = ${check.value.toLocaleString()} (threshold ${check.threshold.toLocaleString()})`,
    );
  });

  if (!passed) {
    process.exitCode = 1;
  }
}

async function main() {
  const [
    orphanJobSkillsPostings,
    orphanJobIndustriesPostings,
    orphanBenefitsPostings,
    orphanSalariesPostings,
    duplicateJobSkillsPairs,
    duplicateJobIndustriesPairs,
  ] = await Promise.all([
    getCount(sql`
      SELECT COUNT(*)::int AS count
      FROM job_skills js
      LEFT JOIN postings p ON p.job_id = js.job_id
      WHERE p.job_id IS NULL
    `),
    getCount(sql`
      SELECT COUNT(*)::int AS count
      FROM job_industries ji
      LEFT JOIN postings p ON p.job_id = ji.job_id
      WHERE p.job_id IS NULL
    `),
    getCount(sql`
      SELECT COUNT(*)::int AS count
      FROM benefits b
      LEFT JOIN postings p ON p.job_id = b.job_id
      WHERE p.job_id IS NULL
    `),
    getCount(sql`
      SELECT COUNT(*)::int AS count
      FROM salaries s
      LEFT JOIN postings p ON p.job_id = s.job_id
      WHERE p.job_id IS NULL
    `),
    getCount(sql`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT js.job_id, js.skill_abr
        FROM job_skills js
        GROUP BY js.job_id, js.skill_abr
        HAVING COUNT(*) > 1
      ) d
    `),
    getCount(sql`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT ji.job_id, ji.industry_id
        FROM job_industries ji
        GROUP BY ji.job_id, ji.industry_id
        HAVING COUNT(*) > 1
      ) d
    `),
  ]);

  const checks: IntegrityCheck[] = [
    {
      name: 'orphan job_skills -> postings',
      value: orphanJobSkillsPostings,
      threshold: MAX_ORPHAN_JOB_SKILLS_POSTINGS,
      passed: orphanJobSkillsPostings <= MAX_ORPHAN_JOB_SKILLS_POSTINGS,
    },
    {
      name: 'orphan job_industries -> postings',
      value: orphanJobIndustriesPostings,
      threshold: MAX_ORPHAN_JOB_INDUSTRIES_POSTINGS,
      passed: orphanJobIndustriesPostings <= MAX_ORPHAN_JOB_INDUSTRIES_POSTINGS,
    },
    {
      name: 'orphan benefits -> postings',
      value: orphanBenefitsPostings,
      threshold: MAX_ORPHAN_BENEFITS_POSTINGS,
      passed: orphanBenefitsPostings <= MAX_ORPHAN_BENEFITS_POSTINGS,
    },
    {
      name: 'orphan salaries -> postings',
      value: orphanSalariesPostings,
      threshold: MAX_ORPHAN_SALARIES_POSTINGS,
      passed: orphanSalariesPostings <= MAX_ORPHAN_SALARIES_POSTINGS,
    },
    {
      name: 'duplicate job_skills pairs',
      value: duplicateJobSkillsPairs,
      threshold: MAX_DUPLICATE_JOB_SKILLS_PAIRS,
      passed: duplicateJobSkillsPairs <= MAX_DUPLICATE_JOB_SKILLS_PAIRS,
    },
    {
      name: 'duplicate job_industries pairs',
      value: duplicateJobIndustriesPairs,
      threshold: MAX_DUPLICATE_JOB_INDUSTRIES_PAIRS,
      passed: duplicateJobIndustriesPairs <= MAX_DUPLICATE_JOB_INDUSTRIES_PAIRS,
    },
  ];

  render(checks);
}

main().catch((error) => {
  console.error('[verify:relations] fatal error', error);
  process.exit(1);
});
