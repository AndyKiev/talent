
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_recommended_training.employee_recommended_training_access import (
    EmployeeRecommendedTrainingAccess,
)
from backend.api_v1.employee_recommended_training.employee_recommended_training_messages import (
    RecommendedTrainingCreateSuccess,
    RecommendedTrainingNotFound,
    RecommendedTrainingStatusKeyNotFound,
    RecommendedTrainingStatusNotFound,
    RecommendedTrainingTextRequired,
    RecommendedTrainingUpdateSuccess,
)
from backend.api_v1.employee_recommended_training.employee_recommended_training_model import (
    EmployeeRecommendedTraining,
)
from backend.api_v1.employee_recommended_training.employee_recommended_training_repository import (
    EmployeeRecommendedTrainingRepository,
)
from backend.api_v1.employee_recommended_training.employee_recommended_training_schema import (
    EmployeeRecommendedTraining as RecommendedTrainingSchema,
)
from backend.api_v1.employee_recommended_training.employee_recommended_training_schema import (
    EmployeeRecommendedTrainingCreate,
    EmployeeRecommendedTrainingList,
    EmployeeRecommendedTrainingPermissions,
    EmployeeRecommendedTrainingUpdate,
)
from backend.api_v1.employee_recommended_training_status.employee_recommended_training_status_model import (
    RECOMMENDED,
    EmployeeRecommendedTrainingStatus,
)
from backend.utils.enums import OperationVerb


