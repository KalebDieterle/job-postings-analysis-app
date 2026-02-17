#!/usr/bin/env tsx
/**
 * scripts/verify-company-coverage.ts
 *
 * Quick verification of company coverage after running recreate-missing-companies
 */

import { db } from "../db/index";
import { sql } from "drizzle-orm";

async function main() {
  console.log("\n🔍 Company Coverage Verification\n");

  // Orphaned jobs
  const [{ orphanCount }] = await db.execute(sql`
    SELECT COUNT(*)::int AS "orphanCount"
    FROM postings p
    LEFT JOIN companies c ON p.company_id = c.company_id
    WHERE c.company_id IS NULL
  `).then(r => r.rows as any[]);

  console.log(`Orphaned postings (no company match): ${orphanCount.toLocaleString()}`);

  // Company stats
  const stats = await db.execute(sql`
    SELECT 
      COUNT(CASE WHEN job_count > 0 THEN 1 END)::int as with_jobs,
      COUNT(CASE WHEN job_count = 0 THEN 1 END)::int as without_jobs,
      COUNT(*)::int as total_companies
    FROM (
      SELECT c.company_id, COUNT(p.job_id) as job_count
      FROM companies c
      LEFT JOIN postings p ON c.company_id = p.company_id
      GROUP BY c.company_id
    ) subquery
  `).then(r => r.rows[0] as any);

  const withJobsPct = ((stats.with_jobs / stats.total_companies) * 100).toFixed(2);
  const withoutJobsPct = ((stats.without_jobs / stats.total_companies) * 100).toFixed(2);

  console.log(`\nTotal companies: ${stats.total_companies.toLocaleString()}`);
  console.log(`  With jobs    : ${stats.with_jobs.toLocaleString()} (${withJobsPct}%)`);
  console.log(`  Without jobs : ${stats.without_jobs.toLocaleString()} (${withoutJobsPct}%)`);

  if (orphanCount === 0 && stats.with_jobs > stats.without_jobs) {
    console.log("\n✅ SUCCESS: All jobs have matching companies, and most companies have jobs!\n");
  } else if (orphanCount === 0) {
    console.log("\n⚠️  All jobs matched, but many ghost companies remain.\n");
  } else {
    console.error(`\n❌ ${orphanCount} orphaned jobs still exist.\n`);
    process.exit(1);
  }
}

main().catch(console.error);
