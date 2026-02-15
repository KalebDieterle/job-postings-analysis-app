# Adzuna Job Import System

Automated daily job posting imports from the Adzuna API into your PostgreSQL database.

## 📋 Overview

This system provides:
- **Preview Script**: Test data transformation without database writes
- **Import Script**: Production import with rate limiting and error handling
- **Daily Automation**: GitHub Actions workflow for scheduled imports
- **API Usage Tracking**: Monitor and respect Adzuna's rate limits

## 🚀 Quick Start

### 1. Database Migration

First, apply the database schema changes to add support for external job sources:

```bash
# Generate migration (already done)
npm run db:generate

# Apply migration to database
npm run db:migrate
```

This adds the following fields to the `postings` table:
- `external_id`: Stores Adzuna's job ID
- `source`: Tracks data origin (e.g., "adzuna", "manual")
- `import_timestamp`: Records when the job was imported

### 2. Environment Setup

Copy the example environment file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Adzuna API credentials:

```env
ADZUNA_APP_ID="your_app_id_here"
ADZUNA_APP_KEY="your_api_key_here"
```

Get your API credentials from [Adzuna Developer Portal](https://developer.adzuna.com/).

### 3. Test with Preview Script

Before running the actual import, preview what data will be imported:

```bash
npm run preview:adzuna
```

This will:
- Fetch 20 sample jobs from Adzuna
- Display transformed data
- Show validation warnings
- Highlight data quality issues
- **No database writes** - completely safe to run

### 4. Run Local Import

Once you're satisfied with the preview, run the actual import:

```bash
npm run import:adzuna
```

The script will:
- Fetch jobs based on your configuration
- Respect API rate limits (2.5s between requests)
- Create/match companies automatically
- Insert new jobs and update existing ones
- Track API usage in `.adzuna-usage.json`
- Display detailed progress and statistics

## ⚙️ Configuration

All configuration is done via environment variables in `.env.local`:

| Variable | Default | Description |
|----------|---------|-------------|
| `ADZUNA_ROLES` | See example | Comma-separated list of job roles to search |
| `ADZUNA_LOCATIONS` | `"us"` | Location codes (ISO country codes) |
| `ADZUNA_RESULTS_PER_PAGE` | `50` | Results per API request (max 50) |
| `ADZUNA_MAX_RESULTS` | `200` | Total results per import run |
| `ADZUNA_RATE_LIMIT_MS` | `2500` | Delay between requests (milliseconds) |
| `ADZUNA_DAILY_LIMIT` | `240` | Max API requests per day |
| `ADZUNA_DAYS_BACK` | `2` | Search for jobs posted in last N days |

### Example Configuration

For daily incremental updates:
```env
ADZUNA_DAYS_BACK=2
ADZUNA_MAX_RESULTS=200
```

For initial bulk import (be careful with API limits):
```env
ADZUNA_DAYS_BACK=30
ADZUNA_MAX_RESULTS=500
```

## 🤖 Automated Daily Imports

### GitHub Actions Setup

The included workflow automatically imports jobs daily at 2 AM UTC.

#### Step 1: Set Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `DATABASE_URL`: Your PostgreSQL connection string
- `ADZUNA_APP_ID`: Your Adzuna application ID
- `ADZUNA_APP_KEY`: Your Adzuna API key

#### Step 2: Push the Workflow

The workflow file is already created at `.github/workflows/daily-adzuna-import.yml`.

```bash
git add .github/workflows/daily-adzuna-import.yml
git commit -m "Add daily Adzuna import workflow"
git push
```

#### Step 3: Verify

- Go to Actions tab in your GitHub repository
- You should see "Daily Adzuna Job Import" workflow
- Click "Run workflow" to test it manually

### Manual Trigger

You can manually trigger the workflow from the Actions tab:
1. Go to Actions → Daily Adzuna Job Import
2. Click "Run workflow"
3. Optionally adjust `max_results` parameter
4. Click "Run workflow" button

### Monitoring

**View Logs:**
- Go to Actions tab
- Click on a workflow run
- Expand the "Run Adzuna import" step

**Check Usage:**
- Import logs are uploaded as artifacts
- Download `.adzuna-usage.json` to see API usage stats

**Failure Notifications:**
- On failure, a GitHub issue is automatically created
- Issue includes error details and troubleshooting steps
- Tagged with `bug`, `automation`, `adzuna-import` labels

## 📊 API Rate Limits

Adzuna's free tier limits:
- **25 requests per minute**
- **250 requests per day**
- **1,000 requests per week**
- **2,500 requests per month**

The import script respects these limits:
- 2.5 second delay between requests (24 req/min)
- Tracks daily, weekly, and monthly usage
- Stops automatically when limits are reached
- Usage stats stored in `.adzuna-usage.json`

### Checking Usage

```bash
cat .adzuna-usage.json
```

Example output:
```json
{
  "daily": { "date": "2026-02-15", "count": 48 },
  "weekly": { "startDate": "2026-02-10", "count": 156 },
  "monthly": { "month": "2026-02", "count": 892 }
}
```

## 🔍 How It Works

### Data Flow

```
Adzuna API → Rate Limiter → Validation → Transformation → Company Matching → Database Insert
```

### Company Matching

The system intelligently matches companies to avoid duplicates:

1. **Normalize name**: Remove "Inc", "LLC", "Corp", etc.
2. **Generate deterministic ID**: SHA-256 hash of normalized name
3. **Search existing**: Case-insensitive lookup by name
4. **Create if new**: Insert with geocoded location data

Example:
- "Google LLC" → Normalized: "google" → ID: `a7b2c8f1e9d4...`
- "Google Inc" → Normalized: "google" → ID: `a7b2c8f1e9d4...` (same!)

### Deduplication

Jobs are deduplicated using `(external_id, source)`:
- `external_id`: Adzuna's job ID
- `source`: Always "adzuna" for these imports

If a job already exists:
- Updates salary, location, and other mutable fields
- Preserves original `job_id` and `listed_time`
- Updates `import_timestamp` to track freshness

### Validation

Each job is validated before import:
- Required fields: ID, title, company, location, URL, created date
- Optional but recommended: Description, salary, work type
- Invalid jobs are logged but skipped (no database writes)

## 🛠️ Troubleshooting

### "Missing Adzuna API credentials"

**Problem**: Script can't find `ADZUNA_APP_ID` or `ADZUNA_APP_KEY`

**Solution**:
1. Check `.env.local` exists in project root
2. Verify credentials are set correctly
3. Restart your terminal/IDE to reload environment

### "Daily API limit reached"

**Problem**: Hit 250 requests/day limit

**Solution**:
1. Wait until tomorrow (resets at midnight UTC)
2. Check `.adzuna-usage.json` for current usage
3. Reduce `ADZUNA_MAX_RESULTS` in config
4. Reduce number of roles in `ADZUNA_ROLES`

### "Database connection failed"

**Problem**: Can't connect to PostgreSQL database

**Solution**:
1. Verify `DATABASE_URL` in `.env.local`
2. Check Neon dashboard for database status
3. Ensure IP isn't blocked by firewall
4. Test connection: `npm run db:test`

### "429 Too Many Requests"

**Problem**: Hit Adzuna's rate limit

**Solution**:
1. Increase `ADZUNA_RATE_LIMIT_MS` (try 3000ms)
2. Check `.adzuna-usage.json` for cumulative usage
3. Wait a few minutes and retry
4. The script has exponential backoff, but manual retry may be needed

### "No jobs imported"

**Problem**: Script runs but no jobs are inserted

**Possible Causes**:
1. Jobs already exist (check "updated" count in logs)
2. All jobs failed validation (check warnings in logs)
3. `ADZUNA_DAYS_BACK` too restrictive (increase to 7 or 30)
4. Search terms too specific (broaden `ADZUNA_ROLES`)

**Solution**: Run preview script first to diagnose: `npm run preview:adzuna`

### GitHub Actions Failure

**Problem**: Workflow fails in GitHub Actions

**Solution**:
1. Check Actions logs for specific error
2. Verify repository secrets are set correctly
3. Test locally first: `npm run import:adzuna`
4. Check if workflow has required permissions
5. Look for automatically created GitHub issue with details

## 🎯 Best Practices

### Initial Setup
1. Run migration: `npm run db:migrate`
2. Test preview: `npm run preview:adzuna`
3. Test local import with small dataset:
   ```env
   ADZUNA_MAX_RESULTS=50
   ADZUNA_DAYS_BACK=2
   ```
4. Verify data in database
5. Increase limits for production
6. Set up GitHub Actions

### Daily Operations
- Monitor API usage in `.adzuna-usage.json`
- Check GitHub Actions runs weekly
- Review any auto-created failure issues
- Adjust `ADZUNA_ROLES` based on your needs
- Keep `ADZUNA_DAYS_BACK=2` for incremental updates

### Scaling Up
- Adzuna API limits are per account, not per script
- Consider upgrading to paid tier for higher limits
- Run imports less frequently (every 2-3 days) to conserve API quota
- Focus on specific high-value roles instead of broad searches

## 📁 File Structure

```
├── .github/
│   └── workflows/
│       └── daily-adzuna-import.yml    # GitHub Actions workflow
├── db/
│   ├── schema.ts                       # Database schema (updated)
│   └── migrations/
│       └── 0001_*.sql                  # Migration file
├── lib/
│   ├── adzuna/                         # Existing Adzuna client
│   │   ├── client.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   └── adzuna-import-helpers.ts       # Import utilities
├── scripts/
│   ├── preview-adzuna-import.ts       # Preview script (safe, no DB writes)
│   └── import-from-adzuna.ts          # Production import script
├── .env.local                          # Your credentials (gitignored)
├── .env.local.example                  # Template
└── .adzuna-usage.json                  # API usage tracking (auto-generated)
```

## 🔄 Alternative Scheduling Options

If you prefer not to use GitHub Actions:

### Vercel Cron (Serverless)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/import-adzuna",
    "schedule": "0 2 * * *"
  }]
}
```

Create API route at `app/api/import-adzuna/route.ts`

### Railway Cron

Add to `railway.json`:
```json
{
  "deploy": {
    "startCommand": "node scripts/import-from-adzuna.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### System Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add line (runs daily at 2 AM)
0 2 * * * cd /path/to/project && npm run import:adzuna >> /var/log/adzuna-import.log 2>&1
```

### Render Cron

Create a Cron Job service in Render dashboard:
- Command: `npm run import:adzuna`
- Schedule: `0 2 * * *`
- Add environment variables

## 📞 Support

For issues specific to:
- **Adzuna API**: Check [Adzuna Docs](https://developer.adzuna.com/)
- **Database/Drizzle**: See [Drizzle ORM Docs](https://orm.drizzle.team/)
- **This import system**: Review this README and check logs

## 📝 License

Same as the parent project.
