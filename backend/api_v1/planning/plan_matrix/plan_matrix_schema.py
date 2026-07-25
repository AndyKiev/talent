# backend/api_v1/planning/plan_matrix/plan_matrix_schema.py
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

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
    jobs: list[MatrixJobDef] = []


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
    region_id: str | None = None
    region_key: str | None = None
    region_name: str | None = None


class MatrixRegion(BaseModel):
    id: str
    key: str
    name: str
    sort_order: int


class MatrixEssences(BaseModel):
    talent_statuses: list[MatrixTalentStatus] = []
    job_groups: list[MatrixJobGroupDef] = []
    departments: list[MatrixDepartment] = []
    regions: list[MatrixRegion] = []


class MatrixStatusValue(BaseModel):
    pa: int | None = None
    po: int | None = None


class MatrixJobGroupCell(BaseModel):
    # target / fact are either a scalar int (total mode) or {pa, po} (by_status).
    # Pydantic serialises whichever is set; the frontend already branches on
    # config.target_mode / fact_mode.
    target: object | None = None
    fact: object | None = None
    pct: float | None = None


class MatrixSummary(BaseModel):
    base_target: int | None = None
    object_target: int | None = None
    fact: int | None = None
    pct: float | None = None


class MatrixRow(BaseModel):
    department_id: str | None = None
    department_key: str | None = None
    org_unit_key: str | None = None
    region_id: str | None = None
    region_key: str | None = None
    region_name: str | None = None
    label: str | None = None  # only on grand_totals
    job_groups: dict[str, MatrixJobGroupCell] = {}
    summary: MatrixSummary


class MatrixMeta(BaseModel):
    version: str = "1.0"
    plan_session_id: int
    description: str


class PlanMatrix(BaseModel):
    matrix_meta: MatrixMeta
    essences: MatrixEssences
    grand_totals: MatrixRow
    data: list[MatrixRow]
