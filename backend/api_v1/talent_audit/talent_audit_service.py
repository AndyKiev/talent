
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.talent_audit.talent_audit_messages import (
    TalentAuditAlreadyExists,
    TalentAuditCreateSuccess,
    TalentAuditDeleteError,
    TalentAuditDeleteSuccess,
    TalentAuditNotFound,
    TalentAuditTalentPlusDisableSuccess,
    TalentAuditTalentPlusEnableSuccess,
    TalentAuditUpdateSuccess,
)
from backend.api_v1.talent_audit.talent_audit_repository import TalentAuditRepository
from backend.api_v1.talent_audit.talent_audit_schema import (
    TalentAudit as TalentAuditSchema,
)
from backend.api_v1.talent_audit.talent_audit_schema import (
    TalentAuditCreate,
    TalentAuditUpdate,
)


class TalentAuditService(BaseService):
    def __init__(
        self,
        repository: TalentAuditRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ):
        super().__init__(repository, user=user, session=session)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(self, audit_id: int) -> TalentAuditSchema:
        record = await self.repository.get_by_id(audit_id)
        if not record:
            raise await self._resolve_domain_error(TalentAuditNotFound(audit_id))
        return record

    async def get_by_employee_id(self, employee_id: int) -> TalentAuditSchema:
        record = await self.repository.get_by_employee_id(employee_id)
        if not record:
            raise await self._resolve_domain_error(TalentAuditNotFound(employee_id))
        return TalentAuditSchema.model_validate(record)

    async def get_talent_audits(
        self, sort: str | None = None
    ) -> list[TalentAuditSchema]:
        records = await self.get_all(sort_json=sort)
        return [TalentAuditSchema.model_validate(r) for r in records]

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create_talent_audit(
        self, audit_in: TalentAuditCreate
    ) -> MutationResponse[TalentAuditSchema]:
        existing = await self.repository.get_by_employee_id(audit_in.employee_id)
        if existing:
            raise await self._resolve_domain_error(
                TalentAuditAlreadyExists(audit_in.employee_id)
            )
        try:
            user_id = self.user.id if self.user else audit_in.employee_id
            instance = self.repository.model(
                **audit_in.model_dump(),
                created_by=user_id,
            )
            record = await self.repository.create(instance)
            schema = TalentAuditSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                TalentAuditCreateSuccess(schema.employee_id)
            )
            return MutationResponse(detail=detail, data=schema)
        except IntegrityError:
            raise await self._resolve_domain_error(
                TalentAuditAlreadyExists(audit_in.employee_id)
            )

    async def update_talent_audit(
        self, audit_id: int, audit_update: TalentAuditUpdate
    ) -> MutationResponse[TalentAuditSchema]:
        orm_record = await self.get_by_id(audit_id)
        update_data = audit_update.model_dump(exclude_unset=True)
        updated = await self.repository.update(
            instance=orm_record,
            instance_update=update_data,
        )
        schema = TalentAuditSchema.model_validate(updated)
        detail = await self._resolve_domain_success(
            self._pick_update_success(schema.id, update_data)
        )
        return MutationResponse(detail=detail, data=schema)

    async def delete_talent_audit(self, audit_id: int) -> None:
        await self.get_by_id(audit_id)
        await self.delete_by_id(
            audit_id,
            name=str(audit_id),
            delete_error_exc=TalentAuditDeleteError,
            delete_success_exc=TalentAuditDeleteSuccess,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _pick_update_success(audit_id: int, update_data: dict):
        """
        Choose the success object for an update. A lone talent_plus toggle gets
        a dedicated enable/disable message; everything else uses the generic
        update message.
        """
        if set(update_data.keys()) == {"talent_plus"}:
            if update_data["talent_plus"]:
                return TalentAuditTalentPlusEnableSuccess(audit_id)
            return TalentAuditTalentPlusDisableSuccess(audit_id)
        return TalentAuditUpdateSuccess(audit_id)
