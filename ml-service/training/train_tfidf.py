"""Train TF-IDF skill extraction + K-Means clustering models."""

import os
from pathlib import Path

import joblib
import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.manifold import TSNE
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import normalize

from export_data import export_tfidf_data, export_skill_vectors

MODEL_DIR = Path(os.getenv("MODEL_DIR", "../models"))

ALL_SKILLS = [
    "ACCT", "AGIL", "AI", "ANALYT", "AUTO", "BI", "ACLD", "CLD", "COMM",
    "ACYBR", "DATA", "DB", "DESN", "DEVOP", "ERP", "FIN", "GIS", "HW",
    "IT", "ACMPL", "MGMT", "MKT", "ML", "MOB", "NET", "PM", "PROG",
    "QA", "ACSCR", "SEC", "ACSE", "SW", "SYS", "ACWEB", "WEB",
]


def train_tfidf():
    """Train TF-IDF vectorizer on job descriptions grouped by role."""
    print("=== TF-IDF Training ===")

    df = export_tfidf_data()
    if len(df) < 5:
        print(f"Only {len(df)} roles — too few. Aborting.")
        return None, None, None

    role_index = df["canonical_title"].tolist()
    corpus = df["combined_description"].tolist()

    # Token pattern that captures C++, C#, .NET, etc.
    token_pattern = r"(?u)\b[A-Za-z][A-Za-z0-9.+#]*[A-Za-z0-9+#]\b|\b[A-Za-z]\b"

    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        stop_words="english",
        min_df=2,
        max_df=0.85,
        token_pattern=token_pattern,
    )

    tfidf_matrix = vectorizer.fit_transform(corpus)
    print(f"TF-IDF matrix: {tfidf_matrix.shape}")

    # Save
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(vectorizer, MODEL_DIR / "tfidf_vectorizer.joblib")
    joblib.dump(tfidf_matrix, MODEL_DIR / "tfidf_matrix.joblib")
    joblib.dump(role_index, MODEL_DIR / "tfidf_role_index.joblib")
    print("Saved TF-IDF artifacts")

    # Show sample for verification
    feature_names = vectorizer.get_feature_names_out()
    for i, role in enumerate(role_index[:3]):
        row = tfidf_matrix[i].toarray().flatten()
        top_idx = np.argsort(row)[::-1][:10]
        top_terms = [(feature_names[j], round(row[j], 3)) for j in top_idx]
        print(f"\n{role}: {top_terms}")

    return vectorizer, tfidf_matrix, role_index


def train_clustering(tfidf_matrix, role_index, posting_counts):
    """Train K-Means clustering using skill vectors + TF-IDF features."""
    print("\n=== Clustering Training ===")

    # Get skill vectors
    skill_df = export_skill_vectors()

    # Build skill multi-hot per role
    skill_vectors = []
    for role in role_index:
        role_skills = skill_df[skill_df["canonical_title"] == role]
        vec = np.zeros(len(ALL_SKILLS))
        for _, row in role_skills.iterrows():
            if row["skill_abr"] in ALL_SKILLS:
                idx = ALL_SKILLS.index(row["skill_abr"])
                vec[idx] = row["freq"]
        # Normalize to proportions
        total = vec.sum()
        if total > 0:
            vec = vec / total
        skill_vectors.append(vec)

    skill_matrix = np.array(skill_vectors)
    print(f"Skill matrix: {skill_matrix.shape}")

    # Reduce TF-IDF to 50 dims via SVD
    n_components = min(50, tfidf_matrix.shape[0] - 1, tfidf_matrix.shape[1] - 1)
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    tfidf_reduced = svd.fit_transform(tfidf_matrix)
    print(f"TF-IDF reduced: {tfidf_reduced.shape} (explained variance: {svd.explained_variance_ratio_.sum():.2%})")

    # Normalize both
    skill_norm = normalize(skill_matrix)
    tfidf_norm = normalize(tfidf_reduced)

    # Concatenate with weighting
    feature_matrix = np.hstack([
        skill_norm * 0.4,
        tfidf_norm * 0.6,
    ])
    print(f"Combined feature matrix: {feature_matrix.shape}")

    # K-Means with silhouette sweep
    if len(role_index) < 4:
        print("Too few roles for clustering. Aborting.")
        return

    max_k = min(15, len(role_index) - 1)
    min_k = min(3, max_k)

    best_k = min_k
    best_score = -1

    for k in range(min_k, max_k + 1):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(feature_matrix)
        score = silhouette_score(feature_matrix, labels)
        print(f"  k={k}: silhouette={score:.4f}")
        if score > best_score:
            best_score = score
            best_k = k

    print(f"\nBest k={best_k} (silhouette={best_score:.4f})")

    # Final K-Means
    km_final = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    labels = km_final.fit_predict(feature_matrix)

    # t-SNE for visualization
    perplexity = min(30, len(role_index) - 1)
    tsne = TSNE(n_components=2, random_state=42, perplexity=max(5, perplexity))
    tsne_coords = tsne.fit_transform(feature_matrix)

    # Build role index with posting counts
    cluster_role_index = [
        {"role": role, "posting_count": int(pc)}
        for role, pc in zip(role_index, posting_counts)
    ]

    # Save
    joblib.dump(labels, MODEL_DIR / "cluster_labels.joblib")
    joblib.dump(tsne_coords, MODEL_DIR / "cluster_tsne.joblib")
    joblib.dump(cluster_role_index, MODEL_DIR / "cluster_role_index.joblib")
    joblib.dump(feature_matrix, MODEL_DIR / "cluster_feature_matrix.joblib")
    print("Saved clustering artifacts")

    # Show clusters
    for c in range(best_k):
        members = [role_index[i] for i in range(len(role_index)) if labels[i] == c]
        print(f"\nCluster {c}: {members[:5]}{'...' if len(members) > 5 else ''}")


if __name__ == "__main__":
    vectorizer, tfidf_matrix, role_index = train_tfidf()
    if tfidf_matrix is not None:
        # Need posting counts for clustering
        from export_data import export_tfidf_data
        df = export_tfidf_data()
        posting_counts = df["posting_count"].tolist()
        train_clustering(tfidf_matrix, role_index, posting_counts)
