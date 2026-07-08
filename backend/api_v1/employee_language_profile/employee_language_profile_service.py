from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.employee_language.employee_language_model import EmployeeLanguage
from backend.api_v1.employee_language.employee_language_schema import (
    EmployeeLanguageItem,
)
from backend.api_v1.employee_language_profile.employee_language_profile_model import (
    EmployeeLanguageProfile,
)
from backend.api_v1.employee_language_profile.employee_language_profile_repository import (
    EmployeeLanguageProfileRepository,
)
from backend.api_v1.employee_language_profile.employee_language_profile_schema import (
    EmployeeLanguageProfileSchema,
    EmployeeLanguageProfileUpsert,
)
from backend.api_v1.employee_language_profile.employee_language_profile_messages import (
    EmployeeLanguagesSaveSuccess,
)


class EmployeeLanguageProfileService(BaseService):
    def __init__(
        self,
        repository: EmployeeLanguageProfileRepository,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, session=session)

    def _to_schema(self, record) -> EmployeeLanguageProfileSchema:
        schema = EmployeeLanguageProfileSchema.model_validate(record)
        items = []
        for lang in record.languages or []:
            item = EmployeeLanguageItem.model_validate(lang)
            if lang.level:
                item.level_code = lang.level.code
                item.level_hint = lang.level.hint
            items.append(item)
        schema.languages = items
        return schema

    async def _get_or_create_profile(self, employee_id: int) -> EmployeeLanguageProfile:
        existing = await self.repository.get_by_field("employee_id", employee_id)
        if existing:
            return existing
        profile = EmployeeLanguageProfile(employee_id=employee_id)
        return await self.repository.create(profile)

    async def get_by_employee(self, employee_id: int) -> EmployeeLanguageProfileSchema:
        profile = await self._get_or_create_profile(employee_id)
        return self._to_schema(profile)

    async def upsert_languages(
        self, employee_id: int, payload: EmployeeLanguageProfileUpsert
    ) -> MutationResponse[EmployeeLanguageProfileSchema]:
        profile = await self._get_or_create_profile(employee_id)
        existing = {lang.language: lang for lang in profile.languages or []}

        for item in payload.languages:
            current = existing.get(item.language)
            if current is not None:
                current.level_id = item.level_id
            else:
                self.session.add(
                    EmployeeLanguage(
                        profile_id=profile.id,
                        language=item.language,
                        level_id=item.level_id,
                    )
                )

        await self.session.commit()
        # Re-fetch via a fresh query so the selectin loaders chain through
        # languages -> level. session.refresh() does not nest selectin, which
        # would leave lang.level lazy and blow up (MissingGreenlet) in async.
        profile = await self.repository.get_by_field("employee_id", employee_id)

        detail = await self._resolve_domain_success(EmployeeLanguagesSaveSuccess())
        return MutationResponse(detail=detail, data=self._to_schema(profile))
