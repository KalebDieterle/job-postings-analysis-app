#!/usr/bin/env tsx
/**
 * scripts/recreate-missing-companies.ts
 *
 * Scan all job postings, identify orphaned records whose company_id has no
 * matching row in the companies table, then batch-insert the missing
 * company records using data extracted from the postings themselves.
 *
 * Env vars:
 *   RECREATE_COMPANIES_DRY_RUN=true   – log everything but skip DB writes
 *
 * Usage:
 *   npm run recreate:companies          # full run
 *   npm run recreate:companies:dry-run  # preview only
 */

import { db } from "../db/index";
import { companies, postings } from "../db/schema";
import { sql, eq, notInArray, inArray } from "drizzle-orm";
import { parseJobLocation, classifyParse } from "../lib/location-parser";
import fs from "fs";

// ─── configuration ──────────────────────────────────────────────
const DRY_RUN = process.env.RECREATE_COMPANIES_DRY_RUN === "true";
const BATCH_SIZE = 500;
const REPORT_PATH = ".recreate-companies-report.json";

// ─── types ──────────────────────────────────────────────────────
interface OrphanGroup {
  companyId: string;
  companyName: string;
  jobCount: number;
  sampleLocation: string | null;
  sampleUrl: string | null;
  firstSeen: Date | null;
}

interface CompanyInsert {
  company_id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  url: string | null;
}

interface Report {
  timestamp: string;
  dryRun: boolean;
  totalPostings: number;
  orphanedPostings: number;
  orphanedPct: string;
  uniqueMissingCompanies: number;
  inserted: number;
  updated: number;
  failed: number;
  locationParseStats: { full: number; partial: number; none: number };
  durationMs: number;
  sampleCompanies: Array<{ id: string; name: string; city: string | null; state: string | null }>;
}

// ─── helpers ────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function pct(part: number, whole: number): string {
  if (whole === 0) return "0.00%";
  return ((part / whole) * 100).toFixed(2) + "%";
}

function elapsed(startMs: number): string {
  const s = ((Date.now() - startMs) / 1000).toFixed(1);
  return `${s}s`;
}

function eta(startMs: number, done: number, total: number): string {
  if (done === 0) return "calculating…";
  const elapsedMs = Date.now() - startMs;
  const remainMs = (elapsedMs / done) * (total - done);
  const remainS = Math.ceil(remainMs / 1000);
  if (remainS < 60) return `~${remainS}s`;
  return `~${Math.ceil(remainS / 60)}m`;
}

