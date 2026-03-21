---
name: Security Audit March 2026
description: Comprehensive security audit findings for the job-postings-analysis-app — covers SQL injection, auth, secrets, API security, XSS, and infrastructure
type: project
---

Full security audit completed 2026-03-20. Key architectural security facts:

- DB queries use Drizzle ORM parameterized queries throughout (sql`` tagged templates). One area of concern: `getJobsByCityFiltered` in shared.ts line ~1528 uses `%${search}%` LIKE without `escapeLike()`.
- `validAnnualSalaryFilter` uses `sql.raw()` with a runtime allowlist of hardcoded aliases — verified safe.
- All API routes have input validation via `lib/api-validation.ts` (bounded int, enum, string length).
- NO authentication or authorization on any route, including `/admin` and `/api/admin/health`.
- ML proxy has SSRF protection via allowlisted hostnames, rate limiting via token bucket.
- `.adzuna-usage.json` is tracked in git (gitignore has `!.adzuna-usage.json`), exposing usage patterns.
- `Dockerfile.frontend` passes DATABASE_URL as a build ARG, baking it into Docker image layers.
- No `Content-Security-Policy` header configured.
- No global error boundary (`error.tsx`) exists — unhandled errors may leak stack traces.
- `IP_HASH_SECRET` has a hardcoded fallback default in production path.
- `console.error` in `app/companies/[slug]/page.tsx:75` logs raw error objects server-side (acceptable) but no error leakage to client confirmed.

**Why:** Establishes baseline for future audits and tracks known security posture.
**How to apply:** Reference when reviewing PRs that touch queries, API routes, auth, or infrastructure config.
