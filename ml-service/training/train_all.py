"""Compatibility orchestrator for salary-only ML training."""

import argparse
import sys
from pathlib import Path

# Add training dir to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from train_salary import train as train_salary


def main():
    parser = argparse.ArgumentParser(description="Train salary prediction models")
    parser.add_argument(
        "--mlflow-uri",
        default=None,
        help="MLflow tracking server URI (default: http://localhost:5000)",
    )
    parser.add_argument(
        "--run-name",
        default=None,
        help="MLflow run name (default: auto-generated timestamp)",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Training salary models (legacy models retired)")
    print("=" * 60)

    print("\n[1/1] Salary prediction models...")
    run_id = train_salary(
        mlflow_tracking_uri=args.mlflow_uri,
        run_name=args.run_name,
    )

    print("\n" + "=" * 60)
    print("Salary training complete.")
    print("Legacy TF-IDF and clustering models are retired.")
    if run_id:
        tracking_uri = args.mlflow_uri or "http://localhost:5000"
        print(f"MLflow run: {tracking_uri}/#/runs/{run_id}")
    print("=" * 60)


if __name__ == "__main__":
    main()
