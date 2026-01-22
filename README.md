# Job Postings Analysis App

An analytics and exploratory UI for job postings data built on Next.js (App Router). The app collects, normalizes, and analyzes job postings to surface top roles, trending skills, hiring companies, and basic salary statistics.

This README documents the project structure, how the pieces fit together, and how to run, develop, and extend the app.

## Table of contents

- Project overview
- Tech stack (detailed)
- Repository layout
- Local development
- Database and data loading
- Migrations and schema management
- Key implementation notes
- Deployment guidance
- Troubleshooting & common issues
- Contributing

## Project overview

The app is a small analytics surface over a set of job postings CSVs and a relational database. It presents:

- A roles listing with sparklines and counts
- Role detail pages that show top skills, companies, and aggregate statistics
- Charts and small UI building blocks to explore the data

The codebase uses the Next.js App Router, server components for data fetching, and a thin React client layer for interactive UI pieces.

## Tech stack (detailed)

Below is a breakdown of the libraries and technologies used and why they were chosen.

- **Next.js (App Router)**: Provides file-based routing with server and client components. Pages and routes live in the `app/` directory and the project uses server-side rendering and data fetching via async server components.

- **React 19**: UI library. The project uses both server and client components; client components enable interactive elements like charts and small utilities.

- **TypeScript**: Static typing across the codebase for better DX and safer refactors. Config is in `tsconfig.json`.

- **Tailwind CSS v4 + PostCSS**: Utility-first styling. The project uses `globals.css` and Tailwind classes across components. PostCSS is configured in `postcss.config.mjs`.

- **Drizzle ORM + drizzle-kit**: Lightweight TypeScript-first ORM used to define schema and run queries against Postgres. Schema and queries are in `db/schema.ts` and `db/queries.ts`. Migrations are driven by `drizzle-kit` and helper scripts.

- **Postgres (serverless / Neon-ready)**: The data is stored in a Postgres-compatible database. The package `@neondatabase/serverless` is included and the code expects a `DATABASE_URL` compatible with Postgres/Neon.

- **@tanstack/react-query**: Client-side data fetching and caching for interactive parts (if used in the future or client components).

- **Papaparse**: Fast CSV parsing for data import tasks and scripts in `PSQL Data Loader/` and `scripts/`.

- **Recharts**: Charting library used for visualizations (sparklines and other simple charts).

- **Lucide-react**: Icon set used throughout the UI (`lucide-react`).

- **Radix UI primitives**: Accessible headless components provided by `@radix-ui/*` packages.

- **nuqs, class-variance-authority, clsx, tailwind-merge**: Utility libraries for class management and design-system utilities.

- **tsx**: Dev tool to run TypeScript scripts under `scripts/` and `db/migrate.ts` without a separate build step.

- **Drizzle-kit migration scripts**: The repo includes `db/migrate.ts` and `drizzle.config.ts` to manage schema migrations and generate types.

## Repository layout

- `app/` — Next.js App Router pages and layouts. Key routes:
  - `app/roles/page.tsx` — roles listing
  - `app/roles/[slug]/page.tsx` — role detail page

- `components/` — UI primitives and composed components. `components/ui/` contains cards, buttons, charts and other building blocks.

- `db/` — Drizzle schema, queries, migrate helper, and migrations folder.

- `PSQL Data Loader/` — CSVs and scripts used to import the original dataset into Postgres. Large CSVs are stored here for offline loading.

- `scripts/` — misc helper scripts for imports and data transformations.

- `public/` — static assets.

- `package.json` — scripts and dependencies.

Key files to inspect:

- [app/roles/page.tsx](app/roles/page.tsx) — roles listing and how slugs are generated via `slugify`.
- [app/roles/[slug]/page.tsx](app/roles/[slug]/page.tsx) — role detail page, server-side fetched via Drizzle queries.
- [db/queries.ts](db/queries.ts) — the SQL/ORM queries used by the app.
- [db/schema.ts](db/schema.ts) — Drizzle schema definitions.

## Local development

Prerequisites

- Node.js 18+ (LTS) or newer
- A Postgres database (local Postgres, Docker, or Neon). You must have a `DATABASE_URL` env var available.

