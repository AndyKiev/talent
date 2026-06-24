# backend/api_v1/permission_manifest/permission_manifest_schema.py
from pydantic import BaseModel


class PermissionRef(BaseModel):
    """A single (operation, essence-set) requirement on an endpoint."""
    operation: str
    essences: list[str] = []


class EndpointEntry(BaseModel):
    """One guarded HTTP endpoint and what it requires."""
    method: str
    path: str
    name: str
    summary: str = ""
    permissions: list[PermissionRef] = []


class PermissionEntry(BaseModel):
    """
    A distinct permission — the real unit the BA grants to groups.
    Multiple endpoints can share one permission; `endpoints` lists them all.
    """
    key: str
    operation: str
    essences: list[str] = []
    endpoint_count: int
    endpoints: list[str] = []


class SeedDiff(BaseModel):
    """Operations / essences referenced in code but missing from the DB tables."""
    missing_operations: list[str] = []
    missing_essences: list[str] = []


class ManifestSummary(BaseModel):
    guarded_endpoints: int
    unguarded_endpoints: int
    distinct_permissions: int


class PermissionManifest(BaseModel):
    summary: ManifestSummary
    seed: SeedDiff
    permissions: list[PermissionEntry] = []
    endpoints: list[EndpointEntry] = []
