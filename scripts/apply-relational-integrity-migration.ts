#!/usr/bin/env node
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../db/index';

type PreflightRow = {
  postings_null_job_id: number;
  postings_duplicate_job_id_groups: number;
  skills_null_skill_abr: number;
  skills_duplicate_skill_abr_groups: number;
  industries_null_industry_id: number;
  industries_duplicate_industry_id_groups: number;
  orphan_job_skills_postings: number;
  orphan_job_industries_postings: number;
  orphan_benefits_postings: number;
  orphan_salaries_postings: number;
  duplicate_job_skills_pairs: number;
  duplicate_job_industries_pairs: number;
};

async function getPreflight(): Promise<PreflightRow> {
  const result = await db.execute<PreflightRow>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM postings WHERE job_id IS NULL) AS postings_null_job_id,
      (
        SELECT COUNT(*)::int
        FROM (
          SELECT job_id
          FROM postings
          GROUP BY job_id
          HAVING COUNT(*) > 1
        ) d
      ) AS postings_duplicate_job_id_groups,
      (SELECT COUNT(*)::int FROM skills WHERE skill_abr IS NULL) AS skills_null_skill_abr,
      (
        SELECT COUNT(*)::int
        FROM (
          SELECT skill_abr
          FROM skills
          GROUP BY skill_abr
          HAVING COUNT(*) > 1
        ) d
      ) AS skills_duplicate_skill_abr_groups,
      (SELECT COUNT(*)::int FROM industries WHERE industry_id IS NULL) AS industries_null_industry_id,
      (
        SELECT COUNT(*)::int
        FROM (
          SELECT industry_id
          FROM industries
          GROUP BY industry_id
          HAVING COUNT(*) > 1
        ) d
      ) AS industries_duplicate_industry_id_groups,
      (
        SELECT COUNT(*)::int
        FROM job_skills js
        LEFT JOIN postings p ON p.job_id = js.job_id
        WHERE p.job_id IS NULL
      ) AS orphan_job_skills_postings,
      (
        SELECT COUNT(*)::int
        FROM job_industries ji
        LEFT JOIN postings p ON p.job_id = ji.job_id
        WHERE p.job_id IS NULL
      ) AS orphan_job_industries_postings,
      (
        SELECT COUNT(*)::int
        FROM benefits b
        LEFT JOIN postings p ON p.job_id = b.job_id
        WHERE p.job_id IS NULL
      ) AS orphan_benefits_postings,
      (
        SELECT COUNT(*)::int
        FROM salaries s
        LEFT JOIN postings p ON p.job_id = s.job_id
        WHERE p.job_id IS NULL
      ) AS orphan_salaries_postings,
      (
        SELECT COUNT(*)::int
        FROM (
          SELECT js.job_id, js.skill_abr
          FROM job_skills js
          GROUP BY js.job_id, js.skill_abr
          HAVING COUNT(*) > 1
        ) d
      ) AS duplicate_job_skills_pairs,
      (
        SELECT COUNT(*)::int
        FROM (
          SELECT ji.job_id, ji.industry_id
          FROM job_industries ji
          GROUP BY ji.job_id, ji.industry_id
          HAVING COUNT(*) > 1
        ) d
      ) AS duplicate_job_industries_pairs
  `);

  const row = result.rows[0];
  return {
    postings_null_job_id: Number(row?.postings_null_job_id ?? 0),
    postings_duplicate_job_id_groups: Number(row?.postings_duplicate_job_id_groups ?? 0),
    skills_null_skill_abr: Number(row?.skills_null_skill_abr ?? 0),
    skills_duplicate_skill_abr_groups: Number(row?.skills_duplicate_skill_abr_groups ?? 0),
    industries_null_industry_id: Number(row?.industries_null_industry_id ?? 0),
    industries_duplicate_industry_id_groups: Number(row?.industries_duplicate_industry_id_groups ?? 0),
    orphan_job_skills_postings: Number(row?.orphan_job_skills_postings ?? 0),
    orphan_job_industries_postings: Number(row?.orphan_job_industries_postings ?? 0),
    orphan_benefits_postings: Number(row?.orphan_benefits_postings ?? 0),
    orphan_salaries_postings: Number(row?.orphan_salaries_postings ?? 0),
    duplicate_job_skills_pairs: Number(row?.duplicate_job_skills_pairs ?? 0),
    duplicate_job_industries_pairs: Number(row?.duplicate_job_industries_pairs ?? 0),
  };
}

function hasPreflightErrors(preflight: PreflightRow): boolean {
  return Object.values(preflight).some((value) => value > 0);
}

async function ensureUniqueIndexes() {
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS postings_job_id_uidx ON postings(job_id)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS skills_skill_abr_uidx ON skills(skill_abr)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS industries_industry_id_uidx ON industries(industry_id)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS job_skills_job_id_skill_abr_uidx ON job_skills(job_id, skill_abr)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS job_industries_job_id_industry_id_uidx ON job_industries(job_id, industry_id)`);
}

