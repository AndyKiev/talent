from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.review_session.review_session_repository import (
    ReviewSessionRepository,
)
from backend.api_v1.review_session.review_session_schema import (
    ReviewSession as ReviewSessionSchema,
    ReviewSessionCreate,
    ReviewSessionUpdate,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.review_session.review_session_errors import (
    ReviewSessionNotFound,
    ReviewSessionDeleteError,
    ReviewSessionDeletePermission,
    ReviewSessionStatusError,
    ReviewSessionCannotCloseError,
)
from backend.api_v1.review_session.review_session_success import (
    ReviewSessionDeleteSuccess,
    ReviewSessionCreateSuccess,
    ReviewSessionUpdateSuccess,
    ReviewSessionOpenSuccess,
    ReviewSessionCloseSuccess,
    ReviewSessionRevertSuccess,
)
from backend.api_v1.review_session_employee.review_session_employee_model import (
    ReviewSessionEmployee,
)
from backend.api_v1.review_session_status.review_session_status_repository import (
    ReviewSessionStatusRepository,
)
from backend.api_v1.review_session_status.review_session_status_errors import (
    ReviewSessionStatusNotFoundByKey,
)
from backend.utils.enums import ReviewSessionStatusKey
from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
    ReviewSessionEmployeeEvaluation,
)
from backend.api_v1.review_session_employee_criterion_score.review_session_employee_criterion_score_model import (
    ReviewSessionEmployeeCriterionScore,
)
from backend.api_v1.review_session_employee_level.review_session_employee_level_model import (
    ReviewSessionEmployeeLevel,
)
from backend.api_v1.review_session_employee_level_answer.review_session_employee_level_answer_model import (
    ReviewSessionEmployeeLevelAnswer,
)
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.review_dimension.review_dimension_model import ReviewDimension
from backend.api_v1.review_dimension_criteria.review_dimension_criteria_model import (
    ReviewDimensionCriteria,
)
from backend.api_v1.review_session_criterion.review_session_criterion_model import (
    ReviewSessionCriterion,
)
from backend.api_v1.review_level.review_level_model import ReviewLevel
from backend.api_v1.review_session_level.review_session_level_model import (
    ReviewSessionLevel,
)
from backend.api_v1.review_session_level_requirement.review_session_level_requirement_model import (
    ReviewSessionLevelRequirement,
)
from backend.api_v1.review_session_setting.review_session_setting_model import (
    ReviewSessionSetting,
)


VALID_TRANSITIONS = {
    "pending": ["open"],
    "open": ["closed"],
    "closed": ["open"],  # revert is allowed
}

# App-setting key prefixes frozen into review_session_settings at open time.
# Any setting whose key starts with one of these is snapshotted, so a NEW
# people-review setting gets frozen with no further code changes.
FROZEN_SETTING_PREFIXES = ("review_session_", "people_review_")


