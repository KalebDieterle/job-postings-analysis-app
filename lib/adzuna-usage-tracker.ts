// lib/adzuna-usage-tracker.ts
/**
 * Database-backed API usage tracker for Adzuna API quotas
 * 
 * Replaces file-based .adzuna-usage.json with PostgreSQL persistence
 * Provides transactional safety for CI/CD environments where multiple
 * runs could race on file access.
 * 
 * Quotas:
 * - 25 requests per minute (handled by rate limiter)
 * - 250 requests per day
 * - 1,000 requests per week  
 * - 2,500 requests per month
 */

import { db } from '@/db';
import { adzunaUsage } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export type PeriodType = 'daily' | 'weekly' | 'monthly';

interface UsageRecord {
  period: PeriodType;
  periodKey: string;
  requestCount: number;
}

/**
 * Get the period key for a given date and period type
 * 
 * - daily: '2026-02-15'
 * - weekly: '2026-W07' (ISO week number)
 * - monthly: '2026-02'
 */
function getPeriodKey(date: Date, period: PeriodType): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (period) {
    case 'daily':
      return `${year}-${month}-${day}`;
    
    case 'weekly': {
      // ISO week number calculation
      const temp = new Date(date.getTime());
      temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
      const week = Math.ceil(((temp.getTime() - new Date(temp.getFullYear(), 0, 4).getTime()) / 86400000 + 1) / 7);
      return `${temp.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }
    
    case 'monthly':
      return `${year}-${month}`;
    
    default:
      throw new Error(`Unknown period type: ${period}`);
  }
}

/**
 * Get current usage for a specific period
 * Returns 0 if no record exists
 */
export async function getUsage(period: PeriodType, date: Date = new Date()): Promise<number> {
  const periodKey = getPeriodKey(date, period);

  const [record] = await db
    .select({ request_count: adzunaUsage.request_count })
    .from(adzunaUsage)
    .where(
      and(
        eq(adzunaUsage.period, period),
        eq(adzunaUsage.period_key, periodKey)
      )
    )
    .limit(1);

  return record?.request_count ?? 0;
}

/**
 * Get usage for all periods (daily, weekly, monthly)
 * Returns a map of period -> count
 */
export async function getAllUsage(date: Date = new Date()): Promise<Record<PeriodType, number>> {
  const periods: PeriodType[] = ['daily', 'weekly', 'monthly'];
  const results = await Promise.all(
    periods.map(async (period) => {
      const count = await getUsage(period, date);
      return [period, count] as const;
    })
  );

  return Object.fromEntries(results) as Record<PeriodType, number>;
}

/**
 * Increment usage count for a given period
 * Creates record if it doesn't exist
 * Thread-safe using PostgreSQL's ON CONFLICT
 */
export async function incrementUsage(
  period: PeriodType,
  incrementBy: number = 1,
  date: Date = new Date()
): Promise<number> {
  const periodKey = getPeriodKey(date, period);

  // Use UPSERT with PostgreSQL's ON CONFLICT to handle race conditions
  const [result] = await db
    .insert(adzunaUsage)
    .values({
      period,
      period_key: periodKey,
      request_count: incrementBy,
    })
    .onConflictDoUpdate({
      target: [adzunaUsage.period, adzunaUsage.period_key],
      set: {
        request_count: sql`${adzunaUsage.request_count} + ${incrementBy}`,
      },
    })
    .returning({ request_count: adzunaUsage.request_count });

  return result?.request_count ?? incrementBy;
}

/**
 * Increment all periods atomically
 * Returns new counts for each period
 */
export async function incrementAllPeriods(
  incrementBy: number = 1,
  date: Date = new Date()
): Promise<Record<PeriodType, number>> {
  const periods: PeriodType[] = ['daily', 'weekly', 'monthly'];
  
  const results = await Promise.all(
    periods.map(async (period) => {
      const newCount = await incrementUsage(period, incrementBy, date);
      return [period, newCount] as const;
    })
  );

  return Object.fromEntries(results) as Record<PeriodType, number>;
}

/**
 * Check if any quota limits have been reached
 * Returns true if ALL quotas are within limits
 */
export async function checkQuotaLimits(
  limits: { daily: number; weekly: number; monthly: number },
  date: Date = new Date()
): Promise<{ allowed: boolean; usage: Record<PeriodType, number>; exceeded?: PeriodType }> {
  const usage = await getAllUsage(date);

  if (usage.daily >= limits.daily) {
    return { allowed: false, usage, exceeded: 'daily' };
  }
  
  if (usage.weekly >= limits.weekly) {
    return { allowed: false, usage, exceeded: 'weekly' };
  }
  
  if (usage.monthly >= limits.monthly) {
    return { allowed: false, usage, exceeded: 'monthly' };
  }

  return { allowed: true, usage };
}

/**
 * In-memory cache for usage counts
 * Reduces database queries during a single import run
 * Cache is invalidated after incrementing
 */
class UsageCache {
  private cache: Map<string, { count: number; timestamp: number }> = new Map();
  private ttlMs = 60000; // 1 minute cache TTL

  getCacheKey(period: PeriodType, date: Date): string {
    return `${period}:${getPeriodKey(date, period)}`;
  }

  get(period: PeriodType, date: Date): number | null {
    const key = this.getCacheKey(period, date);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.count;
  }

  set(period: PeriodType, date: Date, count: number): void {
    const key = this.getCacheKey(period, date);
    this.cache.set(key, { count, timestamp: Date.now() });
  }

  invalidate(period: PeriodType, date: Date): void {
    const key = this.getCacheKey(period, date);
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const usageCache = new UsageCache();

/**
 * Get usage with caching
 * Reads from cache first, falls back to database
 */
export async function getUsageCached(period: PeriodType, date: Date = new Date()): Promise<number> {
  const cached = usageCache.get(period, date);
  if (cached !== null) return cached;

  const count = await getUsage(period, date);
  usageCache.set(period, date, count);
  return count;
}

/**
 * Increment usage and invalidate cache
 */
export async function incrementUsageCached(
  period: PeriodType,
  incrementBy: number = 1,
  date: Date = new Date()
): Promise<number> {
  const newCount = await incrementUsage(period, incrementBy, date);
  usageCache.invalidate(period, date);
  usageCache.set(period, date, newCount);
  return newCount;
}
