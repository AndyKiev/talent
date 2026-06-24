# backend/api_v1/operation_essence_set_link/operation_essence_set_link_schema.py
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class EssenceSetSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fingerprint: str
    essence_ids: List[int] = []
    essence_names: List[str] = []


class OperationEssenceSetLinkSchema(BaseModel):
    """Read schema for a set-grain permission row."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    operation_id: int
    operation_name: str
    essence_set_id: int
    fingerprint: str
    essence_names: List[str] = []
    # Names of user groups that hold this permission (for the admin grid)
    user_group_names: List[str] = []


class OperationEssenceSetLinkCreate(BaseModel):
    """
    Create a set-grain permission.

    `essence_ids` is the *set* of essences the operation applies to.
    A single-element list is the degenerate single-essence case.
    """
    operation_id: int
    essence_ids: List[int] = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Permission-matrix apply (BA grid round-trip)
#
# The BA grid downloads a JSON of, per group, the exact list of OESL ids the
# group should hold (full-replace semantics). This is the payload that JSON
# maps to. `apply_matrix` diffs it against the DB and (optionally) commits.
# ---------------------------------------------------------------------------

class PermissionMatrixGroupGrants(BaseModel):
    """One group's full desired set of permission ids."""
    user_group_id: int
    user_group_name: Optional[str] = None
    operation_essence_set_link_ids: List[int] = []


class PermissionMatrixApplyRequest(BaseModel):
    """The uploaded matrix file: full desired state for each listed group."""
    groups: List[PermissionMatrixGroupGrants] = []


class PermissionMatrixGroupDiff(BaseModel):
    """Per-group result of an apply (or dry-run preview)."""
    user_group_id: int
    user_group_name: Optional[str] = None
    added: List[int] = []            # ids that would be / were granted
    removed: List[int] = []          # ids that would be / were revoked
    unchanged: int = 0               # count of ids already correct
    unknown_ids: List[int] = []      # payload ids not present in DB (skipped)
    applied: bool = False            # True when actually committed


class PermissionMatrixApplyResult(BaseModel):
    dry_run: bool
    groups: List[PermissionMatrixGroupDiff] = []
    total_added: int = 0
    total_removed: int = 0
    total_unknown: int = 0


# ---------------------------------------------------------------------------
# Sync from code: materialise every guard-required permission into the
# permissions_set table so the matrix has a full set of rows to grant.
# "The guard is the catalog" — this reconciles the catalog into the DB.
# ---------------------------------------------------------------------------

class PermissionSyncSkip(BaseModel):
    """A guard permission that could not be materialised (missing seed data)."""
    operation: str
    essences: List[str] = []
    reason: str


class PermissionSyncResult(BaseModel):
    total_required: int = 0   # distinct (operation, essence-set) found in guards
    created: int = 0          # new permissions_set rows written
    existing: int = 0         # already present
    skipped: List[PermissionSyncSkip] = []  # operation/essence not seeded yet
