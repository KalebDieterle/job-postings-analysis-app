# 🚨 Company Duplicates - Quick Fix Guide

## Problem
Duplicate company records in database causing data integrity issues.

## Solution Steps (Execute in Order)

### 1️⃣ Preview Duplicates
```bash
npm run cleanup:companies:dry-run
```
**What it does**: Shows what duplicates exist, creates `.company-cleanup-report.json`  
**Safe**: No database changes

### 2️⃣ Clean Up Duplicates
```bash
npm run cleanup:companies
```
**What it does**: Deletes duplicate company records, keeps one per company_id  
**Warning**: Modifies database! Review dry-run first

### 3️⃣ Add Database Constraints
```bash
npm run db:add-company-constraints
```
**What it does**: Adds PRIMARY KEY on company_id to prevent future duplicates  
**Safe**: Idempotent, checks for duplicates first

### 4️⃣ Test Import
```bash
npm run import:adzuna
```
**What it does**: Validates constraints exist, imports jobs without creating duplicates  
**Check logs**: Look for "Found existing company" messages ✅

## Quick Verification

### Check for duplicates:
```bash
# In psql or database client:
SELECT company_id, COUNT(*) as count
FROM companies
GROUP BY company_id
HAVING COUNT(*) > 1;
```

**Expected**: 0 rows (no duplicates)

### Check constraints:
```bash
npm run db:add-company-constraints
```

**Expected output**:
```
✅ PRIMARY KEY constraint already exists
✅ All indexes verified
```

## What Was Fixed

1. ✅ Enhanced company name normalization (removes "Inc", "LLC", etc.)
2. ✅ Fixed `findOrCreateCompany()` to check by ID before insert
3. ✅ Added database PRIMARY KEY constraint
4. ✅ Added import validation (checks constraints before running)
5. ✅ Handle generic names like "Anonymous" uniquely per location

## Files Changed

- `lib/adzuna-import-helpers.ts` - Fixed company matching
- `scripts/cleanup-duplicate-companies.ts` - NEW: Cleanup script
- `scripts/add-company-constraints.ts` - NEW: Add constraints
- `scripts/import-from-adzuna.ts` - Added validation
- `package.json` - Added 3 new scripts

## Need Help?

See detailed documentation: `COMPANY-DUPLICATE-FIX.md`

## Emergency Rollback

If cleanup causes issues:

1. Check backup report: `.company-cleanup-report.json`
2. Restore from database backup
3. File GitHub issue with error logs
