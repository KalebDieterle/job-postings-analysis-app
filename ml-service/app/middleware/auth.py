import json
import time
from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse, Response

from app.config import settings
from app.middleware.common import get_client_ip, hash_identifier


def _log_auth_event(
    path: str,
    method: str,
    ip_hash: str,
    status: int,
    blocked: bool,
    reason: str,
    latency_ms: float,
) -> None:
    print(
        json.dumps(
            {
                "component": "ml_service_auth",
                "path": path,
                "method": method,
                "ip_hash": ip_hash,
                "status": status,
                "blocked": blocked,
                "reason": reason,
                "latency_ms": round(latency_ms, 2),
                "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
        )
    )


async def ml_service_auth_middleware(
    request: Request,
    call_next: Callable[[Request], Response],
) -> Response:
    path = request.url.path
    if not path.startswith("/api/v1") or path == "/api/v1/health":
        return await call_next(request)

    started = time.perf_counter()
    client_ip = get_client_ip(request)
    ip_hash = hash_identifier(client_ip)

    if not settings.ml_service_auth_required:
        return await call_next(request)

    expected_key = settings.ml_service_key
    if not expected_key:
        response = JSONResponse(
            status_code=503,
            content={
                "error": "ml_unavailable",
                "message": "ML service is not configured",
            },
        )
        _log_auth_event(
            path,
            request.method,
            ip_hash,
            response.status_code,
            True,
            "missing_ml_service_key",
            (time.perf_counter() - started) * 1000,
        )
        return response

    provided_key = request.headers.get("x-ml-service-key", "").strip()
    if provided_key != expected_key:
        response = JSONResponse(
            status_code=401,
            content={
                "error": "unauthorized",
                "message": "Invalid service credentials",
            },
        )
        _log_auth_event(
            path,
            request.method,
            ip_hash,
            response.status_code,
            True,
            "invalid_ml_service_key",
            (time.perf_counter() - started) * 1000,
        )
        return response

    return await call_next(request)

