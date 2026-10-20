from collections.abc import Collection

from sqlalchemy import select
from sqlalchemy.orm import aliased

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department.department_model import Department
from backend.api_v1.department_category.department_category_model import (
    DepartmentCategory,
)
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee_department.employee_department_model import (
    EmployeeDepartment,
)
from backend.api_v1.employee_status.employee_status_model import EmployeeStatus
from backend.api_v1.job.job_model import Job
from backend.api_v1.person.person_model import Person
from backend.api_v1.talent_audit.talent_audit_model import TalentAudit
from backend.api_v1.talent_audit_interview.talent_audit_interview_model import (
    TalentAuditInterview,
)
from backend.api_v1.talent_audit_interview_job.talent_audit_interview_job_model import (
    TalentAuditInterviewJob,
)
from backend.api_v1.talent_audit_job.talent_audit_job_model import TalentAuditJob
from backend.api_v1.talent_audit_job_status.talent_audit_job_status_model import (
    TalentAuditJobStatus,
)
from backend.api_v1.talent_period.talent_period_model import TalentPeriod
from backend.api_v1.talent_status.talent_status_model import TalentStatus
from backend.api_v1.talent_status_period_link.talent_status_period_link_model import (
    TalentStatusPeriodLink,
)


class TalentAuditRepository(BaseRepository):
    model = TalentAudit

    async def get_by_employee_id(self, employee_id: int) -> TalentAudit | None:
        """Return the single audit record for a given employee."""
        stmt = select(TalentAudit).where(TalentAudit.employee_id == employee_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    # ------------------------------------------------------------------
    # Talent employees roster — COLUMN selects only. Entity-selecting
    # TalentAudit / Employee would fire their selectin chains (Job, events,
    # departments, …) for every row.
    # ------------------------------------------------------------------

    async def get_roster_employees(
        self,
        main_department_ids: set[int] | None,
        subdepartment_id: int | None = None,
        job_id: int | None = None,
        status_id: int | None = None,
        employee_id: int | None = None,
    ):
        """Employees visible in the scope with their display columns. Name parts
        come back decrypted; composing / searching / sorting them is Python's
        job (they are ciphertext to SQL)."""
        if main_department_ids is not None and not main_department_ids:
            return []
        stmt = (
            select(
                Employee.id,
                Employee.code,
                Person.first_name,
                Person.last_name,
                Employee.status_id,
                EmployeeStatus.name,
                Employee.job_id,
                Job.name,
                EmployeeDepartment.department_id,
                Department.name,
                DepartmentCategory.sort_order,
            )
            .join(Person, Person.id == Employee.person_id)
            .outerjoin(EmployeeStatus, EmployeeStatus.id == Employee.status_id)
            .outerjoin(Job, Job.id == Employee.job_id)
            .outerjoin(
                EmployeeDepartment, EmployeeDepartment.employee_id == Employee.id
            )
            .outerjoin(Department, Department.id == EmployeeDepartment.department_id)
            .outerjoin(
                DepartmentCategory,
                DepartmentCategory.id == Department.department_category_id,
            )
        )
        if main_department_ids is not None:
            stmt = stmt.where(EmployeeDepartment.department_id.in_(main_department_ids))
        if subdepartment_id is not None:
            stmt = stmt.where(EmployeeDepartment.department_id == subdepartment_id)
        if job_id is not None:
            stmt = stmt.where(Employee.job_id == job_id)
        if status_id is not None:
            stmt = stmt.where(Employee.status_id == status_id)
        if employee_id is not None:
            stmt = stmt.where(Employee.id == employee_id)
        return (await self.session.execute(stmt)).all()

    async def get_roster_audits(self, employee_ids: Collection[int]):
        """(audit id, employee id, talent_plus) for the given employees."""
        if not employee_ids:
            return []
        stmt = select(
            TalentAudit.id, TalentAudit.employee_id, TalentAudit.talent_plus
        ).where(TalentAudit.employee_id.in_(employee_ids))
        return (await self.session.execute(stmt)).all()

    async def get_roster_audit_jobs(self, audit_ids: Collection[int]):
        """Every audit job of the given audits with its HRM status / period."""
        if not audit_ids:
            return []
        stmt = (
            select(
                TalentAuditJob.id,
                TalentAuditJob.talent_audit_id,
                TalentAuditJob.target_job_id,
                Job.name,
                TalentAuditJob.status_id,
                TalentAuditJobStatus.key,
                TalentAuditJobStatus.name,
                TalentStatus.id,
                TalentStatus.key,
                TalentPeriod.id,
                TalentPeriod.name,
                TalentPeriod.qty_months,
            )
            .join(Job, Job.id == TalentAuditJob.target_job_id)
            .join(
                TalentAuditJobStatus,
                TalentAuditJobStatus.id == TalentAuditJob.status_id,
            )
            .join(
                TalentStatusPeriodLink,
                TalentStatusPeriodLink.id
                == TalentAuditJob.talent_status_period_link_id,
            )
            .join(
                TalentStatus, TalentStatus.id == TalentStatusPeriodLink.talent_status_id
            )
            .join(
                TalentPeriod, TalentPeriod.id == TalentStatusPeriodLink.talent_period_id
            )
            .where(TalentAuditJob.talent_audit_id.in_(audit_ids))
        )
        return (await self.session.execute(stmt)).all()

    async def get_roster_interview_results(self, audit_job_ids: Collection[int]):
        """HRS results (interview job rows) for the given audit jobs, newest
        interview first — the first row per audit job is its latest result."""
        if not audit_job_ids:
            return []
        link = aliased(TalentStatusPeriodLink)
        stmt = (
            select(
                TalentAuditInterviewJob.talent_audit_job_id,
                TalentAuditInterview.id,
                TalentAuditInterview.interview_date,
                TalentStatus.id,
                TalentStatus.key,
                TalentPeriod.id,
                TalentPeriod.name,
                TalentPeriod.qty_months,
            )
            .join(
                TalentAuditInterview,
                TalentAuditInterview.id
                == TalentAuditInterviewJob.talent_audit_interview_id,
            )
            .join(link, link.id == TalentAuditInterviewJob.talent_status_period_link_id)
            .join(TalentStatus, TalentStatus.id == link.talent_status_id)
            .join(TalentPeriod, TalentPeriod.id == link.talent_period_id)
            .where(TalentAuditInterviewJob.talent_audit_job_id.in_(audit_job_ids))
            .order_by(
                TalentAuditInterview.interview_date.desc(),
                TalentAuditInterview.id.desc(),
            )
        )
        return (await self.session.execute(stmt)).all()

    async def get_active_talent_statuses(self):
        """(id, key) of active talent statuses, by key."""
        stmt = (
            select(TalentStatus.id, TalentStatus.key)
            .where(TalentStatus.is_active.is_(True))
            .order_by(TalentStatus.key)
        )
        return (await self.session.execute(stmt)).all()

    async def get_active_talent_periods(self):
        """(id, name) of active talent periods, shortest first."""
        stmt = (
            select(TalentPeriod.id, TalentPeriod.name)
            .where(TalentPeriod.is_active.is_(True))
            .order_by(TalentPeriod.qty_months)
        )
        return (await self.session.execute(stmt)).all()
