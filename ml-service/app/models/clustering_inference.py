import re

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.schemas.clustering import (
    ClustersResponse,
    ClusterPoint,
    AdjacentRolesResponse,
    AdjacentRole,
)


def _slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"[\s-]+", "-", s)
    return s.strip("-")


def get_clusters(
    labels: np.ndarray,
    tsne_coords: np.ndarray,
    role_index: list[dict],  # [{role, posting_count}, ...]
) -> ClustersResponse:
    points = []
    for i, entry in enumerate(role_index):
        points.append(
            ClusterPoint(
                role=entry["role"],
                cluster_id=int(labels[i]),
                x=round(float(tsne_coords[i, 0]), 4),
                y=round(float(tsne_coords[i, 1]), 4),
                posting_count=entry.get("posting_count", 0),
            )
        )
    return ClustersResponse(
        clusters=points,
        cluster_count=int(len(set(labels))),
    )


def get_adjacent_roles(
    slug: str,
    labels: np.ndarray,
    role_index: list[dict],
    feature_matrix: np.ndarray,
) -> AdjacentRolesResponse | None:
    # Find the role by slug
    target_idx = None
    for i, entry in enumerate(role_index):
        if _slugify(entry["role"]) == slug:
            target_idx = i
            break

    if target_idx is None:
        return None

    target_cluster = int(labels[target_idx])
    target_role = role_index[target_idx]["role"]

    # Compute cosine similarity against all roles
    sims = cosine_similarity(
        feature_matrix[target_idx : target_idx + 1],
        feature_matrix,
    ).flatten()

    # Sort by similarity (exclude self)
    sorted_indices = np.argsort(sims)[::-1]
    adjacent = []
    for idx in sorted_indices:
        if idx == target_idx:
            continue
        adjacent.append(
            AdjacentRole(
                role=role_index[idx]["role"],
                similarity=round(float(sims[idx]), 4),
                cluster_id=int(labels[idx]),
            )
        )
        if len(adjacent) >= 10:
            break

    return AdjacentRolesResponse(
        query_role=target_role,
        cluster_id=target_cluster,
        adjacent_roles=adjacent,
    )
