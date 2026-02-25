#!/usr/bin/env tsx
import "dotenv/config";
import fs from "fs";
import path from "path";
import { db } from "@/db";
import { sql } from "drizzle-orm";

async function queryRows<T extends Record<string, unknown>>(q: ReturnType<typeof sql>) {
  const result = await db.execute(q);
  return result.rows as T[];
}

async function main() {
  console.log("🔎 Salary Quality Audit\n");

  const generatedAt = new Date().toISOString();

  const sourcePayPeriod = await queryRows(sql`
    SELECT
      source,
      COALESCE(pay_period, '(null)') AS pay_period,
      COUNT(*)::int AS row_count,
      ROUND(AVG(yearly_min_salary))::int AS avg_yearly_min,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY yearly_min_salary))::int AS median_yearly_min
    FROM postings
    WHERE yearly_min_salary IS NOT NULL AND yearly_min_salary > 0
    GROUP BY source, COALESCE(pay_period, '(null)')
    ORDER BY source, row_count DESC;
  `);

  const percentiles = await queryRows(sql`
    SELECT
      ROUND(PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY yearly_min_salary))::int AS p10,
      ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY yearly_min_salary))::int AS p25,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY yearly_min_salary))::int AS p50,
      ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY yearly_min_salary))::int AS p75,
      ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY yearly_min_salary))::int AS p90,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY yearly_min_salary))::int AS p95,
      ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY yearly_min_salary))::int AS p99
    FROM postings
    WHERE yearly_min_salary IS NOT NULL AND yearly_min_salary > 0;
  `);

  const outliers = await queryRows(sql`
    SELECT
      COUNT(*) FILTER (WHERE yearly_min_salary > 250000)::int AS gt_250k,
      COUNT(*) FILTER (WHERE yearly_min_salary > 500000)::int AS gt_500k,
      COUNT(*) FILTER (WHERE yearly_min_salary > 1000000)::int AS gt_1m,
      MAX(yearly_min_salary)::numeric AS max_yearly_min
    FROM postings
    WHERE yearly_min_salary IS NOT NULL AND yearly_min_salary > 0;
  `);

  const suspectedMismatches = await queryRows(sql`
    SELECT
      COUNT(*) FILTER (
        WHERE source = 'manual'
          AND pay_period = 'HOURLY'
          AND NULLIF(REGEXP_REPLACE(min_salary::text, '[^0-9.-]', '', 'g'), '')::numeric >= 1000
      )::int AS manual_hourly_annual_like,
      COUNT(*) FILTER (
        WHERE source = 'manual'
          AND pay_period = 'MONTHLY'
          AND NULLIF(REGEXP_REPLACE(min_salary::text, '[^0-9.-]', '', 'g'), '')::numeric > 0
          AND yearly_min_salary / NULLIF(REGEXP_REPLACE(min_salary::text, '[^0-9.-]', '', 'g')::numeric, 0) >= 100
      )::int AS manual_monthly_over_annualized,
      COUNT(*) FILTER (
        WHERE source = 'manual'
          AND pay_period = 'HOURLY'
          AND yearly_min_salary >= 1000000
      )::int AS manual_hourly_ge_1m
    FROM postings;
  `);

  const report = {
    generatedAt,
    sourcePayPeriod,
    percentiles: percentiles[0] ?? {},
    outliers: outliers[0] ?? {},
    suspectedMismatches: suspectedMismatches[0] ?? {},
  };

  const timestamp = generatedAt.replace(/[:.]/g, "-");
  const outPath = path.join("/tmp", `salary-audit-${timestamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log("✅ Audit complete");
  console.log(`   Report: ${outPath}`);
  const p50 = percentiles[0] && typeof percentiles[0].p50 === "number" ? percentiles[0].p50 : "N/A";
  const gt1m = outliers[0] && typeof outliers[0].gt_1m === "number" ? outliers[0].gt_1m : "N/A";
  console.log(`   p50 yearly_min: ${p50}`);
  console.log(`   >1m outliers: ${gt1m}`);
}

main().catch((err) => {
  console.error("❌ Salary audit failed:", err);
  process.exit(1);
});
