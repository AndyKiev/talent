# backend/api_v1/planning/plan_report/plan_report_service.py
from __future__ import annotations

from typing import Optional, Dict, Set, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_schema import EmployeeSchema

from backend.api_v1.planning.plan_report.plan_report_repository import (
    PlanReportRepository,
)
from backend.api_v1.planning.plan_report.plan_report_schema import (
    PlanReport as PlanReportSchema,
    PlanReportRow,
)
from backend.api_v1.planning.plan_scope.plan_scope_schema import (
    PlanScope as PlanScopeSchema,
)
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.region.region_schema import RegionSlim


# Bucket key: (plan_department_id, job_group_id, talent_status_id)
FactKey = Tuple[int, int, int]


class PlanReportService(BaseService):
    def __init__(
        self,
        repository: PlanReportRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)
        # Sibling repo shares the same AsyncSession.
        self.department_repo = DepartmentRepository(session=session)

    async def get_report(self, plan_session_id: int) -> PlanReportSchema:
        scopes = await self.repository.get_active_valued_scopes(plan_session_id)
        if not scopes:
            return PlanReportSchema(plan_session_id=plan_session_id, rows=[])

        fact_rows = await self.repository.get_fact_rows()
        org_index = await self.department_repo.get_org_unit_index()

        # The set of plan-row department instances we must match against.
        plan_dept_ids: Set[int] = {s.department_id for s in scopes}

        # Compute fact counts keyed by (plan_dept, job_group, talent_status_id).
        per_status_counts = self.compute_fact_counts(
            fact_rows, plan_dept_ids, org_index
        )

        # Region per department (one-to-one) for the region filter.
        region_map = await self.repository.get_region_map(plan_dept_ids)

        # 3) Emit one report row per valued scope.
        rows: list[PlanReportRow] = []
        for scope in scopes:
            schema = PlanScopeSchema.model_validate(scope)
            fact = self._fact_for_scope(scope, per_status_counts)
            region = region_map.get(scope.department_id)
            rows.append(
                PlanReportRow(
                    plan_scope_id=scope.id,
                    department_id=scope.department_id,
                    job_group_id=scope.job_group_id,
                    talent_status_id=scope.talent_status_id,
                    plan=int(scope.value),  # guaranteed NOT NULL by the query
                    fact=fact,
                    department=schema.department,
                    job_group=schema.job_group,
                    talent_status=schema.talent_status,
                    region=RegionSlim.model_validate(region) if region else None,
                )
            )

        return PlanReportSchema(plan_session_id=plan_session_id, rows=rows)

    # ------------------------------------------------------------------
    # helpers
    # ------------------------------------------------------------------

    @classmethod
    def compute_fact_counts(
        cls,
        fact_rows,
        plan_dept_ids: Set[int],
        org_index: Dict[int, tuple],
    ) -> Dict[FactKey, int]:
        """Bucket audit facts into counts keyed by
        (plan_department_id, job_group_id, talent_status_id).

        Per employee: pick the winning target period (lowest qty_months),
        keep the DISTINCT (job_group, talent_status) pairs of the winning job
        (job↔group is M2M, so a job in N groups counts toward N rows). A fact
        maps to every plan department that is ancestor-or-self of the
        employee's main department.

        Shared by the plan report and the plan matrix so both use one source
        of truth.
        """
        min_qty: Dict[int, int] = {}
        for fr in fact_rows:
            cur = min_qty.get(fr.employee_id)
            if cur is None or fr.qty_months < cur:
                min_qty[fr.employee_id] = fr.qty_months

        emp_main_dept: Dict[int, int] = {}
        emp_pairs: Dict[int, Set[Tuple[int, int]]] = {}
        for fr in fact_rows:
            if fr.qty_months != min_qty[fr.employee_id]:
                continue
            prev = emp_main_dept.get(fr.employee_id)
            if prev is None or fr.main_department_id < prev:
                emp_main_dept[fr.employee_id] = fr.main_department_id
            if fr.job_group_id is not None:
                emp_pairs.setdefault(fr.employee_id, set()).add(
                    (fr.job_group_id, fr.talent_status_id)
                )

        per_status_counts: Dict[FactKey, int] = {}
        for employee_id, pairs in emp_pairs.items():
            main_dept_id = emp_main_dept[employee_id]
            matching = cls._matching_plan_depts(main_dept_id, plan_dept_ids, org_index)
            if not matching:
                continue
            for job_group_id, talent_status_id in pairs:
                for plan_dept_id in matching:
                    key = (plan_dept_id, job_group_id, talent_status_id)
                    per_status_counts[key] = per_status_counts.get(key, 0) + 1
        return per_status_counts

    @staticmethod
    def _matching_plan_depts(
        main_department_id: int,
        plan_dept_ids: Set[int],
        org_index: Dict[int, tuple],
    ) -> Set[int]:
        """Walk UP from the employee's main department; collect every plan
        department that is ancestor-or-self along the chain.

        `org_index` maps dept id -> (parent_id, name, category_key).
        Cycle-safe via `seen`.
        """
        hits: Set[int] = set()
        seen: Set[int] = set()
        current: Optional[int] = main_department_id
        while current is not None and current in org_index and current not in seen:
            seen.add(current)
            if current in plan_dept_ids:
                hits.add(current)
            parent_id, _name, _key = org_index[current]
            current = parent_id
        return hits

    @staticmethod
    def _fact_for_scope(
        scope,
        per_status_counts: Dict[FactKey, int],
    ) -> int:
        """Combined scope (talent_status_id IS NULL) => sum over all statuses
        for that (department, job_group). Per-status scope => that status only.
        """
        dept_id = scope.department_id
        jg_id = scope.job_group_id
        if scope.talent_status_id is None:
            return sum(
                cnt
                for (d, j, _s), cnt in per_status_counts.items()
                if d == dept_id and j == jg_id
            )
        return per_status_counts.get((dept_id, jg_id, scope.talent_status_id), 0)
