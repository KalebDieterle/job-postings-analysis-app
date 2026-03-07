"""Promote an MLflow run's artifacts to ml-service/models/.

Usage:
    python promote_model.py --run-id <id>
    python promote_model.py --best --metric median_mae
    python promote_model.py --run-id <id> --register
"""

import argparse
import shutil
import sys
import tempfile
from pathlib import Path

import mlflow
from mlflow.tracking import MlflowClient

MODELS_DIR = Path(__file__).parent.parent / "models"

EXPECTED_ARTIFACTS = [
    "salary_median.lgb",
    "salary_p10.lgb",
    "salary_p90.lgb",
    "salary_encoders.joblib",
    "salary_feature_columns.joblib",
    "salary_skill_vocab.joblib",
    "salary_company_scale_meta.joblib",
    "salary_titles.joblib",
    "salary_premiums.joblib",
]


def _get_best_run_id(client: MlflowClient, experiment_name: str, metric: str) -> str:
    experiment = client.get_experiment_by_name(experiment_name)
    if experiment is None:
        sys.exit(f"Experiment '{experiment_name}' not found.")

    runs = client.search_runs(
        experiment_ids=[experiment.experiment_id],
        filter_string="attributes.status = 'FINISHED'",
        order_by=[f"metrics.{metric} ASC"],
        max_results=1,
    )
    if not runs:
        sys.exit(f"No finished runs found in experiment '{experiment_name}'.")

    best = runs[0]
    print(f"Best run by {metric}: {best.info.run_id}  ({metric}={best.data.metrics.get(metric, 'N/A')})")
    return best.info.run_id


def _list_run_artifacts(client: MlflowClient, run_id: str) -> list[str]:
    artifacts = client.list_artifacts(run_id)
    return [a.path for a in artifacts]


def _download_and_copy(client: MlflowClient, run_id: str, dest: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        print(f"Downloading artifacts from run {run_id}...")
        local_dir = client.download_artifacts(run_id, "", tmp_path)
        local_path = Path(local_dir)

        # Validate all expected artifacts are present.
        missing = [name for name in EXPECTED_ARTIFACTS if not (local_path / name).exists()]
        if missing:
            sys.exit(
                f"Run {run_id} is missing expected artifacts: {missing}\n"
                "Aborting — models directory was NOT modified."
            )

        dest.mkdir(parents=True, exist_ok=True)
        for name in EXPECTED_ARTIFACTS:
            src = local_path / name
            shutil.copy2(src, dest / name)
            print(f"  Copied {name}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Promote MLflow artifacts to models/")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--run-id", help="Specific MLflow run ID to promote")
    group.add_argument("--best", action="store_true", help="Auto-select best run by metric")
    parser.add_argument(
        "--metric",
        default="median_mae",
        help="Metric to rank runs by when using --best (default: median_mae, lower is better)",
    )
    parser.add_argument(
        "--mlflow-uri",
        default="http://localhost:5000",
        help="MLflow tracking server URI (default: http://localhost:5000)",
    )
    parser.add_argument(
        "--register",
        action="store_true",
        help="Also register the model in MLflow Model Registry and transition to Production",
    )
    args = parser.parse_args()

    mlflow.set_tracking_uri(args.mlflow_uri)
    client = MlflowClient(args.mlflow_uri)

    run_id: str
    if args.best:
        run_id = _get_best_run_id(client, "salary-prediction", args.metric)
    else:
        run_id = args.run_id

    _download_and_copy(client, run_id, MODELS_DIR)

    if args.register:
        print("Registering model in MLflow Model Registry...")
        model_uri = f"runs:/{run_id}/salary_median.lgb"
        mv = mlflow.register_model(model_uri, "salary-prediction")
        client.transition_model_version_stage(
            name="salary-prediction",
            version=mv.version,
            stage="Production",
            archive_existing_versions=True,
        )
        print(f"Registered version {mv.version} → Production")

    print(f"\nModels promoted to {MODELS_DIR}")
    print("Restart ml-service to load new models.")
    print("  docker compose restart ml-service")


if __name__ == "__main__":
    main()
