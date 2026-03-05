#!/usr/bin/env node
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { sql } from 'drizzle-orm';
import { db } from '../db/index';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--apply')
  ? false
  : args.has('--dry-run')
    ? true
    : process.env.RELATIONS_CLEANUP_DRY_RUN !== 'false';
const REPORT_PATH = '.relations-cleanup-report.json';

type Counts = {
  orphanJobSkillsPostings: number;
  orphanJobIndustriesPostings: number;
  orphanBenefitsPostings: number;
  orphanSalariesPostings: number;
  duplicateJobSkillsGroups: number;
  duplicateJobSkillsSurplus: number;
  duplicateJobIndustriesGroups: number;
  duplicateJobIndustriesSurplus: number;
};

type CleanupReport = {
  timestamp: string;
  dryRun: boolean;
  before: Counts;
  after: Counts;
  backupTables: string[];
};

function nowStamp() {
  return new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

async function getCounts(): Promise<Counts> {
  const result = await db.execute<Counts>(sql`
    WITH
    orphan_job_skills AS (
      SELECT COUNT(*)::int AS count
      FROM job_skills js
      LEFT JOIN postings p ON p.job_id = js.job_id
      WHERE p.job_id IS NULL
    ),
    orphan_job_industries AS (
      SELECT COUNT(*)::int AS count
      FROM job_industries ji
      LEFT JOIN postings p ON p.job_id = ji.job_id
      WHERE p.job_id IS NULL
    ),
    orphan_benefits AS (
      SELECT COUNT(*)::int AS count
      FROM benefits b
      LEFT JOIN postings p ON p.job_id = b.job_id
      WHERE p.job_id IS NULL
    ),
    orphan_salaries AS (
      SELECT COUNT(*)::int AS count
      FROM salaries s
      LEFT JOIN postings p ON p.job_id = s.job_id
      WHERE p.job_id IS NULL
    ),
    duplicate_job_skills AS (
      SELECT
        COUNT(*)::int AS groups,
        COALESCE(SUM(cnt - 1), 0)::int AS surplus
      FROM (
        SELECT COUNT(*)::int AS cnt
        FROM job_skills
        GROUP BY job_id, skill_abr
        HAVING COUNT(*) > 1
      ) d
    ),
    duplicate_job_industries AS (
      SELECT
        COUNT(*)::int AS groups,
        COALESCE(SUM(cnt - 1), 0)::int AS surplus
      FROM (
        SELECT COUNT(*)::int AS cnt
        FROM job_industries
        GROUP BY job_id, industry_id
        HAVING COUNT(*) > 1
      ) d
    )
    SELECT
      (SELECT count FROM orphan_job_skills) AS "orphanJobSkillsPostings",
      (SELECT count FROM orphan_job_industries) AS "orphanJobIndustriesPostings",
      (SELECT count FROM orphan_benefits) AS "orphanBenefitsPostings",
      (SELECT count FROM orphan_salaries) AS "orphanSalariesPostings",
      (SELECT groups FROM duplicate_job_skills) AS "duplicateJobSkillsGroups",
      (SELECT surplus FROM duplicate_job_skills) AS "duplicateJobSkillsSurplus",
      (SELECT groups FROM duplicate_job_industries) AS "duplicateJobIndustriesGroups",
      (SELECT surplus FROM duplicate_job_industries) AS "duplicateJobIndustriesSurplus"
  `);

  const row = result.rows[0];
  return {
    orphanJobSkillsPostings: Number(row?.orphanJobSkillsPostings ?? 0),
    orphanJobIndustriesPostings: Number(row?.orphanJobIndustriesPostings ?? 0),
    orphanBenefitsPostings: Number(row?.orphanBenefitsPostings ?? 0),
    orphanSalariesPostings: Number(row?.orphanSalariesPostings ?? 0),
    duplicateJobSkillsGroups: Number(row?.duplicateJobSkillsGroups ?? 0),
    duplicateJobSkillsSurplus: Number(row?.duplicateJobSkillsSurplus ?? 0),
    duplicateJobIndustriesGroups: Number(row?.duplicateJobIndustriesGroups ?? 0),
    duplicateJobIndustriesSurplus: Number(row?.duplicateJobIndustriesSurplus ?? 0),
  };
}

function printCounts(label: string, counts: Counts) {
  console.log(`\n${label}`);
  console.log(`- orphan job_skills -> postings: ${counts.orphanJobSkillsPostings.toLocaleString()}`);
  console.log(`- orphan job_industries -> postings: ${counts.orphanJobIndustriesPostings.toLocaleString()}`);
  console.log(`- orphan benefits -> postings: ${counts.orphanBenefitsPostings.toLocaleString()}`);
  console.log(`- orphan salaries -> postings: ${counts.orphanSalariesPostings.toLocaleString()}`);
  console.log(`- duplicate job_skills groups: ${counts.duplicateJobSkillsGroups.toLocaleString()}`);
  console.log(`- duplicate job_skills surplus rows: ${counts.duplicateJobSkillsSurplus.toLocaleString()}`);
  console.log(`- duplicate job_industries groups: ${counts.duplicateJobIndustriesGroups.toLocaleString()}`);
  console.log(`- duplicate job_industries surplus rows: ${counts.duplicateJobIndustriesSurplus.toLocaleString()}`);
}

async function createBackups(stamp: string): Promise<string[]> {
  const backupTables = [
    `relations_cleanup_${stamp}_job_skills_duplicate_rows`,
    `relations_cleanup_${stamp}_job_industries_duplicate_rows`,
    `relations_cleanup_${stamp}_job_skills_orphans`,
    `relations_cleanup_${stamp}_job_industries_orphans`,
    `relations_cleanup_${stamp}_benefits_orphans`,
    `relations_cleanup_${stamp}_salaries_orphans`,
  ];

  await db.execute(sql.raw(`
    CREATE TABLE ${backupTables[0]} AS
    SELECT js.*
    FROM job_skills js
    JOIN (
      SELECT ctid
      FROM (
        SELECT ctid, ROW_NUMBER() OVER (PARTITION BY job_id, skill_abr ORDER BY ctid) AS rn
        FROM job_skills
      ) ranked
      WHERE rn > 1
    ) dup ON dup.ctid = js.ctid;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE ${backupTables[1]} AS
    SELECT ji.*
    FROM job_industries ji
    JOIN (
      SELECT ctid
      FROM (
        SELECT ctid, ROW_NUMBER() OVER (PARTITION BY job_id, industry_id ORDER BY ctid) AS rn
        FROM job_industries
      ) ranked
      WHERE rn > 1
    ) dup ON dup.ctid = ji.ctid;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE ${backupTables[2]} AS
    SELECT js.*
    FROM job_skills js
    LEFT JOIN postings p ON p.job_id = js.job_id
    WHERE p.job_id IS NULL;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE ${backupTables[3]} AS
    SELECT ji.*
    FROM job_industries ji
    LEFT JOIN postings p ON p.job_id = ji.job_id
    WHERE p.job_id IS NULL;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE ${backupTables[4]} AS
    SELECT b.*
    FROM benefits b
    LEFT JOIN postings p ON p.job_id = b.job_id
    WHERE p.job_id IS NULL;
  `));

  await db.execute(sql.raw(`
    CREATE TABLE ${backupTables[5]} AS
    SELECT s.*
    FROM salaries s
    LEFT JOIN postings p ON p.job_id = s.job_id
    WHERE p.job_id IS NULL;
  `));

  return backupTables;
}

async function applyCleanup() {
  await db.execute(sql`
    DELETE FROM job_skills js
    USING (
      SELECT ctid
      FROM (
        SELECT ctid, ROW_NUMBER() OVER (PARTITION BY job_id, skill_abr ORDER BY ctid) AS rn
        FROM job_skills
      ) ranked
      WHERE rn > 1
    ) dup
    WHERE js.ctid = dup.ctid
  `);

  await db.execute(sql`
    DELETE FROM job_industries ji
    USING (
      SELECT ctid
      FROM (
        SELECT ctid, ROW_NUMBER() OVER (PARTITION BY job_id, industry_id ORDER BY ctid) AS rn
        FROM job_industries
      ) ranked
      WHERE rn > 1
    ) dup
    WHERE ji.ctid = dup.ctid
  `);

  await db.execute(sql`
    DELETE FROM job_skills js
    WHERE NOT EXISTS (
      SELECT 1
      FROM postings p
      WHERE p.job_id = js.job_id
    )
  `);

  await db.execute(sql`
    DELETE FROM job_industries ji
    WHERE NOT EXISTS (
      SELECT 1
      FROM postings p
      WHERE p.job_id = ji.job_id
    )
  `);

  await db.execute(sql`
    DELETE FROM benefits b
    WHERE NOT EXISTS (
      SELECT 1
      FROM postings p
      WHERE p.job_id = b.job_id
    )
  `);

  await db.execute(sql`
    DELETE FROM salaries s
    WHERE NOT EXISTS (
      SELECT 1
      FROM postings p
      WHERE p.job_id = s.job_id
    )
  `);
}

async function main() {
  console.log('\n[cleanup:relations] Starting relation integrity cleanup');
  console.log(`[cleanup:relations] Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY'}`);

  const before = await getCounts();
  printCounts('[cleanup:relations] Current counts', before);

  const report: CleanupReport = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    before,
    after: before,
    backupTables: [],
  };

  if (DRY_RUN) {
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`\n[cleanup:relations] Dry run complete. Report written to ${REPORT_PATH}`);
    process.exit(0);
  }

  const stamp = nowStamp();
  console.log(`\n[cleanup:relations] Creating backup tables with stamp ${stamp}...`);
  report.backupTables = await createBackups(stamp);
  report.backupTables.forEach((tableName) => console.log(`- backup table created: ${tableName}`));

  console.log('\n[cleanup:relations] Applying dedupe + orphan cleanup...');
  await applyCleanup();

  const after = await getCounts();
  report.after = after;
  printCounts('[cleanup:relations] Counts after cleanup', after);

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\n[cleanup:relations] Cleanup report written to ${REPORT_PATH}`);

  const hasRemainingIssues =
    after.orphanJobSkillsPostings > 0 ||
    after.orphanJobIndustriesPostings > 0 ||
    after.orphanBenefitsPostings > 0 ||
    after.orphanSalariesPostings > 0 ||
    after.duplicateJobSkillsSurplus > 0 ||
    after.duplicateJobIndustriesSurplus > 0;

  if (hasRemainingIssues) {
    console.error('[cleanup:relations] Cleanup finished, but integrity issues remain.');
    process.exit(1);
  }

  console.log('[cleanup:relations] Cleanup completed with zero targeted orphan/duplicate drift.');
}

main().catch((error) => {
  console.error('[cleanup:relations] fatal error', error);
  process.exit(1);
});
