import sys
import asyncio
from pathlib import Path
from logging.config import fileConfig

# must be before any backend.* imports
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool, create_engine
from alembic import context

from backend.config.config import settings
from backend.api_v1.base.base_model import Base


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use asyncpg URL for async, psycopg2 URL for sync (Windows migration workaround)
_async_url = settings.db.active_url
_sync_url = _async_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")

print("settings.db.active_url", _async_url)
config.set_main_option("sqlalchemy.url", _async_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(_sync_url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            naming_convention=settings.db.naming_convention,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
