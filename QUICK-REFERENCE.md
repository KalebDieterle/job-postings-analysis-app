# 🚀 Adzuna Import - Quick Reference

## Commands

```bash
# 1. Preview (safe, no DB writes)
npm run preview:adzuna

# 2. Import jobs
npm run import:adzuna

# 3. Apply migration (if needed)
npm run db:migrate:adzuna
```

## Files Overview

| File | Purpose |
|------|---------|
| `lib/adzuna-import-helpers.ts` | Core utilities (transform, rate limit, company matching) |
| `scripts/preview-adzuna-import.ts` | Test script - shows what would be imported |
| `scripts/import-from-adzuna.ts` | Production import - writes to database |
| `.env.local` | Your credentials (gitignored) |
| `.adzuna-usage.json` | API usage tracking (auto-generated) |
| `README-ADZUNA-IMPORT.md` | Full documentation |

## Key Features

✅ **Smart Deduplication**: Uses `(external_id, source)` to avoid duplicates  
✅ **Rate Limiting**: 2.5s between requests (24/min, under 25/min limit)  
✅ **Usage Tracking**: Monitors daily/weekly/monthly API usage  
✅ **Company Matching**: Normalizes names to avoid duplicate companies  
✅ **Validation**: Checks data quality before inserting  
✅ **Automation Ready**: GitHub Actions workflow included  

## Configuration (`.env.local`)

```env
# Required
ADZUNA_APP_ID="your_app_id"
ADZUNA_APP_KEY="your_api_key"
DATABASE_URL="your_neon_connection_string"

# Optional (these are the defaults)
ADZUNA_ROLES="software engineer,data engineer,devops engineer,frontend developer,backend developer,full stack developer"
ADZUNA_LOCATIONS="us"
ADZUNA_MAX_RESULTS=200
ADZUNA_DAYS_BACK=2
ADZUNA_RATE_LIMIT_MS=2500
ADZUNA_DAILY_LIMIT=240
```

## API Limits (Free Tier)

- 25 requests/minute ⏱️
- 250 requests/day 📅
- 1,000 requests/week 📊
- 2,500 requests/month 📈

## GitHub Actions Setup

1. **Add Secrets** (Settings → Secrets → Actions):
   - `DATABASE_URL`
   - `ADZUNA_APP_ID`
   - `ADZUNA_APP_KEY`

2. **Push Workflow**:
   ```bash
   git add .github/workflows/daily-adzuna-import.yml
   git commit -m "Add daily import automation"
   git push
   ```

3. **Test**: Actions tab → "Daily Adzuna Job Import" → "Run workflow"

## Data Flow

```
Adzuna API
  ↓ (fetch jobs)
Rate Limiter (2.5s delay)
  ↓
Validation (check required fields)
  ↓
Transformation (map to DB schema)
  ↓
Company Matching (find or create)
  ↓
PostgreSQL Insert/Update
  ↓
Statistics & Logs
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Daily limit reached" | Wait until midnight UTC or reduce `ADZUNA_MAX_RESULTS` |
| "No jobs imported" | Jobs already exist (check "updated" count) |
| "Missing credentials" | Check `.env.local` has `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` |
| "Database error" | Verify `DATABASE_URL` and run `npm run db:migrate:adzuna` |

## Check API Usage

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

## Database Schema Changes

New fields added to `postings` table:
- `external_id` (text) - Adzuna's job ID
- `source` (text) - Data source ("adzuna", "manual", etc.)
- `import_timestamp` (timestamp) - When job was imported

New indexes:
- `postings_external_id_source_idx` on (`external_id`, `source`)
- `companies_name_lower_idx` on `LOWER(companies.name)`

## Next Steps

1. ✅ Migration applied
2. ✅ Preview tested (20 jobs fetched successfully)
3. ⏭️ Run first import: `npm run import:adzuna`
4. ⏭️ Set up GitHub Actions (optional)
5. ⏭️ Monitor and adjust configuration

---

📖 Full docs: `README-ADZUNA-IMPORT.md`  
🎉 Implementation summary: `IMPLEMENTATION-SUMMARY.md`
