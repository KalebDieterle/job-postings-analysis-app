import argparse
import asyncio
import json
import sys

import app.main as app_main
from app.routers.health import health

REQUIRED_SALARY_ARTIFACTS = frozenset({"salary_median", "salary_p10", "salary_p90"})
LEGACY_PREFIXES = ("tfidf_", "cluster_")


def validate_payload(payload: dict) -> dict:
    if payload.get("status") != "ok":
        raise SystemExit(f"unexpected status: {payload!r}")

    models_loaded = payload.get("models_loaded")
    if not isinstance(models_loaded, bool):
        raise SystemExit(
            f"unexpected models_loaded type={type(models_loaded).__name__} value={models_loaded!r}"
        )
    if models_loaded is not True:
        raise SystemExit("models_loaded=false")

    loaded_artifacts = payload.get("loaded_artifacts")
    if not isinstance(loaded_artifacts, list):
        raise SystemExit(f"missing loaded_artifacts list: {loaded_artifacts!r}")

    missing = sorted(REQUIRED_SALARY_ARTIFACTS - set(loaded_artifacts))
    if missing:
        raise SystemExit(f"missing required artifacts: {missing}")

    legacy = sorted(
        name for name in loaded_artifacts if name.startswith(LEGACY_PREFIXES)
    )
    if legacy:
        raise SystemExit(f"legacy artifacts still loaded: {legacy}")

    return payload


def build_local_payload() -> dict:
    app_main.resolved_model_dir = str(app_main._resolve_model_dir(app_main.settings.model_dir))
    app_main.model_registry.clear()
    app_main.model_registry.update(app_main._load_models(app_main.settings.model_dir))
    return asyncio.run(health())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--stdin-json",
        action="store_true",
        help="Read a health response payload from stdin instead of loading local models.",
    )
    args = parser.parse_args()

    if args.stdin_json:
        raw = sys.stdin.read().strip()
        if not raw:
            raise SystemExit("empty response")
        payload = json.loads(raw)
    else:
        payload = build_local_payload()

    validate_payload(payload)
    print(json.dumps(payload, sort_keys=True))


if __name__ == "__main__":
    main()
