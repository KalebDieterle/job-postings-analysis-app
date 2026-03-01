# ML Cost Control Runbook

This runbook is for the deployed ML stack:
- Next.js proxy on Vercel (`/api/ml/*`)
- FastAPI ML service on Fly (`/api/v1/*`)

## Required Environment Variables

### Vercel (web app)
- `ML_SERVICE_URL=https://<fly-app>.fly.dev`
- `ML_SERVICE_KEY=<shared-secret>`
- `ML_PROXY_ENABLED=true`
- `ML_RATE_LIMIT_ENABLED=true`

### Fly (ML service)
- `ML_SERVICE_KEY=<same-shared-secret>`
- `ML_SERVICE_AUTH_REQUIRED=true`
- `ML_RATE_LIMIT_ENABLED=true`
- `ML_MAX_CONCURRENT_INFER=2`
- `ML_DISABLE_HEAVY_INFERENCE=false`
- `ML_LIMIT_PREDICT_PER_HOUR=40`
- `ML_LIMIT_SKILL_GAP_PER_HOUR=20`
- `ML_LIMIT_METADATA_PER_HOUR=180`
- `ML_LIMIT_LOOKUP_PER_HOUR=240`
- `ML_LIMIT_GLOBAL_PER_HOUR=400`

## Weekly Budget Check SOP

1. Open Fly dashboard and record month-to-date spend.
2. Review recent ML logs for:
- high 429 volume by a single IP hash
- high request volume on `salary/predict` and `skill-gap/analyze`
3. If spend trend is too high:
- reduce Vercel soft limits first (route classes)
- then reduce Fly hard limits by 20%
4. If users are blocked too aggressively:
- raise Vercel soft limits slightly
- keep Fly hard limits strict unless absolutely necessary

## Emergency Controls

### Disable only heavy inference quickly
Set on Fly:
- `ML_DISABLE_HEAVY_INFERENCE=true`

Effect:
- Blocks `POST /api/v1/salary/predict`
- Blocks `POST /api/v1/skill-gap/analyze`
- Keeps metadata and lookup endpoints available

### Disable ML proxy entirely
Set on Vercel:
- `ML_PROXY_ENABLED=false`

Effect:
- All `/api/ml/*` routes return 503 immediately.

## Verification Checklist

1. Health:
- `GET https://<fly-app>.fly.dev/api/v1/health` returns `status: ok`.
2. Auth hardening:
- Direct call to protected Fly endpoint without `x-ml-service-key` returns 401.
3. Proxy path:
- Vercel `/api/ml/salary/metadata` returns 200.
4. Rate limiting:
- Burst tests return 429 with:
  - `Retry-After`
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Fly Runtime Guardrails

`ml-service/fly.toml` should include:
- `auto_stop_machines = "stop"`
- `auto_start_machines = true`
- `min_machines_running = 0`
- concurrency block:
  - `type = "requests"`
  - `soft_limit = 5`
  - `hard_limit = 8`

Operational command:
```bash
flyctl scale count 1 -a <ml-app>
```