function progressBar(done: number, total: number, width = 30): string {
  const ratio = total === 0 ? 1 : done / total;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${pct(done, total)}`;
}

// ─── main ───────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();

  console.log("");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  🏗️  Recreate Missing Companies from Postings Data");
  console.log("═══════════════════════════════════════════════════════");
  if (DRY_RUN) {
    console.log("  ⚠️  DRY-RUN MODE – no database writes will occur");
  }
  console.log("");

  // ── Step 1: Gather stats ─────────────────────────────────────
  console.log("📊 Step 1/5 — Gathering database stats…");

  const [{ totalPostings }] = await db
    .select({ totalPostings: sql<number>`COUNT(*)::int` })
    .from(postings);

  const [{ totalCompanies }] = await db
    .select({ totalCompanies: sql<number>`COUNT(*)::int` })
    .from(companies);

  console.log(`   Total postings : ${fmt(totalPostings)}`);
  console.log(`   Total companies: ${fmt(totalCompanies)}`);
  console.log("");

  // ── Step 2: Identify orphaned postings ───────────────────────
  console.log("🔍 Step 2/5 — Identifying orphaned postings…");

  // Subquery: all company_ids that exist in the companies table
  const existingIds = db
    .select({ id: companies.company_id })
    .from(companies);

  // We use raw SQL for the NOT IN subquery to keep it efficient
  const orphanRows = await db.execute(sql`
    SELECT
      p.company_id,
      p.company_name,
      COUNT(*)::int AS job_count,
      MIN(p.location) AS sample_location,
      MIN(p.job_posting_url) AS sample_url,
      MIN(p.listed_time) AS first_seen
    FROM postings p
    WHERE p.company_id NOT IN (SELECT c.company_id FROM companies c)
    GROUP BY p.company_id, p.company_name
    ORDER BY COUNT(*) DESC
  `);

  const orphanGroups: OrphanGroup[] = (orphanRows.rows as any[]).map((r: any) => ({
    companyId: r.company_id,
    companyName: r.company_name,
    jobCount: Number(r.job_count),
    sampleLocation: r.sample_location ?? null,
    sampleUrl: r.sample_url ?? null,
    firstSeen: r.first_seen ? new Date(r.first_seen) : null,
  }));

  const orphanedPostingCount = orphanGroups.reduce((sum, g) => sum + g.jobCount, 0);

  console.log(`   Orphaned postings    : ${fmt(orphanedPostingCount)} (${pct(orphanedPostingCount, totalPostings)})`);
  console.log(`   Unique missing co's  : ${fmt(orphanGroups.length)}`);

  if (orphanGroups.length === 0) {
    console.log("\n✅ No missing companies found — nothing to do!");
    process.exit(0);
  }

  // Show top 10 by job count
  console.log("\n   Top 10 by job count:");
  orphanGroups.slice(0, 10).forEach((g, i) => {
    console.log(`     ${String(i + 1).padStart(2)}. ${g.companyName.padEnd(35)} ${fmt(g.jobCount).padStart(6)} jobs   ${g.sampleLocation ?? "(no location)"}`);
  });
  console.log("");

  // ── Step 3: Parse locations & build insert list ──────────────
  console.log("📍 Step 3/5 — Parsing locations & building company records…");

  const locationStats = { full: 0, partial: 0, none: 0 };
  const toInsert: CompanyInsert[] = [];

  for (const g of orphanGroups) {
    const parsed = parseJobLocation(g.sampleLocation);
    const cls = classifyParse(parsed);
    locationStats[cls]++;

    // Try to extract a company URL from the posting URL domain
    let companyUrl: string | null = g.sampleUrl ?? null;
    if (companyUrl) {
      try {
        const u = new URL(companyUrl);
        // For job boards, the URL isn't the company site — keep null
        const boardDomains = ["linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com", "monster.com", "adzuna.com"];
        if (boardDomains.some(d => u.hostname.includes(d))) {
          companyUrl = null;
        }
      } catch {
        companyUrl = null;
      }
    }

    toInsert.push({
      company_id: g.companyId,
      name: g.companyName,
      city: parsed.city,
      state: parsed.state,
      country: parsed.city || parsed.state ? "US" : null,
      url: companyUrl,
    });
  }

  console.log(`   Location parsing:`);
  console.log(`     Full (city+state) : ${fmt(locationStats.full)} (${pct(locationStats.full, toInsert.length)})`);
  console.log(`     Partial           : ${fmt(locationStats.partial)} (${pct(locationStats.partial, toInsert.length)})`);
  console.log(`     None / Remote     : ${fmt(locationStats.none)} (${pct(locationStats.none, toInsert.length)})`);
  console.log("");

  // ── Step 4: Batch UPSERT ─────────────────────────────────────
  console.log(`💾 Step 4/5 — ${DRY_RUN ? "Simulating" : "Creating"} ${fmt(toInsert.length)} companies in batches of ${BATCH_SIZE}…`);
  if (DRY_RUN) {
    console.log(`   (will INSERT new + UPDATE existing ghost companies)`);
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const totalBatches = Math.ceil(toInsert.length / BATCH_SIZE);
  const insertStart = Date.now();

  // In dry-run, we need to check which companies exist to estimate inserts vs updates
  const existingCompanyIds: Set<string> = new Set();
  if (DRY_RUN) {
    const allIds = toInsert.map(c => c.company_id);
    const QUERY_BATCH_SIZE = 1500; // Under PostgreSQL's 1664 row limit

    for (let i = 0; i < allIds.length; i += QUERY_BATCH_SIZE) {
      const batchIds = allIds.slice(i, i + QUERY_BATCH_SIZE);
      const batchRecords = await db
        .select({ id: companies.company_id })
        .from(companies)
        .where(inArray(companies.company_id, batchIds));
      batchRecords.forEach(r => existingCompanyIds.add(r.id));
    }

    console.log(`   ✓ Checked ${fmt(allIds.length)} company_ids in ${Math.ceil(allIds.length / QUERY_BATCH_SIZE)} batches`);
  }

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = toInsert.slice(i, i + BATCH_SIZE);

    try {
      if (!DRY_RUN) {
        await db
          .insert(companies)
          .values(batch)
          .onConflictDoUpdate({
            target: companies.company_id,
            set: {
              name: sql`EXCLUDED.name`,
              city: sql`EXCLUDED.city`,
              state: sql`EXCLUDED.state`,
              country: sql`EXCLUDED.country`,
              url: sql`EXCLUDED.url`,
            },
          });

        // We can't distinguish insert vs update from the result, so we'll verify after
        inserted += batch.length;
      } else {
        // In dry-run mode, estimate based on existing IDs
        for (const company of batch) {
          if (existingCompanyIds.has(company.company_id)) {
            updated++;
          } else {
            inserted++;
          }
        }
      }
    } catch (err: any) {
      console.error(`   ❌ Batch ${batchNum} failed: ${err.message}`);
      failed += batch.length;
    }

    // Progress every batch
    const done = Math.min(i + BATCH_SIZE, toInsert.length);
    process.stdout.write(
      `\r   ${progressBar(done, toInsert.length)}  batch ${batchNum}/${totalBatches}  ETA ${eta(insertStart, done, toInsert.length)}   `
    );
  }

  console.log(""); // newline after progress bar
  
  if (DRY_RUN) {
    console.log(`   ✅ Would insert: ${fmt(inserted)} new companies`);
    console.log(`   🔄 Would update: ${fmt(updated)} existing companies (overwriting ghost data)`);
    console.log(`   ❌ Failed: ${fmt(failed)}`);
  } else {
    console.log(`   ✅ Inserted/Updated: ${fmt(inserted)}   ❌ Failed: ${fmt(failed)}`);
    console.log(`   (Note: Total includes both new inserts and updates to existing ghost companies)`);
  }
  console.log("");

  // ── Step 5: Verify ───────────────────────────────────────────
  console.log("✅ Step 5/5 — Verifying…");

  let newTotal = totalCompanies;
  let remainingOrphans = orphanGroups.length;

  if (!DRY_RUN) {
    const [{ count: newTotalCount }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(companies);
    newTotal = newTotalCount;

    const [{ count: remainingOrphansCount }] = await db.execute(sql`
      SELECT COUNT(DISTINCT p.company_id)::int AS "count"
      FROM postings p
      WHERE p.company_id NOT IN (SELECT c.company_id FROM companies c)
    `).then(r => r.rows as any[]);
    remainingOrphans = remainingOrphansCount;

    // Calculate actual inserts vs updates
    const netNew = newTotal - totalCompanies;
    inserted = netNew;
    updated = toInsert.length - netNew - failed;

    console.log(`   Companies before : ${fmt(totalCompanies)}`);
    console.log(`   Companies after  : ${fmt(newTotal)}`);
    console.log(`   Net new          : ${fmt(netNew)}`);
    console.log(`   Updated existing : ${fmt(updated)}`);
    console.log(`   Remaining orphans: ${fmt(remainingOrphans)}`);
  } else {
    console.log("   (skipped — dry-run mode)");
  }

  // ── Report ───────────────────────────────────────────────────
  const report: Report = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    totalPostings,
    orphanedPostings: orphanedPostingCount,
    orphanedPct: pct(orphanedPostingCount, totalPostings),
    uniqueMissingCompanies: orphanGroups.length,
    inserted,
    updated,
    failed,
    locationParseStats: locationStats,
    durationMs: Date.now() - t0,
    sampleCompanies: toInsert.slice(0, 20).map(c => ({
      id: c.company_id,
      name: c.name,
      city: c.city,
      state: c.state,
    })),
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report written to ${REPORT_PATH}`);

  // ── Summary ──────────────────────────────────────────────────
  const durationS = ((Date.now() - t0) / 1000).toFixed(1);
  console.log("");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  🏁 Done in ${durationS}s`);
  if (DRY_RUN) {
    console.log("  ⚠️  This was a DRY RUN — run without DRY_RUN to apply.");
  }
  console.log("═══════════════════════════════════════════════════════");
  console.log("");

  const successRate = toInsert.length > 0 ? (inserted / toInsert.length) : 1;
  process.exit(successRate >= 0.95 ? 0 : 1);
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
