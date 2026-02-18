# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint

# Database
npm run db:generate        # Regenerate Drizzle types after schema changes
npm run db:migrate         # Run migration helper
npm run db:migrate:production  # Apply production migrations
npm run db:test            # Test DB connectivity

# Data import
npm run preview:adzuna     # Dry-run Adzuna import (no DB writes)
npm run import:adzuna      # Import jobs from Adzuna API
npm run cleanup:companies  # Remove duplicate companies

# Utilities
npm run geocode            # Geocode company locations
npm run validate:secrets   # Validate API credentials and quota limits
```

## Architecture

**Job analytics dashboard** — collects job postings from the Adzuna API, normalizes the data, and surfaces insights about roles, skills, companies, salaries, and geographic trends.

### Stack

- **Next.js 16 App Router** with React 19 — server components used for all data fetching; minimal client JS
- **Drizzle ORM + PostgreSQL (Neon serverless)** — type-safe queries, lazy-initialized connection in [db/index.ts](db/index.ts)
- **Tailwind CSS v4** + Radix UI (headless) + Recharts + Leaflet
- **nuqs** — URL search param state management (filters, pagination)

### Key Files

| File                                                         | Purpose                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [db/schema.ts](db/schema.ts)                                 | All table definitions and Drizzle relations                                     |
| [db/queries.ts](db/queries.ts)                               | All database queries (~2,350 lines) — roles, skills, companies, trends, filters |
| [db/index.ts](db/index.ts)                                   | DB connection with lazy initialization                                          |
| [lib/adzuna-import-helpers.ts](lib/adzuna-import-helpers.ts) | Adzuna API integration, rate limiting, company matching/deduplication           |
| [lib/adzuna-usage-tracker.ts](lib/adzuna-usage-tracker.ts)   | Quota tracking via `.adzuna-usage.json` (daily/weekly/monthly)                  |
| [lib/search-params.ts](lib/search-params.ts)                 | nuqs search param definitions shared across pages                               |
| [lib/slugify.ts](lib/slugify.ts)                             | URL slug generation used throughout routing                                     |

### Database Schema

Core tables: `postings`, `companies`, `skills`, `job_skills`, `job_industries`, `benefits`, `salaries`, `role_aliases`, `adzuna_usage`.

Deduplication uses composite index `(external_id, source, country)` on `postings`. Companies are deduplicated by normalized name with a case-insensitive index.

`role_aliases` maps variant job titles (e.g. "Frontend Dev") to canonical names (e.g. "Frontend Developer") — used at import time and for slug resolution.

### Page/Route Structure

```
app/
  page.tsx              # Homepage overview
  roles/
    page.tsx            # Role listing with filters + analytics
    [slug]/page.tsx     # Role detail (top skills, companies, salary stats)
  skills/[slug]/        # Skill detail
  companies/[slug]/     # Company detail
  locations/[slug]/     # Location detail
  trends/               # Time-series trending
  api/
    trending/           # Trending data endpoint
    skills/             # Skills data endpoint
    companies/compare/  # Company comparison endpoint
```

### Data Flow

1. **Import**: `scripts/import-adzuna.ts` → Adzuna API → normalized insert into `postings` + `companies` (with rate limiting: 2.5s between requests, tracks quota in `.adzuna-usage.json`)
2. **Query**: All analytics queries live in `db/queries.ts` and are called directly from server components
3. **Render**: Pages are server-rendered with async data; filters use nuqs for URL-synced state; charts/maps hydrate client-side

### Environment Variables

Required in `.env.local`:

```
DATABASE_URL=postgresql://...
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
```

See `.env.local.example` for all optional Adzuna import config (roles, locations, rate limits, quotas).

### Schema Changes Workflow

1. Edit `db/schema.ts`
2. `npm run db:generate` — regenerates types
3. Write a migration SQL file in `db/migrations/`
4. `npm run db:migrate` or `npm run db:migrate:production`
