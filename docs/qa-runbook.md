# QA Runbook

## Purpose
Repeatable Week 11 quality checks for route health, query-parameter handling, API behavior, and data integrity.

## Prerequisites
- `npm install`
- `DATABASE_URL` configured in `.env.local`
- Built app for local QA gate simulation:
  - `npm run build`
  - `npm run start -- --port 3100`

## Local Run Order
1. `npm run lint`
2. `npm run build`
3. Start app: `npm run start -- --port 3100`
4. In another terminal: `BASE_URL=http://127.0.0.1:3100 npm run qa:full`

## QA Commands
- `npm run qa:smoke`
  - Runs:
    - `scripts/qa/smoke-routes.ts`
    - `scripts/qa/smoke-query-params.ts`
    - `scripts/qa/smoke-api.ts`
- `npm run qa:data`
  - Runs `scripts/qa/data-integrity.ts`
- `npm run qa:full`
  - Runs smoke + data integrity suites

## Relation Integrity Remediation
- Dry run cleanup report:
  - `npm run cleanup:relations:dry-run`
- Apply cleanup (destructive):
  - `npm run cleanup:relations`
- Apply DB hardening (constraints/indexes):
  - `npm run db:migrate:relations`
- Read-only relation verification:
  - `npm run verify:relations`

## Expected Output
Each suite prints:
- Suite name and PASS/FAIL
- Per-check status with details
- Failing checks set non-zero exit code

## Triage Severity Matrix
- `critical`
  - Data integrity violations that break trust (orphan joins, null critical fields)
  - Action: stop release
- `high`
  - Broken route/API or major analytics regression
  - Action: block release until fixed
- `medium`
  - Incorrect normalization, non-contiguous baseline, notable data quality drift
  - Action: fix before release when user-facing
- `low`
  - Cosmetic or informational checks
  - Action: track and batch if non-blocking

## Release Signoff Checklist
1. `npm run lint` passes.
2. `npm run build` passes.
3. `BASE_URL=http://127.0.0.1:3100 npm run qa:full` passes.
4. Verify top-level pages load: `/`, `/roles`, `/skills`, `/companies`, `/locations`, `/trends`.
5. Verify invalid dynamic slugs return 404.
6. Verify trends comparison mode messaging matches available baseline mode.
7. Confirm CI workflow `QA Gate` passes on PR/main.

