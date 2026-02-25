#!/usr/bin/env tsx
import fs from "fs";
import path from "path";
import { Pool } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

const APPLY = process.env.SALARY_FIX_APPLY === "true";

interface CountRow {
  hourly_annual_like: number;
  monthly_ratio_ge_100: number;
}

interface ChangeRow {
  job_id: string;
  source: string;
  old_pay_period: string | null;
  new_pay_period: string | null;
  old_min_salary: string | null;
  old_max_salary: string | null;
  old_yearly_min_salary: string | null;
  old_yearly_max_salary: string | null;
  new_yearly_min_salary: string | null;
  new_yearly_max_salary: string | null;
  reason: string;
}

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replaceAll('"', '""')}"`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const csvPath = path.join("/tmp", `salary-fix-changes-${timestamp}.csv`);

  try {
    console.log("🔧 Salary Normalization Fix");
    console.log(APPLY ? "   Mode: APPLY" : "   Mode: DRY-RUN");

    const preCounts = await client.query<CountRow>(`
      SELECT
        COUNT(*) FILTER (
          WHERE source = 'manual'
            AND pay_period = 'HOURLY'
            AND NULLIF(REGEXP_REPLACE(min_salary::text, '[^0-9.-]', '', 'g'), '')::numeric >= 1000
        )::int AS hourly_annual_like,
        COUNT(*) FILTER (
          WHERE source = 'manual'
            AND pay_period = 'MONTHLY'
            AND NULLIF(REGEXP_REPLACE(min_salary::text, '[^0-9.-]', '', 'g'), '')::numeric > 0
            AND yearly_min_salary / NULLIF(REGEXP_REPLACE(min_salary::text, '[^0-9.-]', '', 'g')::numeric, 0) >= 100
        )::int AS monthly_ratio_ge_100
      FROM postings;
    `);

    const summary = preCounts.rows[0];
    console.log(`   Candidates (hourly annual-like): ${summary.hourly_annual_like.toLocaleString()}`);
    console.log(`   Candidates (monthly ratio >= 100): ${summary.monthly_ratio_ge_100.toLocaleString()}`);

    if (!APPLY) {
      const sample = await client.query<ChangeRow>(`
        WITH hourly_candidates AS (
          SELECT
            job_id,
            source,
            pay_period AS old_pay_period,
            'YEARLY'::text AS new_pay_period,
            min_salary::text AS old_min_salary,
            max_salary::text AS old_max_salary,
            yearly_min_salary::text AS old_yearly_min_salary,
            yearly_max_salary::text AS old_yearly_max_salary,
            NULLIF(REGEXP_REPLACE(min_salary::text, '[^0-9.-]', '', 'g'), '')::numeric::text AS new_yearly_min_salary,
            NULLIF(REGEXP_REPLACE(max_salary::text, '[^0-9.-]', '', 'g'), '')::numeric::text AS new_yearly_max_salary,
            'manual_hourly_annual_like'::text AS reason
          FROM postings
          WHERE source = 'manual'
            AND pay_period = 'HOURLY'
            AND NULLIF(REGEXP_REPLACE(min_salary::text, '[^0-9.-]', '', 'g'), '')::numeric >= 1000
        ),
        monthly_candidates AS (
          SELECT
            job_id,
            source,
            pay_period AS old_pay_period,
            pay_period AS new_pay_period,
            min_salary::text AS old_min_salary,
            max_salary::text AS old_max_salary,
            yearly_min_salary::text AS old_yearly_min_salary,
            yearly_max_salary::text AS old_yearly_max_salary,
            (NULLIF(REGEXP_REPLACE(min_salary::text, '[^0-9.-]', '', 'g'), '')::numeric * 12)::text AS new_yearly_min_salary,
            (NULLIF(REGEXP_REPLACE(max_salary::text, '[^0-9.-]', '', 'g'), '')::numeric * 12)::text AS new_yearly_max_salary,
            'manual_monthly_over_annualized'::text AS reason
          FROM postings
          WHERE source = 'manual'
            AND pay_period = 'MONTHLY'
            AND NULLIF(REGEXP_REPLACE(min_salary::text, '[^0-9.-]', '', 'g'), '')::numeric > 0
            AND yearly_min_salary / NULLIF(REGEXP_REPLACE(min_salary::text, '[^0-9.-]', '', 'g')::numeric, 0) >= 100
        )
        SELECT * FROM hourly_candidates
        UNION ALL
        SELECT * FROM monthly_candidates
        ORDER BY reason, job_id
        LIMIT 50;
      `);

      console.log(`   Sample rows: ${sample.rows.length}`);
      console.log("   To apply changes: SALARY_FIX_APPLY=true npm run fix:salary-normalization");
      return;
    }

    await client.query("BEGIN");

    const changed = await client.query<ChangeRow>(`
      WITH hourly_candidates AS (
        SELECT
          p.job_id,
          p.source,
          p.pay_period AS old_pay_period,
          p.min_salary::text AS old_min_salary,
          p.max_salary::text AS old_max_salary,
          p.yearly_min_salary::text AS old_yearly_min_salary,
          p.yearly_max_salary::text AS old_yearly_max_salary,
          NULLIF(REGEXP_REPLACE(p.min_salary::text, '[^0-9.-]', '', 'g'), '')::numeric AS new_yearly_min_salary_num,
          NULLIF(REGEXP_REPLACE(p.max_salary::text, '[^0-9.-]', '', 'g'), '')::numeric AS new_yearly_max_salary_num
        FROM postings p
        WHERE p.source = 'manual'
          AND p.pay_period = 'HOURLY'
          AND NULLIF(REGEXP_REPLACE(p.min_salary::text, '[^0-9.-]', '', 'g'), '')::numeric >= 1000
      ),
      hourly_fix AS (
        UPDATE postings p
        SET
          yearly_min_salary = c.new_yearly_min_salary_num,
          yearly_max_salary = c.new_yearly_max_salary_num,
          med_salary = CASE
            WHEN c.new_yearly_min_salary_num IS NOT NULL AND c.new_yearly_max_salary_num IS NOT NULL
            THEN ROUND((c.new_yearly_min_salary_num + c.new_yearly_max_salary_num) / 2)::numeric
            ELSE NULL
          END,
          yearly_med_salary = CASE
            WHEN c.new_yearly_min_salary_num IS NOT NULL AND c.new_yearly_max_salary_num IS NOT NULL
            THEN ROUND((c.new_yearly_min_salary_num + c.new_yearly_max_salary_num) / 2)::numeric
            ELSE NULL
          END,
          pay_period = 'YEARLY'
        FROM hourly_candidates c
        WHERE p.job_id = c.job_id
        RETURNING
          c.job_id,
          c.source,
          c.old_pay_period,
          p.pay_period AS new_pay_period,
          c.old_min_salary,
          c.old_max_salary,
          c.old_yearly_min_salary,
          c.old_yearly_max_salary,
          c.new_yearly_min_salary_num::text AS new_yearly_min_salary,
          c.new_yearly_max_salary_num::text AS new_yearly_max_salary,
          'manual_hourly_annual_like'::text AS reason
      ),
      monthly_candidates AS (
        SELECT
          p.job_id,
          p.source,
          p.pay_period AS old_pay_period,
          p.min_salary::text AS old_min_salary,
          p.max_salary::text AS old_max_salary,
          p.yearly_min_salary::text AS old_yearly_min_salary,
          p.yearly_max_salary::text AS old_yearly_max_salary,
          (NULLIF(REGEXP_REPLACE(p.min_salary::text, '[^0-9.-]', '', 'g'), '')::numeric * 12) AS new_yearly_min_salary_num,
          (NULLIF(REGEXP_REPLACE(p.max_salary::text, '[^0-9.-]', '', 'g'), '')::numeric * 12) AS new_yearly_max_salary_num
        FROM postings p
        WHERE p.source = 'manual'
          AND p.pay_period = 'MONTHLY'
          AND NULLIF(REGEXP_REPLACE(p.min_salary::text, '[^0-9.-]', '', 'g'), '')::numeric > 0
          AND p.yearly_min_salary / NULLIF(REGEXP_REPLACE(p.min_salary::text, '[^0-9.-]', '', 'g')::numeric, 0) >= 100
      ),
      monthly_fix AS (
        UPDATE postings p
        SET
          yearly_min_salary = c.new_yearly_min_salary_num,
          yearly_max_salary = c.new_yearly_max_salary_num,
          med_salary = CASE
            WHEN c.new_yearly_min_salary_num IS NOT NULL AND c.new_yearly_max_salary_num IS NOT NULL
            THEN ROUND((c.new_yearly_min_salary_num + c.new_yearly_max_salary_num) / 2)::numeric
            ELSE NULL
          END,
          yearly_med_salary = CASE
            WHEN c.new_yearly_min_salary_num IS NOT NULL AND c.new_yearly_max_salary_num IS NOT NULL
            THEN ROUND((c.new_yearly_min_salary_num + c.new_yearly_max_salary_num) / 2)::numeric
            ELSE NULL
          END
        FROM monthly_candidates c
        WHERE p.job_id = c.job_id
        RETURNING
          c.job_id,
          c.source,
          c.old_pay_period,
          p.pay_period AS new_pay_period,
          c.old_min_salary,
          c.old_max_salary,
          c.old_yearly_min_salary,
          c.old_yearly_max_salary,
          c.new_yearly_min_salary_num::text AS new_yearly_min_salary,
          c.new_yearly_max_salary_num::text AS new_yearly_max_salary,
          'manual_monthly_over_annualized'::text AS reason
      )
      SELECT * FROM hourly_fix
      UNION ALL
      SELECT * FROM monthly_fix;
    `);

    const post = await client.query(`
      SELECT
        MAX(yearly_min_salary)::numeric AS max_yearly_min_salary,
        COUNT(*) FILTER (WHERE yearly_min_salary >= 500000)::int AS ge_500k
      FROM postings
      WHERE yearly_min_salary IS NOT NULL AND yearly_min_salary > 0;
    `);

    await client.query("COMMIT");

    const header = [
      "job_id",
      "source",
      "reason",
      "old_pay_period",
      "new_pay_period",
      "old_min_salary",
      "old_max_salary",
      "old_yearly_min_salary",
      "old_yearly_max_salary",
      "new_yearly_min_salary",
      "new_yearly_max_salary",
    ];
    const lines = [header.join(",")];
    for (const row of changed.rows) {
      lines.push(
        [
          row.job_id,
          row.source,
          row.reason,
          row.old_pay_period,
          row.new_pay_period,
          row.old_min_salary,
          row.old_max_salary,
          row.old_yearly_min_salary,
          row.old_yearly_max_salary,
          row.new_yearly_min_salary,
          row.new_yearly_max_salary,
        ]
          .map(csvEscape)
          .join(",")
      );
    }
    fs.writeFileSync(csvPath, `${lines.join("\n")}\n`, "utf8");

    console.log(`✅ Applied updates: ${changed.rows.length.toLocaleString()} rows`);
    console.log(`   Change log: ${csvPath}`);
    console.log(
      `   Post-check max yearly_min_salary: ${Number(post.rows[0]?.max_yearly_min_salary ?? 0).toLocaleString()}`
    );
    console.log(`   Post-check yearly_min_salary >= 500k: ${Number(post.rows[0]?.ge_500k ?? 0).toLocaleString()}`);
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // no-op
    }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Salary normalization fix failed:", err);
  process.exit(1);
});