class EmployeeRecommendedTrainingService(BaseService):
    """Employee-scoped recommended trainings — one list per person, read and
    written from BOTH the people review and the employee card.

    Permissions live in `employee_recommended_training_access.py`; this service
    only resolves the owning employee first, because the id-keyed routes have no
    `{employee_id}` for a route guard to scope on.
    """

    def __init__(
        self,
        repository: EmployeeRecommendedTrainingRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ) -> None:
        super().__init__(repository, user=user, session=session)
        self.access = EmployeeRecommendedTrainingAccess(user=user, session=session)

    # ── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _to_schema(record: EmployeeRecommendedTraining) -> RecommendedTrainingSchema:
        schema = RecommendedTrainingSchema.model_validate(record)
        if record.status:
            schema.status_key = record.status.key
            schema.status_description = record.status.description
        return schema

    async def _get_record(self, training_id: int) -> EmployeeRecommendedTraining:
        record = await self.repository.get_by_id(training_id)
        if not record:
            raise await self._resolve_domain_error(
                RecommendedTrainingNotFound(training_id)
            )
        return record

    async def _default_status_id(self) -> int:
        """The seeded 'recommended' row — resolved BY KEY so a reseed (which
        changes ids) cannot silently repoint every new recommendation."""
        status_id = await self.session.scalar(
            select(EmployeeRecommendedTrainingStatus.id).where(
                EmployeeRecommendedTrainingStatus.key == RECOMMENDED
            )
        )
        if status_id is None:
            raise await self._resolve_domain_error(
                RecommendedTrainingStatusKeyNotFound(RECOMMENDED)
            )
        return status_id

    async def _assert_status_exists(self, status_id: int) -> None:
        exists = await self.session.scalar(
            select(EmployeeRecommendedTrainingStatus.id).where(
                EmployeeRecommendedTrainingStatus.id == status_id
            )
        )
        if exists is None:
            raise await self._resolve_domain_error(
                RecommendedTrainingStatusNotFound(status_id)
            )

    async def _next_sort_order(self, employee_id: int) -> int:
        rows = (
            await self.session.execute(
                select(EmployeeRecommendedTraining.sort_order).where(
                    EmployeeRecommendedTraining.employee_id == employee_id
                )
            )
        ).all()
        return max((r[0] for r in rows), default=-1) + 1

    # ── reads ────────────────────────────────────────────────────────────────

    async def get_for_employee(
        self, employee_id: int, include_inactive: bool = False
    ) -> EmployeeRecommendedTrainingList:
        """The employee's recommendations, active-only by default.

        `include_inactive` is what the "show all" toggle sends. Inactive rows are
        kept rather than deleted so a stale recommendation stops cluttering the
        list without losing the fact that it was ever made.
        """
        await self.access.assert_can_read(employee_id)

        stmt = select(EmployeeRecommendedTraining).where(
            EmployeeRecommendedTraining.employee_id == employee_id
        )
        if not include_inactive:
            stmt = stmt.where(EmployeeRecommendedTraining.is_active.is_(True))
        stmt = stmt.order_by(
            EmployeeRecommendedTraining.sort_order,
            EmployeeRecommendedTraining.id,
        )
        rows = (await self.session.execute(stmt)).scalars().all()

        return EmployeeRecommendedTrainingList(
            items=[self._to_schema(r) for r in rows],
            permissions=EmployeeRecommendedTrainingPermissions(
                can_write=await self.access.can_write(
                    employee_id, OperationVerb.MODIFY
                ),
                can_delete=await self.access.can_delete(employee_id),
            ),
        )

    # ── writes ───────────────────────────────────────────────────────────────

    async def create_for_employee(
        self, employee_id: int, payload: EmployeeRecommendedTrainingCreate
    ) -> MutationResponse[RecommendedTrainingSchema]:
        await self.access.assert_can_write(employee_id, OperationVerb.CREATE)

        description = (payload.description or "").strip()
        if not description:
            raise await self._resolve_domain_error(RecommendedTrainingTextRequired())

        status_id = payload.employee_recommended_training_status_id
        if status_id is None:
            status_id = await self._default_status_id()
        else:
            await self._assert_status_exists(status_id)

        record = EmployeeRecommendedTraining(
            employee_id=employee_id,
            employee_recommended_training_status_id=status_id,
            description=description,
            is_active=True,
            sort_order=await self._next_sort_order(employee_id),
        )
        self.session.add(record)
        await self.session.commit()
        await self.session.refresh(record)

        detail = await self._resolve_domain_success(RecommendedTrainingCreateSuccess())
        return MutationResponse(detail=detail, data=self._to_schema(record))

    async def update_training(
        self, training_id: int, payload: EmployeeRecommendedTrainingUpdate
    ) -> MutationResponse[RecommendedTrainingSchema]:
        """Edit the description, move the status, or flip is_active.

        All three are the same permission (employee or oversight): the employee
        owning their own progress is the point of the feature. Deleting is what
        stays narrower — see the access module.
        """
        record = await self._get_record(training_id)
        await self.access.assert_can_write(record.employee_id, OperationVerb.MODIFY)

        data = payload.model_dump(exclude_unset=True)
        if "description" in data:
            description = (data["description"] or "").strip()
            if not description:
                raise await self._resolve_domain_error(
                    RecommendedTrainingTextRequired()
                )
            record.description = description
        if "employee_recommended_training_status_id" in data:
            await self._assert_status_exists(
                data["employee_recommended_training_status_id"]
            )
            record.employee_recommended_training_status_id = data[
                "employee_recommended_training_status_id"
            ]
        if "is_active" in data:
            record.is_active = bool(data["is_active"])

        await self.session.commit()
        await self.session.refresh(record)

        detail = await self._resolve_domain_success(RecommendedTrainingUpdateSuccess())
        return MutationResponse(detail=detail, data=self._to_schema(record))

    async def delete_training(self, training_id: int) -> None:
        record = await self._get_record(training_id)
        await self.access.assert_can_delete(record.employee_id)
        await self.session.delete(record)
        await self.session.commit()

    async def reorder_for_employee(
        self, employee_id: int, ordered_ids: list[int]
    ) -> MutationResponse[None]:
        """Renumber sort_order 0,1,2… from the given order. Ids that do not
        belong to this employee are ignored rather than trusted."""
        await self.access.assert_can_write(employee_id, OperationVerb.MODIFY)

        rows = {
            r.id: r
            for r in (
                await self.session.execute(
                    select(EmployeeRecommendedTraining).where(
                        EmployeeRecommendedTraining.employee_id == employee_id
                    )
                )
            )
            .scalars()
            .all()
        }
        position = 0
        for training_id in ordered_ids:
            row = rows.pop(training_id, None)
            if row is None:
                continue
            row.sort_order = position
            position += 1
        # Anything the client did not mention keeps its relative order at the end.
        for row in sorted(rows.values(), key=lambda r: (r.sort_order, r.id)):
            row.sort_order = position
            position += 1

        await self.session.commit()
        detail = await self._resolve_domain_success(RecommendedTrainingUpdateSuccess())
        return MutationResponse(detail=detail, data=None)
