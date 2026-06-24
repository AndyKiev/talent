# backend/api_v1/planning/plan_report/plan_report_repository.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from sqlalchemy import select

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.planning.plan_scope.plan_scope_model import PlanScope
from backend.api_v1.talent_audit.talent_audit_model import TalentAudit
from backend.api_v1.talent_audit_job.talent_audit_job_model import TalentAuditJob
from backend.api_v1.talent_status_period_link.talent_status_period_link_model import (
    TalentStatusPeriodLink,
)
from backend.api_v1.talent_period.talent_period_model import TalentPeriod
from backend.api_v1.job.job_model import Job
from backend.api_v1.job_job_group_link.job_job_group_link_model import (
    JobJobGroupLink,
)
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee_status.employee_status_model import EmployeeStatus
from backend.api_v1.employee_department.employee_department_model import (
    EmployeeDepartment,
)
from backend.api_v1.department.department_model import Department
from backend.api_v1.department_region_link.department_region_link_model import (
    DepartmentRegionLink,
)
from backend.api_v1.region.region_model import Region


# Employee status NAME that marks an employee as currently working.
WORKING_EMPLOYEE_STATUS_NAME = "working"


@dataclass(frozen=True)
class FactRow:
    """One audit target-job candidate, flattened for in-memory bucketing.

    `qty_months` is used to pick the SINGLE target job per employee (lowest
    qty_months wins). `main_department_id` is the employee's is_main department
    instance, from which we walk up the tree to match a plan-row department.
    """
    employee_id: int
    main_department_id: int
    job_group_id: Optional[int]
    talent_status_id: int
    qty_months: int


class PlanReportRepository(BaseRepository):
    # No own table; reuses PlanScope for the model attribute so BaseRepository
    # generic helpers stay valid. Report is read-only.
    model = PlanScope

    async def get_active_valued_scopes(
        self, plan_session_id: int
    ) -> list[PlanScope]:
        """Active scopes of a session that already carry a plan value (NOT NULL).

        Rows with value IS NULL are intentionally excluded — the report never
        shows a line without a plan number.
        """
        stmt = (
            select(self.model)
            .join(Department, Department.id == self.model.department_id)
            .outerjoin(
                DepartmentRegionLink,
                DepartmentRegionLink.department_id == self.model.department_id,
            )
            .outerjoin(Region, Region.id == DepartmentRegionLink.region_id)
            .where(
                self.model.plan_session_id == plan_session_id,
                self.model.is_active.is_(True),
                self.model.value.is_not(None),
            )
            .order_by(
                Department.department_category_id,
                Region.sort_order.nulls_last(),
                Department.name,
                self.model.job_group_id,
                self.model.talent_status_id,
            )
        )
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def get_region_map(
        self, department_ids: set[int]
    ) -> dict[int, Region]:
        """department_id -> Region (only for departments that have a link).

        Region↔department is one-to-one, so each department maps to at most
        one region.
        """
        if not department_ids:
            return {}
        stmt = (
            select(DepartmentRegionLink.department_id, Region)
            .join(Region, Region.id == DepartmentRegionLink.region_id)
            .where(DepartmentRegionLink.department_id.in_(department_ids))
        )
        result = await self.session.execute(stmt)
        return {dep_id: region for dep_id, region in result.all()}

    async def get_fact_rows(self) -> list[FactRow]:
        """Flat dataset of every audit target-job for WORKING employees.

        One row per TalentAuditJob, carrying the employee's is_main department,
        the target job's job_group, the talent status (resolved via TSPL) and
        the period's qty_months. Bucketing / single-job selection happens in
        the service (pure Python, no extra round-trips).
        """
        stmt = (
            select(
                TalentAudit.employee_id.label("employee_id"),
                EmployeeDepartment.department_id.label("main_department_id"),
                JobJobGroupLink.job_group_id.label("job_group_id"),
                TalentStatusPeriodLink.talent_status_id.label("talent_status_id"),
                TalentPeriod.qty_months.label("qty_months"),
            )
            .join(TalentAuditJob, TalentAuditJob.talent_audit_id == TalentAudit.id)
            .join(Employee, Employee.id == TalentAudit.employee_id)
            .join(EmployeeStatus, EmployeeStatus.id == Employee.status_id)
            .join(
                EmployeeDepartment,
                (EmployeeDepartment.employee_id == Employee.id)
                & (EmployeeDepartment.is_main.is_(True)),
            )
            .join(Job, Job.id == TalentAuditJob.target_job_id)
            .join(JobJobGroupLink, JobJobGroupLink.job_id == Job.id)
            .join(
                TalentStatusPeriodLink,
                TalentStatusPeriodLink.id
                == TalentAuditJob.talent_status_period_link_id,
            )
            .join(
                TalentPeriod,
                TalentPeriod.id == TalentStatusPeriodLink.talent_period_id,
            )
            .where(EmployeeStatus.name == WORKING_EMPLOYEE_STATUS_NAME)
        )
        result = await self.session.execute(stmt)
        return [
            FactRow(
                employee_id=row.employee_id,
                main_department_id=row.main_department_id,
                job_group_id=row.job_group_id,
                talent_status_id=row.talent_status_id,
                qty_months=row.qty_months,
            )
            for row in result.all()
        ]
