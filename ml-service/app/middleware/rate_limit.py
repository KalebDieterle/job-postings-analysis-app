import asyncio
import json
import math
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse, Response

from app.config import settings
from app.middleware.common import get_client_ip, hash_identifier

WINDOW_SECONDS = 60 * 60
HEAVY_ENDPOINTS = {"predict", "skill_gap"}


@dataclass
class RateLimitResult:
    allowed: bool
    scope: str
    limit: int
    remaining: int
    retry_after_seconds: int
    reset_at_seconds: int


class SlidingWindowRateLimiter:
    def __init__(self) -> None:
        self.buckets: dict[str, deque[float]] = defaultdict(deque)
        self.lock = asyncio.Lock()

    @staticmethod
    def _prune(bucket: deque[float], now: float) -> None:
        boundary = now - WINDOW_SECONDS
        while bucket and bucket[0] <= boundary:
            bucket.popleft()

    async def check_and_consume(
        self,
        client_ip: str,
        endpoint_class: str,
        endpoint_limit: int,
        global_limit: int,
    ) -> RateLimitResult:
        now = time.time()
        global_key = f"{client_ip}:global"
        endpoint_key = f"{client_ip}:{endpoint_class}"

        async with self.lock:
            global_bucket = self.buckets[global_key]
            endpoint_bucket = self.buckets[endpoint_key]

            self._prune(global_bucket, now)
            self._prune(endpoint_bucket, now)

            if len(global_bucket) >= global_limit:
                oldest = global_bucket[0]
                retry_after = max(1, math.ceil((oldest + WINDOW_SECONDS) - now))
                return RateLimitResult(
                    allowed=False,
                    scope="global",
                    limit=global_limit,
                    remaining=0,
                    retry_after_seconds=retry_after,
                    reset_at_seconds=int(now + retry_after),
                )

            if len(endpoint_bucket) >= endpoint_limit:
                oldest = endpoint_bucket[0]
                retry_after = max(1, math.ceil((oldest + WINDOW_SECONDS) - now))
                return RateLimitResult(
                    allowed=False,
                    scope="route",
                    limit=endpoint_limit,
                    remaining=0,
                    retry_after_seconds=retry_after,
                    reset_at_seconds=int(now + retry_after),
                )

            global_bucket.append(now)
            endpoint_bucket.append(now)

            remaining = max(0, endpoint_limit - len(endpoint_bucket))
            reset_at = (
                int(endpoint_bucket[0] + WINDOW_SECONDS)
                if endpoint_bucket
                else int(now + WINDOW_SECONDS)
            )

            return RateLimitResult(
                allowed=True,
                scope="route",
                limit=endpoint_limit,
                remaining=remaining,
                retry_after_seconds=0,
                reset_at_seconds=reset_at,
            )


limiter = SlidingWindowRateLimiter()
infer_semaphore = asyncio.Semaphore(max(1, settings.ml_max_concurrent_infer))


def classify_endpoint(method: str, path: str) -> str:
    if method == "POST" and path == "/api/v1/salary/predict":
        return "predict"
    if method == "POST" and path == "/api/v1/skill-gap/analyze":
        return "skill_gap"
    if method == "GET" and path == "/api/v1/salary/metadata":
        return "metadata"
    return "lookup"


def endpoint_limit_for(endpoint_class: str) -> int:
    if endpoint_class == "predict":
        return settings.ml_limit_predict_per_hour
    if endpoint_class == "skill_gap":
        return settings.ml_limit_skill_gap_per_hour
    if endpoint_class == "metadata":
        return settings.ml_limit_metadata_per_hour
    return settings.ml_limit_lookup_per_hour


def rate_limited_response(
    retry_after_seconds: int,
    limit: int,
    remaining: int,
    reset_at_seconds: int,
) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limited",
            "message": "Too many requests",
            "retry_after_seconds": retry_after_seconds,
        },
        headers={
            "Retry-After": str(retry_after_seconds),
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(reset_at_seconds),
        },
    )


def _log_rate_event(
    path: str,
    method: str,
    endpoint_class: str,
    ip_hash: str,
    status: int,
    blocked: bool,
    reason: str,
    latency_ms: float,
) -> None:
    print(
        json.dumps(
            {
                "component": "ml_service_rate_limit",
                "path": path,
                "method": method,
                "endpoint_class": endpoint_class,
                "ip_hash": ip_hash,
                "status": status,
                "blocked": blocked,
                "reason": reason,
                "latency_ms": round(latency_ms, 2),
                "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
        )
    )


async def ml_rate_limit_middleware(
    request: Request,
    call_next: Callable[[Request], Response],
) -> Response:
    path = request.url.path
    if not path.startswith("/api/v1") or path == "/api/v1/health":
        return await call_next(request)

    started = time.perf_counter()
    endpoint_class = classify_endpoint(request.method.upper(), path)
    client_ip = get_client_ip(request)
    ip_hash = hash_identifier(client_ip)

    if settings.ml_disable_heavy_inference and endpoint_class in HEAVY_ENDPOINTS:
        response = JSONResponse(
            status_code=503,
            content={
                "error": "temporarily_disabled",
                "message": "Heavy ML inference is temporarily disabled",
            },
        )
        _log_rate_event(
            path,
            request.method,
            endpoint_class,
            ip_hash,
            response.status_code,
            True,
            "heavy_inference_disabled",
            (time.perf_counter() - started) * 1000,
        )
        return response

    if settings.ml_rate_limit_enabled:
        rate_result = await limiter.check_and_consume(
            client_ip,
            endpoint_class,
            endpoint_limit_for(endpoint_class),
            settings.ml_limit_global_per_hour,
        )
        if not rate_result.allowed:
            response = rate_limited_response(
                rate_result.retry_after_seconds,
                rate_result.limit,
                rate_result.remaining,
                rate_result.reset_at_seconds,
            )
            _log_rate_event(
                path,
                request.method,
                endpoint_class,
                ip_hash,
                response.status_code,
                True,
                f"rate_limited_{rate_result.scope}",
                (time.perf_counter() - started) * 1000,
            )
            return response
    else:
        rate_result = RateLimitResult(
            allowed=True,
            scope="route",
            limit=endpoint_limit_for(endpoint_class),
            remaining=endpoint_limit_for(endpoint_class),
            retry_after_seconds=0,
            reset_at_seconds=int(time.time()) + WINDOW_SECONDS,
        )

    if endpoint_class in HEAVY_ENDPOINTS:
        if infer_semaphore.locked():
            response = rate_limited_response(
                retry_after_seconds=5,
                limit=max(1, settings.ml_max_concurrent_infer),
                remaining=0,
                reset_at_seconds=int(time.time()) + 5,
            )
            _log_rate_event(
                path,
                request.method,
                endpoint_class,
                ip_hash,
                response.status_code,
                True,
                "concurrency_saturated",
                (time.perf_counter() - started) * 1000,
            )
            return response

        await infer_semaphore.acquire()
        try:
            response = await call_next(request)
        finally:
            infer_semaphore.release()
    else:
        response = await call_next(request)

    response.headers["X-RateLimit-Limit"] = str(rate_result.limit)
    response.headers["X-RateLimit-Remaining"] = str(rate_result.remaining)
    response.headers["X-RateLimit-Reset"] = str(rate_result.reset_at_seconds)

    _log_rate_event(
        path,
        request.method,
        endpoint_class,
        ip_hash,
        response.status_code,
        response.status_code == 429,
        "ok",
        (time.perf_counter() - started) * 1000,
    )
    return response

