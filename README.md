# Job Market Analytics

A full-stack analytics platform that collects real job postings from the Adzuna API, normalizes them into a relational database, and surfaces insights about roles, skills, companies, salaries, and geographic trends through an interactive web dashboard — including an ML-powered salary predictor with P10/P90 confidence intervals.

## Live Demo

Deploy the frontend to [Vercel](https://vercel.com) and the ML service to [Fly.io](https://fly.io).

---

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16 (App Router) + React 19 | Server components, ISR, streaming SSR |
| Styling | Tailwind CSS v4 + Radix UI | Utility-first + accessible headless components |
| Charts | Recharts + Leaflet | Time-series, scatter, radar, and geographic heatmaps |
| State | nuqs | URL-synced filter state (bookmarkable, shareable links) |
| ORM | Drizzle ORM | Type-safe queries against Postgres |
| Database | Neon (serverless Postgres) | Scales to zero between imports, no idle cost |
| ETL | TypeScript scripts + Adzuna API | Rate-limited import with quota tracking |
| ML Service | FastAPI + LightGBM | Quantile regression salary predictor (P10/P50/P90) |
| ML Tracking | MLflow | Experiment tracking, model promotion workflow |
| Dev Env | Docker Compose | Next.js + ML service + MLflow in one command |
| Testing | Playwright | E2E test suite (5 flows) + GitHub Actions CI |

---

## Architecture

```
Browser
  │
  ▼
Vercel (Next.js 16)          ─── ISR/SSR pages: /, /roles, /skills,
  │   Server Components             /companies, /locations, /trends
  │   nuqs URL state
  │
  ├──► Neon Postgres          ─── All analytics queries (db/queries/)
  │    (DATABASE_URL)              Drizzle ORM, lazy-initialized connection
  │
  └──► Fly.io (FastAPI)       ─── /api/v1/salary/predict
       ML Service                  /api/v1/salary/metadata
       (ML_SERVICE_URL)            LightGBM quantile regression
       LightGBM models             P10 / P50 / P90 salary estimates
              │
              └──► MLflow     ─── Experiment tracking (local Docker only)
                   (port 5001)     Model registry + promotion workflow
```

---

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.11+ (for ML service)
- Docker + Docker Compose (for full stack)
- A Postgres database (Neon recommended)

### Quick start (full stack)

```bash
# 1. Clone and install
git clone <repo-url>
cd job-postings-analysis-app
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Edit .env.local — set DATABASE_URL, ADZUNA_APP_ID, ADZUNA_APP_KEY

# 3. Start everything (Next.js + ML service + MLflow)
docker compose up

# Or just the Next.js frontend (no ML):
npm run dev
```

Open http://localhost:3000.

### Environment variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host/dbname   # Neon connection string
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key

# ML service (optional for local dev without Docker)
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_KEY=local-ml-shared-key

# Optional Adzuna import config
ADZUNA_DAILY_LIMIT=200
ADZUNA_MAX_PAGES=5
```

---

## Database Setup

```bash
# Apply schema migrations
npm run db:migrate

# Regenerate Drizzle types after schema changes
npm run db:generate
```

---

## Data Import

The ETL pipeline pulls job postings from the Adzuna API with built-in rate limiting (2.5s between requests) and quota tracking (`.adzuna-usage.json`).

```bash
# Dry run — preview what would be imported (no DB writes)
npm run preview:adzuna

# Full import
npm run import:adzuna

# Remove duplicate companies after import
npm run cleanup:companies

# Geocode company locations (lat/lng for heatmap)
npm run geocode
```

---

## ML Service

The salary predictor runs as a separate FastAPI service. Models are pre-trained LightGBM quantile regressors stored in `ml-service/models/`.

### Retrain models

```bash
cd ml-service
pip install -r requirements.txt

# Export training data from Postgres
python training/export_data.py

# Train all quantile models (median, P10, P90) — logs to MLflow
python training/train_all.py

# Promote best run to production
python training/promote_model.py
```

### Start ML service locally

```bash
cd ml-service
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

### MLflow UI

```bash
docker compose up mlflow
# Open http://localhost:5001
```

---

## Key Design Decisions

- **Why Drizzle ORM?** Lightweight, TypeScript-native, no runtime code generation overhead. Queries are plain SQL-like expressions — easy to audit and optimize.
- **Why LightGBM for salary prediction?** Handles non-linear interactions between skills, title, and location without feature engineering. Native support for quantile loss allows simultaneous P10/P50/P90 training.
- **Why nuqs for filter state?** URL-first state keeps every filter combination bookmarkable and shareable without a client-side state manager.
- **Why Neon (serverless Postgres)?** Auto-scales to zero between ETL imports, eliminating idle database cost for a low-traffic portfolio project while maintaining full Postgres compatibility.
- **Why streaming SSR?** Heavy analytics pages use React `<Suspense>` boundaries so the page shell loads immediately while expensive DB queries stream in progressively — measurable improvement in Time to First Byte.

---

## QA & Testing

```bash
# QA smoke tests (all routes return 2xx, invalid slugs return 404)
npm run qa:smoke

# Data integrity checks
npm run qa:data

# Full QA suite
npm run qa:full

# E2E tests (requires running app on localhost:3000)
npm run test:e2e

# E2E with interactive browser UI
npm run test:e2e:ui
```

E2E tests cover: homepage stats, roles filter + slug navigation, skills view toggle + export, salary predictor form, locations map tab.

---

## Deployment

### Vercel (frontend)

1. Connect the repo to Vercel.
2. Set environment variables in the Vercel dashboard:
   - `DATABASE_URL`
   - `ML_SERVICE_URL` — Fly.io ML service URL
   - `ML_SERVICE_KEY` — shared secret
3. Deploy. ISR revalidation is set to 1800s (30 min).

### Fly.io (ML service)

```bash
cd ml-service
fly launch          # first time
fly deploy          # subsequent deploys
fly secrets set ML_SERVICE_KEY=your-secret DATABASE_URL=your-db-url
fly status          # confirm healthy
```

Health check: `GET /api/v1/health` → `{"status": "ok", "models_loaded": true}`

---

## Page / Route Map

| Route | Description |
|-------|-------------|
| `/` | Homepage: hero stats, trending skills, quick-action grid |
| `/roles` | Role listing with filters (experience, salary, search) + charts |
| `/roles/[slug]` | Role detail: salary stats, top skills, radar chart, ML prediction |
| `/skills` | Skills explorer with demand/salary scatter + co-occurrence matrix |
| `/skills/[slug]` | Skill detail: timeline, top companies |
| `/companies` | Company listing with salary benchmarks + comparison panel |
| `/companies/[slug]` | Company detail: hiring momentum, location footprint, salary bands |
| `/locations` | Locations overview with Leaflet heatmap + market scatter plot |
| `/locations/[slug]` | Location detail: salary distribution, skill/company breakdown |
| `/trends` | 30-day trending skills with growth rates |
| `/intelligence/salary-predictor` | ML salary predictor with P10/P90 confidence interval |
| `/data-health` | Database coverage and data quality dashboard |

---

## CI / CD

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `qa-gate.yml` | push/PR | Build + lint + QA smoke + data integrity |
| `e2e.yml` | push/PR | Playwright E2E tests (5 flows) |
| `lighthouse.yml` | PR | Lighthouse CI performance/accessibility audit |
| `daily-adzuna-import.yml` | cron daily | Pulls fresh job postings via Adzuna API |
| `weekly-ml-retrain.yml` | cron weekly | Retrains salary models with latest data |
