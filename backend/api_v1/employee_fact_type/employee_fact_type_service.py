from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee_fact_type.employee_fact_type_messages import (
    EmployeeFactTypeKeyNotFound,
    EmployeeFactTypeNotFound,
)
from backend.api_v1.employee_fact_type.employee_fact_type_model import EmployeeFactType
from backend.api_v1.employee_fact_type.employee_fact_type_repository import (
    EmployeeFactTypeRepository,
)


class EmployeeFactTypeService(BaseService):
    """A tiny READ-ONLY lookup essence — the two rows are seeded.

    No create/update/delete on purpose: the keys ('fact', 'improvement') are a
    code contract. Which list a fact is drawn in, which add-box creates it and
    which side `flip_competence` clears are all resolved by key. Only the
    display name is meant to change, and that is a translation, not a row edit.
    """

    def __init__(
        self,
        repository: EmployeeFactTypeRepository,
        user: EmployeeSchema | None = None,
        session: AsyncSession | None = None,
    ) -> None:
        super().__init__(repository, user=user, session=session)

    async def get_by_id(self, id: int) -> EmployeeFactType:
        record = await self.repository.get_by_id(id)
        if not record:
            raise await self._resolve_domain_error(EmployeeFactTypeNotFound(id))
        return record

    async def get_by_key(self, key: str) -> EmployeeFactType:
        """Resolve a kind BY KEY — the way every piece of business logic must
        reach these rows, so that reseeding (which changes ids) is harmless."""
        record = await self.session.scalar(
            select(EmployeeFactType).where(EmployeeFactType.key == key)
        )
        if not record:
            raise await self._resolve_domain_error(EmployeeFactTypeKeyNotFound(key))
        return record
