"""Orchestrator: train all ML models."""

import sys
from pathlib import Path

# Add training dir to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from train_salary import train as train_salary
from train_tfidf import train_tfidf, train_clustering
from export_data import export_tfidf_data


def main():
    print("=" * 60)
    print("Training all ML models")
    print("=" * 60)

    # Phase 1: Salary prediction
    print("\n[1/3] Salary prediction models...")
    train_salary()

    # Phase 2: TF-IDF skill extraction
    print("\n[2/3] TF-IDF skill extraction...")
    vectorizer, tfidf_matrix, role_index = train_tfidf()

    # Phase 3: Clustering
    if tfidf_matrix is not None:
        print("\n[3/3] Job clustering...")
        df = export_tfidf_data()
        posting_counts = df["posting_count"].tolist()
        train_clustering(tfidf_matrix, role_index, posting_counts)
    else:
        print("\n[3/3] Skipping clustering (no TF-IDF data)")

    print("\n" + "=" * 60)
    print("All training complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
