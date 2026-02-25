#!/usr/bin/env tsx
import assert from "assert";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getTotalStats } from "@/db/queries";

const VALID_ANNUAL_SALARY_MIN = 20_000;
const VALID_ANNUAL_SALARY_MAX = 500_000;

async function run() {
  const stats = await getTotalStats();

  const result = await db.execute<{
    expected_median: number;
    expected_sample_size: number;
  }>(sql`
    WITH salary_data AS (
      SELECT p.yearly_min_salary
      FROM postings p
      WHERE p.yearly_min_salary IS NOT NULL
        AND p.yearly_min_salary BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
        AND (
          p.yearly_max_salary IS NULL OR (
            p.yearly_max_salary BETWEEN ${VALID_ANNUAL_SALARY_MIN} AND ${VALID_ANNUAL_SALARY_MAX}
            AND p.yearly_max_salary >= p.yearly_min_salary
          )
        )
    )
    SELECT
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY yearly_min_salary))::int AS expected_median,
      COUNT(*)::int AS expected_sample_size
    FROM salary_data;
  `);

  const expected = result.rows[0];

  assert.equal(
    stats.medianSalary,
    Number(expected.expected_median),
    "medianSalary should match DB filtered median"
  );
  assert.equal(
    stats.salarySampleSize,
    Number(expected.expected_sample_size),
    "salarySampleSize should match filtered row count"
  );

  console.log("✅ Salary query correctness tests passed");
}

run().catch((err) => {
  console.error("❌ Salary query tests failed:", err);
  process.exit(1);
});
