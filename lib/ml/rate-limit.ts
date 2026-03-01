export type MlEndpointClass = "predict" | "skill_gap" | "metadata" | "lookup";

interface TokenBucket {
  tokens: number;
  lastRefillAtMs: number;
}

interface RateLimitRule {
  capacity: number;
  windowMs: number;
}

interface RateLimitStore {
  buckets: Map<string, TokenBucket>;
}

const ROUTE_RULES: Record<MlEndpointClass, RateLimitRule> = {
  predict: { capacity: 6, windowMs: 60_000 },
  skill_gap: { capacity: 4, windowMs: 60_000 },
  metadata: { capacity: 20, windowMs: 60_000 },
  lookup: { capacity: 30, windowMs: 60_000 },
};

const GLOBAL_RULE: RateLimitRule = { capacity: 60, windowMs: 60_000 };

declare global {
  var __mlProxyRateLimitStore: RateLimitStore | undefined;
}

function getStore(): RateLimitStore {
  if (!globalThis.__mlProxyRateLimitStore) {
    globalThis.__mlProxyRateLimitStore = { buckets: new Map() };
  }
  return globalThis.__mlProxyRateLimitStore;
}

function applyTokenBucket(
  key: string,
  rule: RateLimitRule,
  nowMs: number,
): { allowed: boolean; remaining: number; retryAfterSeconds: number; resetAtSeconds: number } {
  const store = getStore();
  const refillPerMs = rule.capacity / rule.windowMs;
  const existing = store.buckets.get(key);

  const bucket: TokenBucket = existing
    ? { ...existing }
    : { tokens: rule.capacity, lastRefillAtMs: nowMs };

  const elapsedMs = Math.max(0, nowMs - bucket.lastRefillAtMs);
  bucket.tokens = Math.min(rule.capacity, bucket.tokens + elapsedMs * refillPerMs);
  bucket.lastRefillAtMs = nowMs;

  let allowed = false;
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    allowed = true;
  }

  store.buckets.set(key, bucket);

  const remaining = Math.max(0, Math.floor(bucket.tokens));
  const deficit = Math.max(0, 1 - bucket.tokens);
  const retryAfterMs = deficit > 0 ? deficit / refillPerMs : 0;
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  const resetAtSeconds = Math.floor((nowMs + retryAfterMs) / 1000);

  return {
    allowed,
    remaining,
    retryAfterSeconds,
    resetAtSeconds,
  };
}

function refundToken(key: string, rule: RateLimitRule): void {
  const store = getStore();
  const bucket = store.buckets.get(key);
  if (!bucket) return;
  bucket.tokens = Math.min(rule.capacity, bucket.tokens + 1);
  store.buckets.set(key, bucket);
}

export interface MlRateLimitCheckResult {
  allowed: boolean;
  scope: "route" | "global";
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAtSeconds: number;
}

export function checkMlRateLimit(
  clientIp: string,
  endpointClass: MlEndpointClass,
): MlRateLimitCheckResult {
  const nowMs = Date.now();

  const routeRule = ROUTE_RULES[endpointClass];
  const routeResult = applyTokenBucket(
    `route:${endpointClass}:${clientIp}`,
    routeRule,
    nowMs,
  );

  if (!routeResult.allowed) {
    return {
      allowed: false,
      scope: "route",
      limit: routeRule.capacity,
      remaining: 0,
      retryAfterSeconds: routeResult.retryAfterSeconds,
      resetAtSeconds: routeResult.resetAtSeconds,
    };
  }

  const globalResult = applyTokenBucket(`global:${clientIp}`, GLOBAL_RULE, nowMs);
  if (!globalResult.allowed) {
    refundToken(`route:${endpointClass}:${clientIp}`, routeRule);
    return {
      allowed: false,
      scope: "global",
      limit: GLOBAL_RULE.capacity,
      remaining: 0,
      retryAfterSeconds: globalResult.retryAfterSeconds,
      resetAtSeconds: globalResult.resetAtSeconds,
    };
  }

  return {
    allowed: true,
    scope: "route",
    limit: routeRule.capacity,
    remaining: routeResult.remaining,
    retryAfterSeconds: 0,
    resetAtSeconds: routeResult.resetAtSeconds,
  };
}
