from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.app_setting.app_setting_service import get_int_setting
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.department.department_messages import DepartmentNotFound
from backend.api_v1.department.department_model import Department
from backend.api_v1.department.department_repository import DepartmentRepository
from backend.api_v1.job_process_role_link.job_process_role_link_department_type_model import (
    JobProcessRoleLinkDepartmentType,
)
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_department.employee_department_model import (
    EmployeeDepartment,
)
from backend.api_v1.job.job_model import Job
from backend.api_v1.job_process_role_link.job_process_role_link_model import (
    JobProcessRoleLink,
)
from backend.api_v1.process_roles.oversight_manager.oversight_manager_messages import (
    OversightRoleNotConfigured,
)
from backend.api_v1.process_roles.oversight_manager.oversight_manager_service import (
    PEOPLE_REVIEW_PROCESS_KEY,
)
from backend.api_v1.process_roles.process.process_model import Process
from backend.api_v1.process_roles.process_role.process_role_model import ProcessRole
from backend.api_v1.process_roles.process_role_holder.process_role_holder_model import (
    ProcessRoleHolder,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_model import (
    ProcessRoleHolderEmployeeLink,
)
from backend.api_v1.process_roles.process_role_holder_employee_link.process_role_holder_employee_link_repository import (
    ProcessRoleHolderEmployeeLinkRepository,
)
from backend.api_v1.review_session.review_session_model import ReviewSession
from backend.api_v1.review_session_department.review_session_department_model import (
    ReviewSessionDepartment,
)
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)
from backend.api_v1.review_session_status.review_session_status_model import (
    ReviewSessionStatus,
)
from backend.api_v1.process_roles.oversight_assignment.oversight_assignment_messages import (
    OversightAssignmentNoOpenSession,
    OversightAssignmentRunSuccess,
)
from backend.api_v1.process_roles.oversight_assignment.oversight_assignment_schema import (
    OversightAssignmentReport,
    OversightAssignmentResultRow,
    OversightAssignmentRunRequest,
)

MAX_LEVELS_UP_SETTING_KEY = "oversight_assign_max_levels_up"


@dataclass
class _Candidate:
    id: int
    code: Optional[str]
    name: Optional[str]


@dataclass
class _SearchLevel:
    """One department up the chain: the employees holding an oversight job
    (resolved from the SUBORDINATE's department type) whose main department
    is this level's department instance."""

    department_id: int
    candidates: list[_Candidate] = field(default_factory=list)


