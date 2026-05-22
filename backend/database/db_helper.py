# db_helper.py
from typing import AsyncGenerator, Any, Generator
import asyncio
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncEngine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from backend.config import settings


class DatabaseHelper:
    def __init__(
        self,
        url: str,
        echo: bool = False,
        echo_pool: bool = False,
    ) -> None:
        # Async engine and session factory (existing code)
        self.engine: AsyncEngine = create_async_engine(
            url=url,
            echo=echo,
            echo_pool=echo_pool,
            pool_size=10,
            max_overflow=20,
            pool_timeout=60,
            insertmanyvalues_page_size=1,
        )
        self.session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )

        # NEW: Sync engine and session factory for synchronous operations
        # Convert async URL to sync URL (remove +asyncpg)
        sync_url = url.replace("+asyncpg", "")
        self.sync_engine = create_engine(
            url=sync_url,
            echo=echo,
            echo_pool=echo_pool,
            pool_size=10,
            max_overflow=20,
            pool_timeout=60,
            insertmanyvalues_page_size=1,
        )
        self.sync_session_factory = scoped_session(
            sessionmaker(
                bind=self.sync_engine,
                autoflush=False,
                autocommit=False,
                expire_on_commit=False,
            )
        )

    async def dispose(self) -> None:
        await self.engine.dispose()
        self.sync_engine.dispose()

    async def session_getter(self) -> AsyncGenerator[AsyncSession, None]:
        async with self.session_factory() as session:
            yield session

    # NEW: Synchronous session getter for uploader service
    def get_scoped_session(self) -> scoped_session:
        """Get a synchronous scoped session for uploader service"""
        return self.sync_session_factory


db_helper = DatabaseHelper(
    url=settings.db.active_url,
    echo=settings.db.echo,
    echo_pool=settings.db.echo_pool,
)

# print("settings.db.url", settings.db.url)
# print("settings.db.echo", settings.db.echo)
# print("settings.db.echo_pool", settings.db.echo_pool)