class ReviewSessionService(BaseService):
    def __init__(
        self,
        repository: ReviewSessionRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)
        self.status_repo = ReviewSessionStatusRepository(session=session)

    async def _resolve_status_id(self, key: str) -> int:
        """Resolve a status id from its stable key (no magic numbers)."""
        status_id = await self.status_repo.get_id_by_field("key", key)
        if status_id is None:
            raise await self._resolve_domain_error(
                ReviewSessionStatusNotFoundByKey(key)
            )
        return status_id

    async def get_by_id(self, id: int):
        result = await self.repository.get_by_id(id)
        if not result:
            exc = ReviewSessionNotFound(id)
            raise await self._resolve_domain_error(exc)
        return result

    def _to_schema(self, record) -> ReviewSessionSchema:
        schema = ReviewSessionSchema.model_validate(record)
        schema.employee_count = len(record.employees) if record.employees else 0
        return schema

    async def get_review_sessions(
        self,
        status: Optional[str] = None,
        sort: Optional[str] = None,
    ) -> List[ReviewSessionSchema]:
        filters = {}
        if status:
            status_id = await self._resolve_status_id(status)
            filters["status_id"] = status_id
        records = await self.get_all(params=filters or None, sort_json=sort)
        schemas = [self._to_schema(r) for r in records]

        # Batch-load department names for all sessions.
        if schemas:
            from backend.api_v1.review_session_department.review_session_department_repository import (
                ReviewSessionDepartmentRepository,
            )
            dep_repo = ReviewSessionDepartmentRepository(session=self.session)
            dep_names = await dep_repo.get_department_names_by_session_ids(
                [s.id for s in schemas]
            )
            for s in schemas:
                s.department_name = dep_names.get(s.id)

        return schemas

    async def create_review_session(
        self, rs_in: ReviewSessionCreate
    ) -> MutationResponse[ReviewSessionSchema]:
        from backend.api_v1.review_session_department.review_session_department_repository import (
            ReviewSessionDepartmentRepository,
        )

        pending_id = await self._resolve_status_id(
            ReviewSessionStatusKey.PENDING.value
        )
        data = rs_in.model_dump()
        department_id = data.pop("department_id", None)
        data["status_id"] = pending_id
        record = await self.create_from_dict(data)

        # Optionally link a department to the session at creation time.
        if department_id is not None:
            dep_repo = ReviewSessionDepartmentRepository(session=self.session)
            dep_link = dep_repo.model(session_id=record.id, department_id=department_id)
            self.session.add(dep_link)
            await self.session.commit()
            await self.session.refresh(record)
            # Load the department name explicitly (avoid lazy-load in sync _to_schema).
            from backend.api_v1.department.department_model import Department as DeptModel
            dep_name_stmt = select(DeptModel.name).where(DeptModel.id == department_id)
            dep_name_result = await self.session.execute(dep_name_stmt)
            dep_name = dep_name_result.scalar_one_or_none()

        schema = self._to_schema(record)
        if department_id is not None:
            schema.department_name = dep_name
        detail = await self._resolve_domain_success(
            ReviewSessionCreateSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def update_review_session(
        self, rs_id: int, rs_update: ReviewSessionUpdate
    ) -> MutationResponse[ReviewSessionSchema]:
        orm_record = await self.get_by_id(rs_id)
        updated = await self.update(orm_record, rs_update, partial=True)
        schema = self._to_schema(updated)
        detail = await self._resolve_domain_success(
            ReviewSessionUpdateSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def open_session(self, rs_id: int) -> MutationResponse[ReviewSessionSchema]:
        from backend.api_v1.app_setting.app_setting_model import AppSetting as AppSettingModel
        from backend.api_v1.review_session_department.review_session_department_repository import (
            ReviewSessionDepartmentRepository,
        )
        from backend.api_v1.employee_department.employee_department_model import (
            EmployeeDepartment,
        )

        orm_record = await self.get_by_id(rs_id)
        if "open" not in VALID_TRANSITIONS.get(orm_record.status, []):
            exc = ReviewSessionStatusError(orm_record.status, "open")
            raise await self._resolve_domain_error(exc)

        open_id = await self._resolve_status_id(
            ReviewSessionStatusKey.OPEN.value
        )

        # Check if the department-filter setting is enabled.
        filter_by_dept = False
        setting_stmt = select(AppSettingModel).where(
            AppSettingModel.key == "review_session_filter_by_department"
        )
        setting_result = await self.session.execute(setting_stmt)
        setting = setting_result.scalar_one_or_none()
        if setting and setting.value is True:
            dep_repo = ReviewSessionDepartmentRepository(session=self.session)
            linked_dept_ids = await dep_repo.get_by_session(rs_id)
            if linked_dept_ids:
                filter_by_dept = True

        # Build the employee selection from all active filters (ANDed). Each
        # filter is read fresh here, so it only affects THIS (newly opened)
        # session — never previously opened ones.
        from sqlalchemy import or_
        from backend.api_v1.app_setting.app_setting_service import get_list_setting
        from backend.api_v1.employee_status.employee_status_model import EmployeeStatus
        from backend.api_v1.job_category.job_category_model import JobCategory
        from backend.api_v1.job_job_category_link.job_job_category_link_model import (
            JobJobCategoryLink,
        )

        stmt = select(Employee)
        conditions = [Employee.is_active == True]

        # Filter 1 (existing): employees whose MAIN department is in the picked
        # department's subtree.
        if filter_by_dept:
            from backend.api_v1.department.department_repository import DepartmentRepository

            linked_ids = {r.department_id for r in linked_dept_ids}
            # Expand to include all descendants so picking a top-level department
            # (e.g. a directorate) includes employees in all its sub-departments.
            dept_repo = DepartmentRepository(session=self.session)
            subtree_ids = await dept_repo.get_subtree_ids(linked_ids)
            stmt = stmt.join(
                EmployeeDepartment, EmployeeDepartment.employee_id == Employee.id
            )
            conditions += [
                EmployeeDepartment.department_id.in_(subtree_ids),
            ]

        # Filter 2: employee status (default ['working']). Empty list = no filter.
        status_names = await get_list_setting(
            self.session, "review_session_filter_employee_statuses", ["working"]
        )
        if status_names:
            stmt = stmt.join(EmployeeStatus, EmployeeStatus.id == Employee.status_id)
            conditions.append(EmployeeStatus.name.in_(status_names))

        # Filter 3: job category (default ['manager']). An employee whose job has
        # NO category link (or no job at all) is ALWAYS included. Empty = no filter.
        category_keys = await get_list_setting(
            self.session, "review_session_filter_job_categories", ["manager"]
        )
        if category_keys:
            stmt = stmt.outerjoin(
                JobJobCategoryLink, JobJobCategoryLink.job_id == Employee.job_id
            ).outerjoin(
                JobCategory, JobCategory.id == JobJobCategoryLink.job_category_id
            )
            conditions.append(
                or_(
                    JobJobCategoryLink.id.is_(None),
                    JobCategory.key.in_(category_keys),
                )
            )

        stmt = stmt.where(*conditions)
        result = await self.session.execute(stmt)
        employees = result.scalars().unique().all()

        # Get all active dimensions
        dim_stmt = select(ReviewDimension).where(ReviewDimension.is_active == True)
        dim_result = await self.session.execute(dim_stmt)
        dimensions = dim_result.scalars().all()

        # Freeze this session's criteria: copy each active dimension's ACTIVE
        # criteria text into review_session_criterions. The copy is the source of
        # the behaviour descriptors scored in the review and keeps the per-index
        # scores valid even if the live criteria are later edited/deleted.
        crit_stmt = (
            select(ReviewDimensionCriteria)
            .where(ReviewDimensionCriteria.is_active == True)
            .order_by(
                ReviewDimensionCriteria.sort_order,
                ReviewDimensionCriteria.id,
            )
        )
        crit_result = await self.session.execute(crit_stmt)
        active_dim_ids = {d.id for d in dimensions}
        for crit in crit_result.scalars().all():
            if crit.dimension_id not in active_dim_ids:
                continue
            self.session.add(
                ReviewSessionCriterion(
                    session_id=rs_id,
                    dimension_id=crit.dimension_id,
                    source_criteria_id=crit.id,
                    text=crit.text,
                    sort_order=crit.sort_order,
                )
            )

        # Freeze this session's competency levels + their requirements (the "level
        # descriptions"). Like the criteria above, the active set + order is copied
        # so the proposed-level drawer's selectable levels/requirements stay fixed
        # for this session even if the live levels are later edited, reordered or
        # deactivated. source_*_id keeps the live id so saved employee answers
        # (stored with live ids) still map to the frozen rows.
        level_stmt = (
            select(ReviewLevel)
            .where(ReviewLevel.is_active == True)
            .order_by(ReviewLevel.sort_order, ReviewLevel.id)
        )
        level_result = await self.session.execute(level_stmt)
        for lvl in level_result.scalars().all():
            session_level = ReviewSessionLevel(
                session_id=rs_id,
                source_level_id=lvl.id,
                name_key=lvl.name_key,
                description_key=lvl.description_key,
                sort_order=lvl.sort_order,
            )
            self.session.add(session_level)
            await self.session.flush()  # populate session_level.id for the children
            active_reqs = sorted(
                (r for r in lvl.requirements if r.is_active),
                key=lambda r: (r.sort_order, r.id),
            )
            for req in active_reqs:
                self.session.add(
                    ReviewSessionLevelRequirement(
                        session_level_id=session_level.id,
                        source_requirement_id=req.id,
                        text_key=req.text_key,
                        sort_order=req.sort_order,
                    )
                )

        # Freeze the app settings that shape people review (key + JSON value) so
        # the parameters this session was opened under stay inspectable even
        # after the live settings change. Prefix-matched — see
        # FROZEN_SETTING_PREFIXES. Read-only snapshot; runtime keeps reading the
        # live settings.
        setting_snap_stmt = (
            select(AppSettingModel)
            .where(
                or_(
                    *[
                        AppSettingModel.key.like(f"{prefix}%")
                        for prefix in FROZEN_SETTING_PREFIXES
                    ]
                )
            )
            .order_by(AppSettingModel.key)
        )
        snap_result = await self.session.execute(setting_snap_stmt)
        for app_setting in snap_result.scalars().all():
            self.session.add(
                ReviewSessionSetting(
                    session_id=rs_id,
                    key=app_setting.key,
                    value=app_setting.value,
                )
            )

        for emp in employees:
            rse = ReviewSessionEmployee(
                session_id=rs_id,
                employee_id=emp.id,
                status="open",
            )
            self.session.add(rse)

        await self.session.flush()

        # Now create evaluation records for each RSE + dimension
        rse_stmt = select(ReviewSessionEmployee).where(
            ReviewSessionEmployee.session_id == rs_id
        )
        rse_result = await self.session.execute(rse_stmt)
        rse_records = rse_result.scalars().all()

        for rse in rse_records:
            for dim in dimensions:
                evaluation = ReviewSessionEmployeeEvaluation(
                    review_session_employee_id=rse.id,
                    dimension_id=dim.id,
                )
                self.session.add(evaluation)

        orm_record.status_id = open_id
        await self.session.commit()
        await self.session.refresh(orm_record)

        schema = self._to_schema(orm_record)
        detail = await self._resolve_domain_success(
            ReviewSessionOpenSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def close_session(self, rs_id: int) -> MutationResponse[ReviewSessionSchema]:
        from sqlalchemy import select as sa_select
        from backend.api_v1.review_session_employee.review_session_employee_model import (
            ReviewSessionEmployee as RSEModel,
        )

        orm_record = await self.get_by_id(rs_id)
        if "closed" not in VALID_TRANSITIONS.get(orm_record.status, []):
            exc = ReviewSessionStatusError(orm_record.status, "closed")
            raise await self._resolve_domain_error(exc)

        closed_id = await self._resolve_status_id(
            ReviewSessionStatusKey.CLOSED.value
        )

        # A session can only close once every employee review is "closed".
        not_closed_stmt = sa_select(RSEModel).where(
            RSEModel.session_id == rs_id,
            RSEModel.status != "closed",
        )
        result = await self.session.execute(not_closed_stmt)
        not_closed_employees = result.scalars().all()
        if not_closed_employees:
            exc = ReviewSessionCannotCloseError(len(not_closed_employees))
            raise await self._resolve_domain_error(exc)

        orm_record.status_id = closed_id
        await self.session.commit()
        await self.session.refresh(orm_record)

        schema = self._to_schema(orm_record)
        detail = await self._resolve_domain_success(
            ReviewSessionCloseSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def revert_session(self, rs_id: int) -> MutationResponse[ReviewSessionSchema]:
        orm_record = await self.get_by_id(rs_id)
        if orm_record.status != "closed":
            exc = ReviewSessionStatusError(orm_record.status, "open")
            raise await self._resolve_domain_error(exc)

        open_id = await self._resolve_status_id(
            ReviewSessionStatusKey.OPEN.value
        )
        orm_record.status_id = open_id
        await self.session.commit()
        await self.session.refresh(orm_record)

        schema = self._to_schema(orm_record)
        detail = await self._resolve_domain_success(
            ReviewSessionRevertSuccess(schema.name)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_review_session(self, rs_id: int) -> None:
        """
        Cascade-delete a whole session and ALL its descendants in one transaction,
        deepest first:
          session -> employee reviews
                       -> evaluations -> criterion scores
                       -> levels      -> level answers
        FKs have no ON DELETE CASCADE, so every child is deleted explicitly — a
        missing one surfaces as the misleading "has employee reviews" error.
        Restricted to developers (the `dev` group).
        """
        from sqlalchemy import select as sa_select, delete as sa_delete
        from backend.api_v1.review_session_department.review_session_department_model import (
            ReviewSessionDepartment,
        )

        groups = [g.lower() for g in (self.user.groups if self.user else [])]
        if "dev" not in groups:
            exc = ReviewSessionDeletePermission()
            raise await self._resolve_domain_error(exc)

        record = await self.get_by_id(rs_id)
        name = record.name

        try:
            # Collect employee-review ids for this session.
            rse_ids = (
                (
                    await self.session.execute(
                        sa_select(ReviewSessionEmployee.id).where(
                            ReviewSessionEmployee.session_id == rs_id
                        )
                    )
                )
                .scalars()
                .all()
            )

            if rse_ids:
                eval_ids = (
                    (
                        await self.session.execute(
                            sa_select(ReviewSessionEmployeeEvaluation.id).where(
                                ReviewSessionEmployeeEvaluation.review_session_employee_id.in_(
                                    rse_ids
                                )
                            )
                        )
                    )
                    .scalars()
                    .all()
                )
                level_ids = (
                    (
                        await self.session.execute(
                            sa_select(ReviewSessionEmployeeLevel.id).where(
                                ReviewSessionEmployeeLevel.review_session_employee_id.in_(
                                    rse_ids
                                )
                            )
                        )
                    )
                    .scalars()
                    .all()
                )

                # 1) grandchildren
                if eval_ids:
                    await self.session.execute(
                        sa_delete(ReviewSessionEmployeeCriterionScore).where(
                            ReviewSessionEmployeeCriterionScore.review_session_employee_evaluation_id.in_(
                                eval_ids
                            )
                        )
                    )
                if level_ids:
                    await self.session.execute(
                        sa_delete(ReviewSessionEmployeeLevelAnswer).where(
                            ReviewSessionEmployeeLevelAnswer.review_session_employee_level_id.in_(
                                level_ids
                            )
                        )
                    )

                # 2) children of the employee review
                await self.session.execute(
                    sa_delete(ReviewSessionEmployeeEvaluation).where(
                        ReviewSessionEmployeeEvaluation.review_session_employee_id.in_(
                            rse_ids
                        )
                    )
                )
                await self.session.execute(
                    sa_delete(ReviewSessionEmployeeLevel).where(
                        ReviewSessionEmployeeLevel.review_session_employee_id.in_(
                            rse_ids
                        )
                    )
                )

                # 3) the employee reviews
                await self.session.execute(
                    sa_delete(ReviewSessionEmployee).where(
                        ReviewSessionEmployee.session_id == rs_id
                    )
                )

            # 3b) the session's department links (clean up before criteria)
            await self.session.execute(
                sa_delete(ReviewSessionDepartment).where(
                    ReviewSessionDepartment.session_id == rs_id
                )
            )

            # 3c) the session's frozen criteria snapshot (no FK from anything else)
            await self.session.execute(
                sa_delete(ReviewSessionCriterion).where(
                    ReviewSessionCriterion.session_id == rs_id
                )
            )

            # 3c) the session's frozen settings snapshot (no FK from anything else)
            await self.session.execute(
                sa_delete(ReviewSessionSetting).where(
                    ReviewSessionSetting.session_id == rs_id
                )
            )

            # 3c) the session's frozen levels snapshot (requirements child first).
            # Nothing else FKs into these (employee rows stay on live ids).
            session_level_ids = (
                (
                    await self.session.execute(
                        sa_select(ReviewSessionLevel.id).where(
                            ReviewSessionLevel.session_id == rs_id
                        )
                    )
                )
                .scalars()
                .all()
            )
            if session_level_ids:
                await self.session.execute(
                    sa_delete(ReviewSessionLevelRequirement).where(
                        ReviewSessionLevelRequirement.session_level_id.in_(
                            session_level_ids
                        )
                    )
                )
            await self.session.execute(
                sa_delete(ReviewSessionLevel).where(
                    ReviewSessionLevel.session_id == rs_id
                )
            )

            # 4) the session
            await self.session.execute(
                sa_delete(self.repository.model).where(
                    self.repository.model.id == rs_id
                )
            )
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            exc = ReviewSessionDeleteError(name)
            raise await self._resolve_domain_error(exc)

        success = ReviewSessionDeleteSuccess(name)
        await self._raise_success(
            message_key=success.message_key,
            variables=success.template_vars,
            fallback=success.fallback,
        )

    async def get_analytics(self, rs_id: int) -> list[dict]:
        """
        Returns average score per dimension across all employees in the session.
        Only evaluations with a non-null score contribute to the average.
        """
        from sqlalchemy import select as sa_select, func
        from backend.api_v1.review_session_employee.review_session_employee_model import (
            ReviewSessionEmployee as RSEModel,
        )
        from backend.api_v1.review_session_employee_evaluation.review_session_employee_evaluation_model import (
            ReviewSessionEmployeeEvaluation as EvalModel,
        )
        from backend.api_v1.review_dimension.review_dimension_model import (
            ReviewDimension,
        )

        stmt = (
            sa_select(
                ReviewDimension.id,
                ReviewDimension.name,
                ReviewDimension.key,
                ReviewDimension.description,
                ReviewDimension.color,
                ReviewDimension.sort_order,
                func.count(EvalModel.id).label("total_evaluations"),
                func.count(EvalModel.score).label("scored_count"),
                func.avg(EvalModel.score).label("avg_score"),
                func.min(EvalModel.score).label("min_score"),
                func.max(EvalModel.score).label("max_score"),
            )
            .join(EvalModel, EvalModel.dimension_id == ReviewDimension.id)
            .join(RSEModel, RSEModel.id == EvalModel.review_session_employee_id)
            .where(RSEModel.session_id == rs_id)
            .group_by(
                ReviewDimension.id,
                ReviewDimension.name,
                ReviewDimension.key,
                ReviewDimension.description,
                ReviewDimension.color,
                ReviewDimension.sort_order,
            )
            .order_by(ReviewDimension.sort_order, ReviewDimension.id)
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        return [
            {
                "dimension_id": r.id,
                "dimension_name": r.name,
                "dimension_key": r.key,
                "dimension_description": r.description,
                "dimension_color": r.color,
                "dimension_sort_order": r.sort_order,
                "total_evaluations": r.total_evaluations,
                "scored_count": r.scored_count,
                "avg_score": (
                    round(float(r.avg_score), 2) if r.avg_score is not None else None
                ),
                "min_score": r.min_score,
                "max_score": r.max_score,
            }
            for r in rows
        ]

    async def get_frozen_settings(self, rs_id: int) -> dict:
        """Flat {key: value} of the app settings frozen into this session.

        Runtime companion of get_frozen_params (which is the dev inspection
        dump): session pages read THESE instead of the live app settings, so a
        developer-settings change never re-gates an already-opened session.
        Empty dict for pending sessions (nothing frozen yet).
        """
        result = await self.session.execute(
            select(ReviewSessionSetting).where(
                ReviewSessionSetting.session_id == rs_id
            )
        )
        return {s.key: s.value for s in result.scalars().all()}

    async def get_frozen_params(self, rs_id: int) -> dict:
        """Read-only dump of everything frozen into a session at open time.

        Rows are built by introspecting the ORM columns, so a column added to a
        frozen table later appears here automatically; a brand-new frozen table
        only needs one more section below. Values that are translation keys are
        resolved on the frontend.
        """
        from sqlalchemy import inspect as sa_inspect
        from backend.api_v1.review_session_department.review_session_department_model import (
            ReviewSessionDepartment,
        )

        orm_record = await self.get_by_id(rs_id)

        def dump(obj, extra: dict | None = None) -> dict:
            row = {
                attr.key: getattr(obj, attr.key)
                for attr in sa_inspect(obj).mapper.column_attrs
            }
            if extra:
                row.update(extra)
            return row

        setting_result = await self.session.execute(
            select(ReviewSessionSetting)
            .where(ReviewSessionSetting.session_id == rs_id)
            .order_by(ReviewSessionSetting.key)
        )
        dept_result = await self.session.execute(
            select(ReviewSessionDepartment)
            .where(ReviewSessionDepartment.session_id == rs_id)
            .order_by(ReviewSessionDepartment.id)
        )
        crit_result = await self.session.execute(
            select(ReviewSessionCriterion)
            .where(ReviewSessionCriterion.session_id == rs_id)
            .order_by(
                ReviewSessionCriterion.dimension_id,
                ReviewSessionCriterion.sort_order,
                ReviewSessionCriterion.id,
            )
        )
        level_result = await self.session.execute(
            select(ReviewSessionLevel)
            .where(ReviewSessionLevel.session_id == rs_id)
            .order_by(ReviewSessionLevel.sort_order, ReviewSessionLevel.id)
        )
        levels = level_result.scalars().all()

        sections = [
            {
                "table": "review_sessions",
                "rows": [dump(orm_record, {"status": orm_record.status})],
            },
            {
                "table": "review_session_settings",
                "rows": [dump(s) for s in setting_result.scalars().all()],
            },
            {
                "table": "review_session_departments",
                "rows": [
                    dump(link, {"department_name": link.department.name})
                    for link in dept_result.scalars().all()
                ],
            },
            {
                "table": "review_session_criterions",
                "rows": [
                    dump(crit, {"dimension_name": crit.dimension.name})
                    for crit in crit_result.scalars().all()
                ],
            },
            {
                "table": "review_session_levels",
                "rows": [dump(lvl) for lvl in levels],
            },
            {
                "table": "review_session_level_requirements",
                "rows": [
                    dump(req, {"level_name_key": lvl.name_key})
                    for lvl in levels
                    for req in sorted(
                        lvl.requirements, key=lambda r: (r.sort_order, r.id)
                    )
                ],
            },
        ]
        return {"sections": sections}
