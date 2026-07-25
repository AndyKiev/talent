# backend/api_v1/planning/plan_matrix/plan_matrix_service.py
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.planning.plan_matrix.plan_matrix_repository import (
    PlanMatrixRepository,
)
from backend.api_v1.planning.plan_matrix.plan_matrix_schema import (
    MatrixDepartment,
    MatrixEssences,
    MatrixJobGroupCell,
    MatrixJobGroupConfig,
    MatrixJobGroupDef,
    MatrixMeta,
    MatrixRegion,
    MatrixRow,
    MatrixStatusValue,
    MatrixSummary,
    MatrixTalentStatus,
    PlanMatrix,
)
from backend.api_v1.planning.plan_report.plan_report_repository import (
    PlanReportRepository,
)
from backend.api_v1.planning.plan_report.plan_report_service import PlanReportService


# Talent status keys we split columns by. Anything else still works (keyed by
# its own id) but the two canonical store statuses are Pa / Po.
def _pct(fact: int, target: int) -> float | None:
    if target <= 0:
        return None
    return round(min(fact / target, 1.0), 2)


class PlanMatrixService(BaseService):
    def __init__(
        self,
        repository: PlanMatrixRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.report_repo = PlanReportRepository(session=session)
        self.department_repo = DepartmentRepository(session=session)

    async def get_matrix(self, plan_session_id: int) -> PlanMatrix:
        scopes = await self.repository.get_store_valued_scopes(plan_session_id)
        meta = MatrixMeta(
            plan_session_id=plan_session_id,
            description="Plan vs fact — store departments",
        )
        if not scopes:
            return PlanMatrix(
                matrix_meta=meta,
                essences=MatrixEssences(),
                # Label is a translation KEY — the frontend resolves it via getString.
                grand_totals=MatrixRow(label="matrixTotal", summary=MatrixSummary()),
                data=[],
            )

        # Fact counts keyed (plan_dept, job_group, talent_status_id), reusing
        # the exact report logic (single source of truth).
        fact_rows = await self.report_repo.get_fact_rows()
        org_index = await self.department_repo.get_org_unit_index()
        plan_dept_ids: set[int] = {s.department_id for s in scopes}
        fact_counts = PlanReportService.compute_fact_counts(
            fact_rows, plan_dept_ids, org_index
        )

        # ── Discover essences from the scope set ──────────────────────────
        # Job group → mode: by_status if any per-status (non-NULL) plan row
        # exists for it; otherwise total (only the combined row).
        jg_order: list[int] = []
        jg_meta: dict[int, tuple[str, str]] = {}  # id -> (key, name)
        jg_by_status: dict[int, bool] = {}
        ts_meta: dict[int, tuple[str, str]] = {}  # id -> (key, name)
        dept_order: list[int] = []
        dept_name: dict[int, str] = {}
        dept_region: dict[int, tuple[str, str, str, int] | None] = (
            {}
        )  # did -> (id,key,name,sort)
        region_seen: dict[int, tuple[str, str, int]] = (
            {}
        )  # region_id -> (key,name,sort)

        for s in scopes:
            if s.job_group_id not in jg_meta:
                jg_meta[s.job_group_id] = (s.job_group_key, s.job_group_name)
                jg_order.append(s.job_group_id)
                jg_by_status[s.job_group_id] = False
            if s.talent_status_id is not None:
                jg_by_status[s.job_group_id] = True
                if s.talent_status_id not in ts_meta:
                    ts_meta[s.talent_status_id] = (
                        s.talent_status_key or str(s.talent_status_id),
                        s.talent_status_name or str(s.talent_status_id),
                    )
            if s.department_id not in dept_name:
                dept_name[s.department_id] = s.department_name
                dept_order.append(s.department_id)
                if s.region_id is not None:
                    dept_region[s.department_id] = (
                        str(s.region_id),
                        s.region_key or str(s.region_id),
                        s.region_name or str(s.region_id),
                        s.region_sort_order or 0,
                    )
                    if s.region_id not in region_seen:
                        region_seen[s.region_id] = (
                            s.region_key or str(s.region_id),
                            s.region_name or str(s.region_id),
                            s.region_sort_order or 0,
                        )
                else:
                    dept_region[s.department_id] = None

        essences = MatrixEssences(
            talent_statuses=[
                MatrixTalentStatus(id=str(tid), key=k, name=n)
                for tid, (k, n) in ts_meta.items()
            ],
            job_groups=[
                MatrixJobGroupDef(
                    id=str(jid),
                    key=jg_meta[jid][0],
                    name=jg_meta[jid][1],
                    config=MatrixJobGroupConfig(
                        target_mode="by_status" if jg_by_status[jid] else "total",
                        fact_mode="by_status" if jg_by_status[jid] else "total",
                        jobs=[],
                    ),
                )
                for jid in jg_order
            ],
            departments=[
                MatrixDepartment(
                    id=str(did),
                    key=dept_name[did],
                    name=dept_name[did],
                    region_id=(dept_region[did][0] if dept_region[did] else None),
                    region_key=(dept_region[did][1] if dept_region[did] else None),
                    region_name=(dept_region[did][2] if dept_region[did] else None),
                )
                for did in dept_order
            ],
            regions=[
                MatrixRegion(id=str(rid), key=k, name=n, sort_order=so)
                for rid, (k, n, so) in sorted(
                    region_seen.items(), key=lambda kv: kv[1][2]
                )
            ],
        )

        # ── Index plan values: (dept, jg, ts_id|None) -> value ─────────────
        plan_value: dict[tuple[int, int, int | None], int] = {}
        for s in scopes:
            plan_value[(s.department_id, s.job_group_id, s.talent_status_id)] = s.value

        # ── Build per-store rows ──────────────────────────────────────────
        # Running grand totals per job group, accumulated in the same shape.
        data_rows: list[MatrixRow] = []
        gt_cells: dict[int, dict[str, int]] = {
            jid: {"t_pa": 0, "t_po": 0, "t_tot": 0, "f_pa": 0, "f_po": 0, "f_tot": 0}
            for jid in jg_order
        }
        gt_base = gt_obj = gt_fact = 0

        for did in dept_order:
            jg_cells: dict[str, MatrixJobGroupCell] = {}
            row_target = 0
            row_fact = 0

            for jid in jg_order:
                by_status = jg_by_status[jid]
                if by_status:
                    t_pa, t_po, f_pa, f_po = 0, 0, 0, 0
                    for tid, (k, _n) in ts_meta.items():
                        tv = plan_value.get((did, jid, tid))
                        fv = fact_counts.get((did, jid, tid), 0)
                        if k.lower() in ("па", "pa"):
                            t_pa += tv or 0
                            f_pa += fv
                        elif k.lower() in ("по", "po"):
                            t_po += tv or 0
                            f_po += fv
                        else:
                            # Unknown status → fold into Pa column.
                            t_pa += tv or 0
                            f_pa += fv
                    tgt_sum = t_pa + t_po
                    fact_sum = f_pa + f_po
                    cell = MatrixJobGroupCell(
                        target=MatrixStatusValue(pa=t_pa, po=t_po).model_dump(),
                        fact=MatrixStatusValue(pa=f_pa, po=f_po).model_dump(),
                        pct=_pct(fact_sum, tgt_sum),
                    )
                    g = gt_cells[jid]
                    g["t_pa"] += t_pa
                    g["t_po"] += t_po
                    g["f_pa"] += f_pa
                    g["f_po"] += f_po
                else:
                    tv = plan_value.get((did, jid, None)) or 0
                    fv = fact_counts.get((did, jid, None), 0)
                    tgt_sum = tv
                    fact_sum = fv
                    cell = MatrixJobGroupCell(
                        target=tv,
                        fact=fv,
                        pct=_pct(fv, tv),
                    )
                    g = gt_cells[jid]
                    g["t_tot"] += tv
                    g["f_tot"] += fv

                jg_cells[str(jid)] = cell
                row_target += tgt_sum
                row_fact += fact_sum

            data_rows.append(
                MatrixRow(
                    department_id=str(did),
                    department_key=dept_name[did],
                    org_unit_key=dept_name[did],
                    region_id=(dept_region[did][0] if dept_region[did] else None),
                    region_key=(dept_region[did][1] if dept_region[did] else None),
                    region_name=(dept_region[did][2] if dept_region[did] else None),
                    job_groups=jg_cells,
                    summary=MatrixSummary(
                        base_target=row_target,
                        object_target=row_target,
                        fact=row_fact,
                        pct=_pct(row_fact, row_target),
                    ),
                )
            )
            gt_base += row_target
            gt_obj += row_target
            gt_fact += row_fact

        # ── Grand totals row ──────────────────────────────────────────────
        gt_jg: dict[str, MatrixJobGroupCell] = {}
        for jid in jg_order:
            g = gt_cells[jid]
            if jg_by_status[jid]:
                tgt_sum = g["t_pa"] + g["t_po"]
                fact_sum = g["f_pa"] + g["f_po"]
                gt_jg[str(jid)] = MatrixJobGroupCell(
                    target=MatrixStatusValue(pa=g["t_pa"], po=g["t_po"]).model_dump(),
                    fact=MatrixStatusValue(pa=g["f_pa"], po=g["f_po"]).model_dump(),
                    pct=_pct(fact_sum, tgt_sum),
                )
            else:
                gt_jg[str(jid)] = MatrixJobGroupCell(
                    target=g["t_tot"],
                    fact=g["f_tot"],
                    pct=_pct(g["f_tot"], g["t_tot"]),
                )

        # Label is a translation KEY — the frontend resolves it via getString.
        grand_totals = MatrixRow(
            label="matrixTotalByObjects",
            job_groups=gt_jg,
            summary=MatrixSummary(
                base_target=gt_base,
                object_target=gt_obj,
                fact=gt_fact,
                pct=_pct(gt_fact, gt_obj),
            ),
        )

        return PlanMatrix(
            matrix_meta=meta,
            essences=essences,
            grand_totals=grand_totals,
            data=data_rows,
        )