async function ensureConstraints() {
  const statements = [
    `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_job_skills_job_id_postings') THEN
          ALTER TABLE job_skills
          ADD CONSTRAINT fk_job_skills_job_id_postings
          FOREIGN KEY (job_id)
          REFERENCES postings(job_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_job_skills_skill_abr_skills') THEN
          ALTER TABLE job_skills
          ADD CONSTRAINT fk_job_skills_skill_abr_skills
          FOREIGN KEY (skill_abr)
          REFERENCES skills(skill_abr);
        END IF;
      END $$;
    `,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_job_industries_job_id_postings') THEN
          ALTER TABLE job_industries
          ADD CONSTRAINT fk_job_industries_job_id_postings
          FOREIGN KEY (job_id)
          REFERENCES postings(job_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_job_industries_industry_id_industries') THEN
          ALTER TABLE job_industries
          ADD CONSTRAINT fk_job_industries_industry_id_industries
          FOREIGN KEY (industry_id)
          REFERENCES industries(industry_id);
        END IF;
      END $$;
    `,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_benefits_job_id_postings') THEN
          ALTER TABLE benefits
          ADD CONSTRAINT fk_benefits_job_id_postings
          FOREIGN KEY (job_id)
          REFERENCES postings(job_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `,
    `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_salaries_job_id_postings') THEN
          ALTER TABLE salaries
          ADD CONSTRAINT fk_salaries_job_id_postings
          FOREIGN KEY (job_id)
          REFERENCES postings(job_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `,
  ];

  for (const statement of statements) {
    await db.execute(sql.raw(statement));
  }
}

async function verify() {
  const [indexResult, constraintResult] = await Promise.all([
    db.execute<{ indexname: string }>(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'postings_job_id_uidx',
          'skills_skill_abr_uidx',
          'industries_industry_id_uidx',
          'job_skills_job_id_skill_abr_uidx',
          'job_industries_job_id_industry_id_uidx'
        )
    `),
    db.execute<{ conname: string }>(sql`
      SELECT conname
      FROM pg_constraint
      WHERE conname IN (
        'fk_job_skills_job_id_postings',
        'fk_job_skills_skill_abr_skills',
        'fk_job_industries_job_id_postings',
        'fk_job_industries_industry_id_industries',
        'fk_benefits_job_id_postings',
        'fk_salaries_job_id_postings'
      )
    `),
  ]);

  const foundIndexes = new Set(indexResult.rows.map((row) => row.indexname));
  const foundConstraints = new Set(constraintResult.rows.map((row) => row.conname));

  const expectedIndexes = [
    'postings_job_id_uidx',
    'skills_skill_abr_uidx',
    'industries_industry_id_uidx',
    'job_skills_job_id_skill_abr_uidx',
    'job_industries_job_id_industry_id_uidx',
  ];
  const expectedConstraints = [
    'fk_job_skills_job_id_postings',
    'fk_job_skills_skill_abr_skills',
    'fk_job_industries_job_id_postings',
    'fk_job_industries_industry_id_industries',
    'fk_benefits_job_id_postings',
    'fk_salaries_job_id_postings',
  ];

  const missingIndexes = expectedIndexes.filter((name) => !foundIndexes.has(name));
  const missingConstraints = expectedConstraints.filter((name) => !foundConstraints.has(name));

  if (missingIndexes.length > 0 || missingConstraints.length > 0) {
    if (missingIndexes.length > 0) {
      console.error('[db:migrate:relations] missing indexes:', missingIndexes.join(', '));
    }
    if (missingConstraints.length > 0) {
      console.error('[db:migrate:relations] missing constraints:', missingConstraints.join(', '));
    }
    process.exit(1);
  }

  console.log('[db:migrate:relations] verification passed');
}

async function main() {
  console.log('\n[db:migrate:relations] Starting relational integrity migration');

  const preflight = await getPreflight();
  console.log('[db:migrate:relations] Preflight:', preflight);

  if (hasPreflightErrors(preflight)) {
    console.error('[db:migrate:relations] Preflight failed. Resolve integrity drift first (run cleanup:relations).');
    process.exit(1);
  }

  await ensureUniqueIndexes();
  await ensureConstraints();
  await verify();

  console.log('[db:migrate:relations] Completed successfully');
}

main().catch((error) => {
  console.error('[db:migrate:relations] fatal error', error);
  process.exit(1);
});
