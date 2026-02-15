# Production Safety Improvements - Adzuna Import Pipeline

## Overview

This migration adds five critical production-safety improvements to the Adzuna job ingestion pipeline:

1. **Database-backed API quota tracking** (replaces file-based `.adzuna-usage.json`)
2. **Global job deduplication** using `(external_id, source, country)`
3. **Location-aware company identity** to prevent collisions
4. **Scheduling resilience** to avoid API contention
5. **Comprehensive migrations** with referential integrity

---

## 🚀 Quick Start

### 1. Run Database Migrations

```bash
# Apply schema changes (adzuna_usage table + country column)
psql $DATABASE_URL -f db/migrations/0002_add_adzuna_usage_table.sql
psql $DATABASE_URL -f db/migrations/0003_add_country_to_postings.sql

# Verify migrations
psql $DATABASE_URL -c "SELECT * FROM adzuna_usage LIMIT 1;"
psql $DATABASE_URL -c "SELECT country FROM postings LIMIT 1;"
```

### 2. Migrate Company IDs (CRITICAL)

⚠️ **BACKUP YOUR DATABASE FIRST**

```bash
# Dry-run to see what would change
npm run migrate:company-ids:dry-run

# Apply the migration
npm run migrate:company-ids
```

This recomputes all `company_id` values using the new hash function that includes city+state.

### 3. Test Import

```bash
# Preview mode (no DB writes)
npm run preview:adzuna

# Live import
npm run import:adzuna
```

---

## 📋 What Changed

### 1. Database-Backed API Quota Tracking

**Problem**: File-based `.adzuna-usage.json` caused race conditions in CI/CD environments.

**Solution**: New `adzuna_usage` table in PostgreSQL with atomic operations.

#### New Table Schema

```sql
CREATE TABLE adzuna_usage (
  period TEXT NOT NULL,           -- 'daily', 'weekly', 'monthly'
  period_key TEXT NOT NULL,       -- e.g. '2026-02-15', '2026-W07', '2026-02'
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (period, period_key)
);
```

#### API

```typescript
import { getAllUsage, incrementAllPeriods, checkQuotaLimits } from '@/lib/adzuna-usage-tracker';

// Load current usage
const usage = await getAllUsage();
// { daily: 120, weekly: 450, monthly: 1200 }

// Increment after requests
await incrementAllPeriods(25);

// Check limits before import
const check = await checkQuotaLimits({ daily: 250, weekly: 1000, monthly: 2500 });
if (!check.allowed) {
  console.error(`Quota exceeded: ${check.exceeded}`);
}
```

---

### 2. Global Job Deduplication

**Problem**: Jobs from multiple countries could collide on `(external_id, source)`.

**Solution**: Added `country` column to `postings` table for global uniqueness.

#### Schema Change

```typescript
// Before: (external_id, source)
// After:  (external_id, source, country)

export const postings = pgTable("postings", {
  // ...existing fields...
  country: text("country"), // NEW
}, (table) => ({
  // Updated index
  externalIdSourceCountryIdx: index('postings_external_id_source_country_idx')
    .on(table.external_id, table.source, table.country),
}));
```

#### Usage

```typescript
// transformAdzunaJob now requires country parameter
const transformedJobs = validJobs.map(job => transformAdzunaJob(job, 'US'));

// jobExists checks by (external_id, source, country)
const exists = await jobExists('12345', 'adzuna', 'US');
```

---

### 3. Location-Aware Company Identity

**Problem**: Companies with same name in different locations got duplicate records.

**Solution**: Company ID now includes city+state in hash.

#### Before

```typescript
generateCompanyId("ABC Company") 
// → "a1b2c3d4e5f6g7h8"
// Same ID for ALL locations!
```

#### After

```typescript
generateCompanyId("ABC Company", "San Francisco", "CA")
// → "a1b2c3d4e5f6g7h8"

generateCompanyId("ABC Company", "Austin", "TX")
// → "x9y8z7w6v5u4t3s2"
// Different ID for different locations!
```

#### Migration Required

**⚠️ This change breaks existing company_id references!**

You MUST run the migration script:

```bash
npm run migrate:company-ids
```

This script:
1. Recomputes all company_ids with new hash function
2. Updates postings.company_id foreign keys
3. Recreates companies table rows with new IDs
4. Verifies referential integrity

---

### 4. Scheduling Resilience

**Problem**: Multiple CI jobs starting at midnight UTC race for API quota.

**Solution**: Added `SAFE_API_START_MINUTE` wait logic.

#### Configuration

```typescript
const SAFE_API_START_MINUTE = 17;
```

#### Behavior

```
Current time: 02:05 UTC
├─ Wait 12 minutes until minute 17
├─ Avoids API contention from global quota resets
└─ Start import at 02:17 UTC
```

#### GitHub Actions Update

```yaml
# .github/workflows/daily-adzuna-import.yml
on:
  schedule:
    # Start at 2:00 AM UTC
    # Script waits until 2:17 AM to avoid contention
    - cron: '0 2 * * *'
```

---

### 5. Updated Functions

#### `generateCompanyId()`

