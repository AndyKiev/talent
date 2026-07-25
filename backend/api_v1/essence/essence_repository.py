# backend/api_v1/essence/essence_repository.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.essence.essence_model import Essence
from backend.api_v1.essence.essence_schema import EssenceCreate, EssenceUpdate


class EssenceRepository(BaseRepository):
    model = Essence  # Set the model class here

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)  # Only pass session

    # ── Read ─────────────────────────────────────────────────────────────────

    async def get_all(self, name: str | None = None) -> list[Essence]:
        stmt = select(Essence).order_by(Essence.name)
        if name:
            stmt = stmt.where(Essence.name.ilike(f"%{name}%"))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, essence_id: int) -> Essence | None:
        return await self.session.get(Essence, essence_id)

    async def get_by_name(self, name: str) -> Essence | None:
        stmt = select(Essence).where(Essence.name == name)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create(self, data: EssenceCreate) -> Essence:
        essence = Essence(**data.model_dump())
        self.session.add(essence)
        await self.session.flush()
        await self.session.refresh(essence)
        return essence

    async def update(self, essence: Essence, data: EssenceUpdate) -> Essence:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(essence, field, value)
        await self.session.flush()
        await self.session.refresh(essence)
        return essence

    async def delete(self, essence: Essence) -> None:
        await self.session.delete(essence)
        await self.session.flush()
