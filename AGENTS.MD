# AGENTS Guide - job-postings-analysis-app

This file defines how coding agents should work in this repository.

## Project Snapshot

- Stack: Next.js (App Router), React, TypeScript, Tailwind CSS, Drizzle ORM, Neon Postgres.
- Purpose: Analyze and explore job posting data (roles, skills, companies, salary trends).
- Primary areas:
- `app/` pages and route handlers
- `components/` UI components
- `db/` schema, queries, migrations
- `scripts/` data import and maintenance scripts

## Working Rules

- Keep changes focused and minimal for the requested task.
- Prefer TypeScript-safe changes over quick untyped fixes.
- Preserve existing conventions and file organization.
- Do not introduce new dependencies unless required by the task.
- If a change affects database shape or queries, update `db/schema.ts` and related scripts together.

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- DB generate: `npm run db:generate`
- DB migrate: `npm run db:migrate`

## Data/DB Safety

- Treat production-like data as sensitive.
- Prefer dry-run commands when available:
- `npm run cleanup:companies:dry-run`
- `npm run recreate:companies:dry-run`
- `npm run migrate:company-ids:dry-run`
- `npm run apply:company-id-migration:dry-run`
- Never commit secrets; use `.env.local` for local values.

## Validation Expectations

- For UI/code changes: run `npm run lint` and targeted smoke checks.
- For DB/script changes: run relevant script in dry-run mode first, then real mode only when requested.
- Include a short summary of what was changed and what was validated.

## Notes

- Repo already ignores local `config.toml` in `.gitignore`.
- Keep this file updated when workflows or commands change.