class OversightAssignmentService(BaseService):
    """Batch auto-assignment of the oversight manager (people-review reviewer).

    For every employee of the selected department subtree that participates in
    the latest OPEN review session: take the employee's main department TYPE
    and resolve the curator job(s) through the explicit oversight-target link
    (job_process_role_link_department_types — "this job+role oversees the
    employees of departments of this type"). Then look for the holder of such
    a job in the employee's own department; when nobody holds it there, climb
    the parent chain up to the `oversight_assign_max_levels_up` app setting
    (the holder may sit above — e.g. the store manager). Exactly one
    candidate -> the link is written; two or more -> anomaly, nobody assigned.
    """

    def __init__(
        self,
        repository: ProcessRoleHolderEmployeeLinkRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def run(
        self, payload: OversightAssignmentRunRequest
    ) -> OversightAssignmentReport:
        role_ids = await self._oversight_role_ids()
        if not role_ids:
            raise await self._resolve_domain_error(OversightRoleNotConfigured())
        primary_role_id = role_ids[0]

        department = await self.session.scalar(
            select(Department).where(Department.id == payload.department_id)
        )
        if department is None:
            raise await self._resolve_domain_error(
                DepartmentNotFound(payload.department_id)
            )

        dept_repo = DepartmentRepository(session=self.session)
        subtree_ids = await dept_repo.get_subtree_ids([department.id])

        session_row, session_linked = await self._pick_review_session(
            dept_repo, subtree_ids
        )
        if session_row is None:
            raise await self._resolve_domain_error(OversightAssignmentNoOpenSession())
        session_id, session_name = session_row

        max_levels_up = await get_int_setting(
            self.session, MAX_LEVELS_UP_SETTING_KEY, default=2
        )

        # Departments as lightweight tuples (the tree is small; one round-trip).
        dept_info = {
            row.id: row
            for row in (
                await self.session.execute(
                    select(
                        Department.id,
                        Department.name,
                        Department.parent_id,
                        Department.department_type_id,
                    )
                )
            ).all()
        }

        # Target employees: session participants whose MAIN department is in
        # the selected subtree. Column-only select — no relationship hydration.
        targets = (
            await self.session.execute(
                select(
                    Employee.id,
                    Employee.code,
                    Employee.name,
                    EmployeeDepartment.department_id,
                )
                .join(
                    ReviewSessionEmployee,
                    ReviewSessionEmployee.employee_id == Employee.id,
                )
                .join(
                    EmployeeDepartment,
                    EmployeeDepartment.employee_id == Employee.id,
                )
                .where(
                    ReviewSessionEmployee.session_id == session_id,
                    EmployeeDepartment.department_id.in_(subtree_ids),
                )
                .order_by(Employee.id)
            )
        ).all()

        # Existing oversight links of the targets (one per employee, DB-enforced).
        existing_links: dict[int, ProcessRoleHolderEmployeeLink] = {}
        if targets:
            links = (
                await self.session.scalars(
                    select(ProcessRoleHolderEmployeeLink).where(
                        ProcessRoleHolderEmployeeLink.process_role_id.in_(role_ids),
                        ProcessRoleHolderEmployeeLink.employee_id.in_(
                            [t.id for t in targets]
                        ),
                    )
                )
            ).all()
            existing_links = {link.employee_id: link for link in links}

        # Oversight coverage: subordinate dept type -> curator job ids, from
        # the explicit oversight-target link (NOT the staffing link).
        jobs_by_type = await self._oversight_jobs_by_type(role_ids)
        # Search traces are shared by every employee of the same department.
        traces: dict[int, list[_SearchLevel]] = {}

        rows: list[OversightAssignmentResultRow] = []
        counts = {"assigned": 0, "overwritten": 0, "already_assigned": 0, "failed": 0}

        for emp_id, emp_code, emp_name, main_dept_id in targets:
            dept_row = dept_info.get(main_dept_id)
            row = OversightAssignmentResultRow(
                employee_id=emp_id,
                employee_code=emp_code,
                employee_name=emp_name,
                department_id=main_dept_id,
                department_name=dept_row.name if dept_row else None,
                status="failed",
            )

            existing = existing_links.get(emp_id)
            if existing is not None and not payload.overwrite:
                row.status = "already_assigned"
                row.previous_manager_name = self._holder_name(existing)
                rows.append(row)
                counts["already_assigned"] += 1
                continue

            type_id = dept_row.department_type_id if dept_row else None
            job_ids = jobs_by_type.get(type_id, []) if type_id is not None else []
            if not job_ids:
                candidate, levels_up, reason, conflict_names = (
                    None,
                    None,
                    "notParametrized",
                    [],
                )
            else:
                if main_dept_id not in traces:
                    traces[main_dept_id] = await self._build_trace(
                        main_dept_id, dept_info, job_ids, max_levels_up
                    )
                candidate, levels_up, reason, conflict_names = (
                    self._resolve_candidate(traces[main_dept_id], emp_id)
                )

            if candidate is None:
                row.reason_key = reason
                row.candidates = conflict_names
                if existing is not None:
                    # overwrite requested but nothing to write — keep the old link
                    row.previous_manager_name = self._holder_name(existing)
                rows.append(row)
                counts["failed"] += 1
                continue

            if existing is not None:
                current_holder = existing.holder
                if (
                    current_holder is not None
                    and current_holder.holder_employee_id == candidate.id
                ):
                    row.status = "already_assigned"
                    row.previous_manager_name = self._holder_name(existing)
                    rows.append(row)
                    counts["already_assigned"] += 1
                    continue
                row.previous_manager_name = self._holder_name(existing)
                await self.session.delete(existing)
                # emit the delete before inserting into the unique slot
                await self.session.flush()
                row.status = "overwritten"
            else:
                row.status = "assigned"

            holder = await self._ensure_holder(candidate.id, primary_role_id)
            self.session.add(
                ProcessRoleHolderEmployeeLink(
                    process_role_holder_id=holder.id,
                    process_role_id=holder.process_role_id,
                    employee_id=emp_id,
                )
            )
            await self.session.flush()
            row.new_manager_name = candidate.name or candidate.code
            row.levels_up = levels_up
            rows.append(row)
            counts[row.status] += 1

        await self.session.commit()

        detail = await self._resolve_domain_success(
            OversightAssignmentRunSuccess(
                assigned=counts["assigned"] + counts["overwritten"],
                skipped=counts["already_assigned"],
                failed=counts["failed"],
            )
        )
        return OversightAssignmentReport(
            detail=detail,
            department_id=department.id,
            department_name=department.name,
            session_id=session_id,
            session_name=session_name,
            session_department_linked=session_linked,
            max_levels_up=max_levels_up,
            overwrite=payload.overwrite,
            total=len(rows),
            assigned=counts["assigned"],
            overwritten=counts["overwritten"],
            already_assigned=counts["already_assigned"],
            failed=counts["failed"],
            rows=rows,
        )

    # ── helpers ──────────────────────────────────────────────────────────────

    async def _oversight_role_ids(self) -> list[int]:
        """Active people_review roles with employee-linked holders — the same
        resolution the self-service oversight-manager picker uses."""
        stmt = (
            select(ProcessRole.id)
            .join(Process, ProcessRole.process_id == Process.id)
            .where(
                Process.key == PEOPLE_REVIEW_PROCESS_KEY,
                ProcessRole.link_target == "employee",
                ProcessRole.is_active == True,
            )
        )
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def _pick_review_session(
        self, dept_repo: DepartmentRepository, subtree_ids: set[int]
    ) -> tuple[Optional[tuple[int, str]], bool]:
        """Latest OPEN session whose linked departments intersect the selected
        subtree (either direction: session linked to an ancestor or to a child
        of the selection). Falls back to the latest open session of all."""
        open_sessions = (
            await self.session.execute(
                select(ReviewSession.id, ReviewSession.name)
                .join(
                    ReviewSessionStatus,
                    ReviewSession.status_id == ReviewSessionStatus.id,
                )
                .where(ReviewSessionStatus.key == "open")
                .order_by(ReviewSession.id.desc())
            )
        ).all()
        if not open_sessions:
            return None, False

        for session_id, session_name in open_sessions:
            linked_ids = (
                await self.session.scalars(
                    select(ReviewSessionDepartment.department_id).where(
                        ReviewSessionDepartment.session_id == session_id
                    )
                )
            ).all()
            if not linked_ids:
                continue
            linked_subtree = await dept_repo.get_subtree_ids(set(linked_ids))
            if linked_subtree & subtree_ids:
                return (session_id, session_name), True

        first_id, first_name = open_sessions[0]
        return (first_id, first_name), False

    async def _oversight_jobs_by_type(
        self, role_ids: list[int]
    ) -> dict[int, list[int]]:
        """subordinate department_type_id -> ACTIVE job ids overseeing it,
        resolved through job_process_role_link_department_types."""
        rows = (
            await self.session.execute(
                select(
                    JobProcessRoleLinkDepartmentType.department_type_id,
                    JobProcessRoleLink.job_id,
                )
                .join(
                    JobProcessRoleLink,
                    JobProcessRoleLink.id
                    == JobProcessRoleLinkDepartmentType.job_process_role_link_id,
                )
                .join(Job, Job.id == JobProcessRoleLink.job_id)
                .where(
                    JobProcessRoleLink.process_role_id.in_(role_ids),
                    Job.is_active == True,
                )
            )
        ).all()
        jobs_by_type: dict[int, list[int]] = {}
        for type_id, job_id in rows:
            jobs_by_type.setdefault(type_id, [])
            if job_id not in jobs_by_type[type_id]:
                jobs_by_type[type_id].append(job_id)
        return jobs_by_type

    async def _build_trace(
        self,
        main_dept_id: int,
        dept_info: dict,
        job_ids: list[int],
        max_levels_up: int,
    ) -> list[_SearchLevel]:
        """The department itself plus up to max_levels_up ancestors, each with
        the employees holding one of the curator jobs there. The job set is
        fixed (from the SUBORDINATE's dept type); levels only widen WHERE the
        holder may sit."""
        trace: list[_SearchLevel] = []
        dept_id: Optional[int] = main_dept_id
        for _ in range(max_levels_up + 1):
            if dept_id is None:
                break
            dept_row = dept_info.get(dept_id)
            if dept_row is None:
                break
            found = (
                await self.session.execute(
                    select(Employee.id, Employee.code, Employee.name)
                    .join(
                        EmployeeDepartment,
                        EmployeeDepartment.employee_id == Employee.id,
                    )
                    .where(
                        EmployeeDepartment.department_id == dept_id,
                        Employee.job_id.in_(job_ids),
                        Employee.is_active == True,
                    )
                    .order_by(Employee.id)
                )
            ).all()
            trace.append(
                _SearchLevel(
                    department_id=dept_id,
                    candidates=[_Candidate(*row) for row in found],
                )
            )
            dept_id = dept_row.parent_id
        return trace

    @staticmethod
    def _resolve_candidate(
        trace: list[_SearchLevel], employee_id: int
    ) -> tuple[Optional[_Candidate], Optional[int], Optional[str], list[str]]:
        """Walk the levels: the first one holding a non-self candidate decides.
        Returns (candidate, levels_up, failure_reason_key, conflict_names)."""
        saw_self_only = False
        for levels_up, level in enumerate(trace):
            others = [c for c in level.candidates if c.id != employee_id]
            if len(others) == 1:
                return others[0], levels_up, None, []
            if len(others) > 1:
                names = [c.name or c.code or str(c.id) for c in others]
                return None, levels_up, "multipleCandidates", names
            if level.candidates:
                # only the employee themself holds the curator job here
                saw_self_only = True
        if saw_self_only:
            return None, None, "onlySelfCandidate", []
        return None, None, "noHolderFound", []

    async def _ensure_holder(
        self, employee_id: int, process_role_id: int
    ) -> ProcessRoleHolder:
        """The existing ProcessRoleHolder for (role, employee) or a new one."""
        existing = await self.session.scalar(
            select(ProcessRoleHolder).where(
                ProcessRoleHolder.process_role_id == process_role_id,
                ProcessRoleHolder.holder_employee_id == employee_id,
            )
        )
        if existing:
            return existing
        holder = ProcessRoleHolder(
            process_role_id=process_role_id,
            holder_employee_id=employee_id,
            assigned_by=self.user.id,
        )
        self.session.add(holder)
        await self.session.flush()
        await self.session.refresh(holder)
        return holder

    @staticmethod
    def _holder_name(link: ProcessRoleHolderEmployeeLink) -> Optional[str]:
        holder = link.holder
        if holder is None:
            return None
        return holder.holder_name or holder.holder_code
