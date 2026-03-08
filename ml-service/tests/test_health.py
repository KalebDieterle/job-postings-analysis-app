import asyncio
import unittest
from pathlib import Path

from fastapi.routing import APIRoute

import app.main as app_main
from app.routers.health import health, router
from app.schemas.health import HealthResponse


class HealthRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_registry = dict(app_main.model_registry)
        self.original_model_dir = app_main.resolved_model_dir
        app_main.resolved_model_dir = "/tmp/models"

    def tearDown(self) -> None:
        app_main.model_registry.clear()
        app_main.model_registry.update(self.original_registry)
        app_main.resolved_model_dir = self.original_model_dir

    def test_health_returns_boolean_models_loaded(self) -> None:
        app_main.model_registry.clear()
        app_main.model_registry.update(
            {
                "salary_median": object(),
                "salary_p10": object(),
                "salary_p90": object(),
                "salary_encoders": object(),
            }
        )

        payload = asyncio.run(health())
        validated = HealthResponse.model_validate(payload)

        self.assertIs(validated.models_loaded, True)
        self.assertEqual(
            validated.loaded_artifacts,
            ["salary_encoders", "salary_median", "salary_p10", "salary_p90"],
        )

    def test_health_returns_false_when_required_salary_models_missing(self) -> None:
        app_main.model_registry.clear()
        app_main.model_registry.update(
            {
                "salary_median": object(),
                "salary_encoders": object(),
            }
        )

        payload = asyncio.run(health())
        validated = HealthResponse.model_validate(payload)

        self.assertIs(validated.models_loaded, False)
        self.assertEqual(
            validated.loaded_artifacts,
            ["salary_encoders", "salary_median"],
        )

    def test_health_route_declares_response_model(self) -> None:
        health_route = next(
            route
            for route in router.routes
            if isinstance(route, APIRoute) and route.path == "/health"
        )

        self.assertIs(health_route.response_model, HealthResponse)


class HealthSourceAuditTests(unittest.TestCase):
    def test_health_source_no_longer_uses_models_loaded_as_artifact_list(self) -> None:
        source = Path("app/routers/health.py").read_text()
        self.assertIn('"loaded_artifacts": sorted(loaded_keys)', source)
        self.assertNotIn('"models_loaded": list(app_main.model_registry.keys())', source)


if __name__ == "__main__":
    unittest.main()