Install dependencies and run dev server:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Useful scripts (in `package.json`):

- `npm run dev` — run Next dev server
- `npm run build` — build for production
- `npm run start` — start production server
- `npm run db:generate` — generate types from Drizzle (drizzle-kit)
- `npm run db:migrate` — run migration helper (`tsx ./db/migrate.ts`)
- `npm run db:test` — quick DB connectivity / query test script

Environment variables

Create a `.env.local` with at least:

```
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

If using Neon or serverless Postgres, set the connection string accordingly.

## Database & data loading

The project ships with CSV exports in `PSQL Data Loader/`. There are two main import paths:

- A Python loader (`PSQL Data Loader/psql_loader.py`) for offline bulk import to a Postgres instance.
- Smaller TypeScript helper scripts under `scripts/` and `db/` to run transformations and migrations.

High-level import steps:

1. Prepare a Postgres instance and set `DATABASE_URL`.
2. Run schema migrations (see `db/migrate.ts` / `drizzle-kit`).
3. Use the provided loader (Python or TS) to bulk-insert CSV rows into the `postings` and `companies` tables.

Notes on data size: the CSV dataset included in this repo can be large; the loader scripts assume you have sufficient disk and DB capacity.

## Migrations and schema management

This repo uses Drizzle + drizzle-kit for schema and migrations. Typical workflow:

1. Edit `db/schema.ts` to alter table definitions.
2. Run `npm run db:generate` to regenerate types (if configured).
3. Run `npm run db:migrate` to apply the migration helper (this project uses `db/migrate.ts`).

The `db/migrations/` folder contains generated SQL migration files.

## Key implementation notes

- Server vs Client components: The app primarily uses server components for pages and data fetching (async components). Components that use browser-only APIs or state use `"use client"` at the top (see `components/ui/role-card.tsx`).

- Slug generation: Titles are slugified with `lib/slugify.ts`. Defensive checks are required because malformed or empty titles can yield an empty slug. The roles listing uses `href={`/roles/${slugify(r.title)}`}` — ensure the slug is non-empty before rendering a link.

- Queries: All DB access is centralized in `db/queries.ts`. These functions return raw Drizzle results which are then rendered by server components.

- Charts and visuals: Sparklines / charts use `recharts` and simple SVG helpers in `components/ui/`.

## Deployment guidance

- Environment: Deploy to Vercel for the simplest Next.js experience. Set `DATABASE_URL` in the project environment.
- Build: `npm run build` then `npm run start` (Vercel will handle this for you).

If you deploy to a platform other than Vercel, ensure Node 18+ and the same environment variables are available.

## Troubleshooting & common issues

- TypeError: `Cannot read properties of undefined (reading 'split')` — This indicates a missing `slug` param in `app/roles/[slug]/page.tsx` when the route param isn't present or is an array. Guard the route with null-checks and call `notFound()` to render the 404 instead of crashing. Example:

```ts
const slugStr = Array.isArray(slug) ? slug.join("-") : (slug ?? "");
if (!slugStr) notFound();
```

- Empty slugs in listing — ensure `slugify(title)` returns a value before rendering an `href`. If `slugify` returns an empty string (title contains only filtered characters), do not render the link.

- Database connectivity errors — confirm `DATABASE_URL`, that the DB is running, and that migrations were applied.

## Contributing

If you'd like to contribute:

1. Fork the repository and create a branch for your change
2. Run the dev server locally and add tests where appropriate
3. Open a PR describing your changes

## Useful files and quick references

- `app/roles/page.tsx` — roles listing
- `app/roles/[slug]/page.tsx` — role detail
- `components/ui/role-card.tsx` — role card component
- `lib/slugify.ts` — slug helper
- `db/queries.ts` — all DB queries
- `db/schema.ts` — schema definitions
- `db/migrate.ts` — migration helper script
- `PSQL Data Loader/` — CSVs and import tools

---

If you want, I can:

- run through the README and add example screenshots / sample queries
- add a short troubleshooting section with exact SQL commands to inspect the `postings` table
- or apply additional improvements to `slugify` so it never returns an empty slug automatically.

Which of the follow-ups would you like me to do now?
