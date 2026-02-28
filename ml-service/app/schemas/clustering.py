from pydantic import BaseModel, Field


class ClusterPoint(BaseModel):
    role: str
    cluster_id: int
    x: float
    y: float
    posting_count: int


class ClustersResponse(BaseModel):
    clusters: list[ClusterPoint]
    cluster_count: int


class AdjacentRole(BaseModel):
    role: str
    similarity: float
    cluster_id: int


class AdjacentRolesResponse(BaseModel):
    query_role: str
    cluster_id: int
    adjacent_roles: list[AdjacentRole]
