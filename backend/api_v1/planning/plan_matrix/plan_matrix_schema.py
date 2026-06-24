# backend/api_v1/planning/plan_matrix/plan_matrix_schema.py
from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List, Dict, Literal


# A job group renders either as a single "total" column (only a combined,
# talent_status=NULL plan row exists) or split into Pa/Po columns (per-status
# plan rows exist). Derived from the data, not configured.
TargetMode = Literal["total", "by_status"]


class MatrixJobDef(BaseModel):
    id: str
    key: str
    name: str


class MatrixJobGroupConfig(BaseModel):
    # Our real data has no sub-jobs and fact mirrors target shape, but we keep
    # the same envelope the frontend grid already understands.
    target_mode: TargetMode
    fact_mode: TargetMode
    jobs: List[MatrixJobDef] = []


class MatrixJobGroupDef(BaseModel):
    id: str
    key: str
    name: str
    config: MatrixJobGroupConfig


class MatrixTalentStatus(BaseModel):
    id: str
    key: str
    name: str


class MatrixDepartment(BaseModel):
    id: str
    key: str
    name: str
    region_id: Optional[str] = None
    region_key: Optional[str] = None
    region_name: Optional[str] = None


class MatrixRegion(BaseModel):
    id: str
    key: str
    name: str
    sort_order: int


class MatrixEssences(BaseModel):
    talent_statuses: List[MatrixTalentStatus] = []
    job_groups: List[MatrixJobGroupDef] = []
    departments: List[MatrixDepartment] = []
    regions: List[MatrixRegion] = []


class MatrixStatusValue(BaseModel):
    pa: Optional[int] = None
    po: Optional[int] = None


class MatrixJobGroupCell(BaseModel):
    # target / fact are either a scalar int (total mode) or {pa, po} (by_status).
    # Pydantic serialises whichever is set; the frontend already branches on
    # config.target_mode / fact_mode.
    target: Optional[object] = None
    fact: Optional[object] = None
    pct: Optional[float] = None


class MatrixSummary(BaseModel):
    base_target: Optional[int] = None
    object_target: Optional[int] = None
    fact: Optional[int] = None
    pct: Optional[float] = None


class MatrixRow(BaseModel):
    department_id: Optional[str] = None
    department_key: Optional[str] = None
    org_unit_key: Optional[str] = None
    region_id: Optional[str] = None
    region_key: Optional[str] = None
    region_name: Optional[str] = None
    label: Optional[str] = None  # only on grand_totals
    job_groups: Dict[str, MatrixJobGroupCell] = {}
    summary: MatrixSummary


class MatrixMeta(BaseModel):
    version: str = "1.0"
    plan_session_id: int
    description: str


class PlanMatrix(BaseModel):
    matrix_meta: MatrixMeta
    essences: MatrixEssences
    grand_totals: MatrixRow
    data: List[MatrixRow]
