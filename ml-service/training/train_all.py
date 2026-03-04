"""Compatibility orchestrator for salary-only ML training."""

import sys
from pathlib import Path

# Add training dir to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from train_salary import train as train_salary


def main():
    print("=" * 60)
    print("Training salary models (legacy models retired)")
    print("=" * 60)

    print("\n[1/1] Salary prediction models...")
    train_salary()

    print("\n" + "=" * 60)
    print("Salary training complete.")
    print("Legacy TF-IDF and clustering models are retired.")
    print("=" * 60)


if __name__ == "__main__":
    main()
