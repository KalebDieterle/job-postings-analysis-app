from fastapi import APIRouter, HTTPException

from app.main import model_registry
from app.models.clustering_inference import get_clusters, get_adjacent_roles
from app.schemas.clustering import ClustersResponse, AdjacentRolesResponse

router = APIRouter(tags=["clustering"])


@router.get("/clusters", response_model=ClustersResponse)
async def clusters():
    required_keys = ("cluster_labels", "cluster_tsne", "cluster_role_index")
    if not all(k in model_registry for k in required_keys):
        raise HTTPException(status_code=503, detail="Cluster models not loaded")

    return get_clusters(
        model_registry["cluster_labels"],
        model_registry["cluster_tsne"],
        model_registry["cluster_role_index"],
    )


@router.get("/clusters/adjacent/{slug}", response_model=AdjacentRolesResponse)
async def adjacent_roles(slug: str):
    required_keys = ("cluster_labels", "cluster_role_index", "cluster_feature_matrix")
    if not all(k in model_registry for k in required_keys):
        raise HTTPException(status_code=503, detail="Cluster models not loaded")

    result = get_adjacent_roles(
        slug,
        model_registry["cluster_labels"],
        model_registry["cluster_role_index"],
        model_registry["cluster_feature_matrix"],
    )
    if result is None:
        raise HTTPException(status_code=404, detail=f"Role '{slug}' not found")
    return result