```typescript
// OLD signature
generateCompanyId(companyName: string, locationDisplay?: string): string

// NEW signature  
generateCompanyId(
  companyName: string,
  city?: string | null,
  state?: string | null
): string
```

#### `transformAdzunaJob()`

```typescript
// OLD signature
transformAdzunaJob(job: AdzunaJob): JobRecord

// NEW signature
transformAdzunaJob(job: AdzunaJob, country: string = 'US'): JobRecord & { country: string }
```

#### `jobExists()`

```typescript
// OLD signature
jobExists(externalId: string, source: string): Promise<boolean>

// NEW signature
jobExists(externalId: string, source: string, country: string): Promise<boolean>
```

---

## 📁 New Files

```
lib/
  adzuna-usage-tracker.ts         # Database-backed API quota tracker

db/migrations/
  0002_add_adzuna_usage_table.sql # Creates adzuna_usage table
  0003_add_country_to_postings.sql # Adds country column

scripts/
  migrate-company-ids.ts          # Recomputes company_ids with location
```

---

## 🔄 Migration Checklist

- [ ] 1. **Backup database** (CRITICAL)
- [ ] 2. Apply SQL migrations (`0002_*.sql`, `0003_*.sql`)
- [ ] 3. Verify schema changes (`adzuna_usage` table exists, `postings.country` exists)
- [ ] 4. Run company ID migration dry-run: `npm run migrate:company-ids:dry-run`
- [ ] 5. Review dry-run output (check for collisions)
- [ ] 6. Apply company ID migration: `npm run migrate:company-ids`
- [ ] 7. Verify no orphaned postings: `npm run verify:companies`
- [ ] 8. Test import: `npm run preview:adzuna`
- [ ] 9. Run live import: `npm run import:adzuna`
- [ ] 10. Verify usage tracking in DB: `SELECT * FROM adzuna_usage;`

---

## 🧪 Testing

### Verify Quota Tracking

```sql
-- Check current usage
SELECT * FROM adzuna_usage ORDER BY period, period_key;

-- Should show:
-- period  | period_key | request_count
-- daily   | 2026-02-15 | 25
-- weekly  | 2026-W07   | 25
-- monthly | 2026-02    | 25
```

### Verify Country Field

```sql
-- All Adzuna jobs should have country='US'
SELECT COUNT(*), country 
FROM postings 
WHERE source = 'adzuna' 
GROUP BY country;
```

### Verify Company IDs

```sql
-- Check for duplicate company names with different IDs (expected)
SELECT name, COUNT(DISTINCT company_id) as id_count
FROM companies
GROUP BY name
HAVING COUNT(DISTINCT company_id) > 1
ORDER BY id_count DESC
LIMIT 10;

-- No orphaned postings (should return 0)
SELECT COUNT(*)
FROM postings p
LEFT JOIN companies c ON p.company_id = c.company_id
WHERE c.company_id IS NULL;
```

---

## ⚙️ Environment Variables

No new environment variables required. Existing config still applies:

```env
DATABASE_URL=postgresql://...
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
ADZUNA_MAX_RESULTS=200
ADZUNA_DAILY_LIMIT=240
ADZUNA_RATE_LIMIT_MS=2500
```

---

## 🚨 Breaking Changes

### 1. Company IDs Changed

**Impact**: All existing `company_id` values will be recomputed.

**Action Required**: Run `npm run migrate:company-ids`

### 2. Function Signatures Changed

**Impact**: Any code calling `generateCompanyId()`, `transformAdzunaJob()`, or `jobExists()` needs updates.

**Action Required**: Update function calls to match new signatures.

### 3. Schema Changes

**Impact**: Database schema now includes `adzuna_usage` table and `postings.country` column.

**Action Required**: Run SQL migrations before deploying.

---

## 🔍 Troubleshooting

### Migration fails with "duplicate key violation"

**Cause**: New company IDs collide with existing ones.

**Fix**: Check the dry-run output for collisions. May need to manually resolve conflicts.

### "adzuna_usage table not found"

**Cause**: Migration 0002 not applied.

**Fix**: Run `psql $DATABASE_URL -f db/migrations/0002_add_adzuna_usage_table.sql`

### "column 'country' does not exist"

**Cause**: Migration 0003 not applied.

**Fix**: Run `psql $DATABASE_URL -f db/migrations/0003_add_country_to_postings.sql`

### Quota tracking shows zero after import

**Cause**: Database connection issue or transaction not committed.

**Fix**: Check database logs. Verify `SELECT * FROM adzuna_usage;` returns data.

---

## 📚 Further Reading

- [Adzuna API Documentation](https://developer.adzuna.com/)
- [PostgreSQL UPSERT](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT)
- [Drizzle ORM Docs](https://orm.drizzle.team/)

---

## 🎉 Benefits

✅ **CI/CD safe** - No file-based race conditions  
✅ **Global scale** - Multi-country support  
✅ **Zero collisions** - Location-aware company IDs  
✅ **Resilient** - Avoids API contention  
✅ **Auditable** - All quota usage in database  
✅ **Idempotent** - Migrations can re-run safely  
✅ **Type-safe** - Full TypeScript support  

---

**Last updated**: February 15, 2026  
**Version**: 2.0.0
