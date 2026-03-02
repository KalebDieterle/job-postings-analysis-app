import { sql } from "drizzle-orm";
import { db } from "../../db";
import { getTrendingStats } from "../../db/queries";
import { fetchWithTimeout, finalizeRun, getBaseUrl } from "./_helpers";
import type { QaCheckResult } from "./_types";

const MAX_NULL_CRITICAL_FIELDS = Number(
  process.env.QA_MAX_NULL_CRITICAL_FIELDS ?? 10,
);
const MAX_ORPHAN_JOB_SKILLS_POSTINGS = Number(
  process.env.QA_MAX_ORPHAN_JOB_SKILLS_POSTINGS ?? 250000,
);

async function getCount(query: ReturnType<typeof sql>): Promise<number> {
  const result = await db.execute<{ count: number }>(query);
  return Number(result.rows[0]?.count ?? 0);
}

async function main() {
  const startedAt = new Date();
  const checks: QaCheckResult[] = [];

  const invalidSalaryOrder = await getCount(sql`
    SELECT COUNT(*)::int as count
    FROM postings p
    WHERE p.yearly_min_salary IS NOT NULL
      AND p.yearly_max_salary IS NOT NULL
      AND p.yearly_max_salary < p.yearly_min_salary
  `);

  checks.push({
    name: "Salary ordering integrity",
    passed: invalidSalaryOrder === 0,
    details: `${invalidSalaryOrder} rows with yearly_max_salary < yearly_min_salary`,
    severity: invalidSalaryOrder === 0 ? "low" : "high",
  });

  const nullCriticalFields = await getCount(sql`
    SELECT COUNT(*)::int as count
    FROM postings p
    WHERE p.job_id IS NULL
      OR p.title IS NULL
      OR p.company_name IS NULL
      OR p.listed_time IS NULL
      OR p.job_posting_url IS NULL
  `);

  checks.push({
    name: "Critical posting fields non-null",
    passed: nullCriticalFields <= MAX_NULL_CRITICAL_FIELDS,
    details: `${nullCriticalFields} rows with null critical fields (threshold ${MAX_NULL_CRITICAL_FIELDS})`,
    severity:
      nullCriticalFields <= MAX_NULL_CRITICAL_FIELDS ? "low" : "critical",
  });

  const orphanJobSkillsPosting = await getCount(sql`
    SELECT COUNT(*)::int as count
    FROM job_skills js
    LEFT JOIN postings p ON p.job_id = js.job_id
    WHERE p.job_id IS NULL
  `);

  checks.push({
    name: "No orphan job_skills -> postings",
    passed: orphanJobSkillsPosting <= MAX_ORPHAN_JOB_SKILLS_POSTINGS,
    details: `${orphanJobSkillsPosting} orphan rows (threshold ${MAX_ORPHAN_JOB_SKILLS_POSTINGS})`,
    severity:
      orphanJobSkillsPosting <= MAX_ORPHAN_JOB_SKILLS_POSTINGS
        ? "low"
        : "critical",
  });

  const orphanJobSkillsSkill = await getCount(sql`
    SELECT COUNT(*)::int as count
    FROM job_skills js
    LEFT JOIN skills s ON s.skill_abr = js.skill_abr
    WHERE s.skill_abr IS NULL
  `);

  checks.push({
    name: "No orphan job_skills -> skills",
    passed: orphanJobSkillsSkill === 0,
    details: `${orphanJobSkillsSkill} orphan rows`,
    severity: orphanJobSkillsSkill === 0 ? "low" : "critical",
  });

  const outOfBoundsSalaryRows = await getCount(sql`
    SELECT COUNT(*)::int as count
    FROM postings p
    WHERE p.yearly_min_salary IS NOT NULL
      AND (p.yearly_min_salary < 20000 OR p.yearly_min_salary > 500000)
  `);

  const boundedSalaryRows = await getCount(sql`
    SELECT COUNT(*)::int as count
    FROM postings p
    WHERE p.yearly_min_salary IS NOT NULL
  `);

  const outlierRate =
    boundedSalaryRows > 0 ? outOfBoundsSalaryRows / boundedSalaryRows : 0;

  checks.push({
    name: "Salary bound sanity signal",
    passed: outlierRate <= 0.05,
    details: `${outOfBoundsSalaryRows}/${boundedSalaryRows} out-of-bounds rows (${(outlierRate * 100).toFixed(2)}%)`,
    severity: outlierRate <= 0.05 ? "low" : "medium",
  });

  const continuityResult = await db.execute<{ current_count: number; previous_count: number }>(sql`
    WITH anchor AS (
      SELECT MAX(p.listed_time) AS anchor_ts
      FROM postings p
    )
    SELECT
      COUNT(*) FILTER (
        WHERE p.listed_time >= a.anchor_ts - INTERVAL '7 days'
          AND p.listed_time <= a.anchor_ts
      )::int as current_count,
      COUNT(*) FILTER (
        WHERE p.listed_time >= a.anchor_ts - INTERVAL '14 days'
          AND p.listed_time < a.anchor_ts - INTERVAL '7 days'
      )::int as previous_count
    FROM postings p
    CROSS JOIN anchor a
  `);

  const currentCount = Number(continuityResult.rows[0]?.current_count ?? 0);
  const previousCount = Number(continuityResult.rows[0]?.previous_count ?? 0);

  checks.push({
    name: "Recent source continuity signal (anchored weekly windows)",
    passed: currentCount === 0 || previousCount > 0,
    details: `current_7d=${currentCount}, previous_7d=${previousCount}`,
    severity: currentCount === 0 || previousCount > 0 ? "low" : "medium",
  });

  const trendStats = await getTrendingStats(7);
  checks.push({
    name: "Trending baseline mode is available",
    passed: trendStats.comparisonMode !== "none",
    details: `comparisonMode=${trendStats.comparisonMode}`,
    severity: trendStats.comparisonMode !== "none" ? "low" : "medium",
  });

  const healthResponse = await fetchWithTimeout(`${getBaseUrl()}/api/skills?page=1&limit=1`);
  checks.push({
    name: "API reachable during data checks",
    passed: healthResponse.status === 200,
    details: `status ${healthResponse.status}`,
    severity: healthResponse.status === 200 ? "low" : "high",
  });

  finalizeRun("qa:data-integrity", checks, startedAt);
}

main().catch((error) => {
  console.error("qa:data-integrity failed", error);
  process.exit(1);
});

