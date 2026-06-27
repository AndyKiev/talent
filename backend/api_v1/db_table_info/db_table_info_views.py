from fastapi import APIRouter, Depends
from typing import Annotated

from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.db_table_info.db_table_info_dependencies import (
    get_db_table_info_service,
)
from backend.api_v1.db_table_info.db_table_info_schema import (
    ColumnPref,
    ColumnPrefsUpdate,
    DbTableInfo,
    DbTableInfoUpdate,
    ReorderRequest,
    RowDeleteRequest,
    RowUpdateRequest,
    TableDataFile,
    TableRowsResponse,
)
from backend.api_v1.db_table_info.db_table_info_service import (
    DbTableInfoService,
)

router = APIRouter(
    prefix="/developer/db_tables",
    tags=["DB Tables"],
)


@router.get("", response_model=TableDataFile)
async def get_db_tables(
    service: Annotated[DbTableInfoService, Depends(get_db_table_info_service)],
) -> TableDataFile:
    """Return all tracked database tables with their stats and metadata."""
    import logging
    _log = logging.getLogger(__name__)
    result = await service.get_all()
    if result.tables:
        t0 = result.tables[0]
        _log.info(
            f"GET db_tables: returning {len(result.tables)} tables, "
            f"first='{t0.table_name}' cols={len(t0.columns)} "
            f"pk={sum(1 for c in t0.columns if c.is_primary_key)} "
            f"fk={sum(1 for c in t0.columns if c.is_foreign_key)}"
        )
    return result


@router.post("/refresh", response_model=TableDataFile)
async def refresh_db_tables(
    service: Annotated[DbTableInfoService, Depends(get_db_table_info_service)],
) -> TableDataFile:
    """Re-scan the live database and update the stored table info.

    - Shifts current counts → previous.
    - Adds newly discovered tables (without description).
    - Removes tables that no longer exist in the database.
    """
    return await service.refresh()


@router.patch(
    "/{table_name}",
    response_model=MutationResponse[DbTableInfo],
)
async def update_db_table(
    table_name: str,
    update_in: DbTableInfoUpdate,
    service: Annotated[DbTableInfoService, Depends(get_db_table_info_service)],
) -> MutationResponse[DbTableInfo]:
    """Update description or sort_order for a single table record."""
    record = await service.update(table_name, update_in)
    return MutationResponse(
        detail=f"Table '{table_name}' updated",
        data=record,
    )


@router.post(
    "/reorder",
    response_model=MutationResponse[TableDataFile],
)
async def reorder_db_tables(
    body: ReorderRequest,
    service: Annotated[DbTableInfoService, Depends(get_db_table_info_service)],
) -> MutationResponse[TableDataFile]:
    """Persist a new table order (receives ordered list of table names)."""
    await service.reorder(body.ordered_table_names)
    data = await service.get_all()
    return MutationResponse(
        detail="Table order updated",
        data=data,
    )


@router.get(
    "/{table_name}/rows",
    response_model=TableRowsResponse,
)
async def get_table_rows(
    table_name: str,
    service: Annotated[DbTableInfoService, Depends(get_db_table_info_service)],
    limit: int = 30,
) -> TableRowsResponse:
    """Return a sample of live rows from a single table (SELECT * LIMIT x)."""
    return await service.fetch_rows(table_name, limit)


@router.get("/_column_prefs", response_model=list[ColumnPref])
async def get_column_prefs(
    service: Annotated[DbTableInfoService, Depends(get_db_table_info_service)],
) -> list[ColumnPref]:
    """Return the current column display preferences."""
    return service.get_column_prefs()


@router.put("/_column_prefs", response_model=list[ColumnPref])
async def save_column_prefs(
    body: ColumnPrefsUpdate,
    service: Annotated[DbTableInfoService, Depends(get_db_table_info_service)],
) -> list[ColumnPref]:
    """Replace all column display preferences."""
    return service.save_column_prefs(body.prefs)


@router.get("/_debug/{table_name}")
async def debug_table_columns(
    table_name: str,
    service: Annotated[DbTableInfoService, Depends(get_db_table_info_service)],
):
    """Return raw inspector output + parsed ColumnInfo for one table."""
    return await service.debug_columns(table_name)


@router.post("/_auto_describe")
async def auto_describe(
    service: Annotated[DbTableInfoService, Depends(get_db_table_info_service)],
):
    """Auto-generate Russian descriptions for all tables."""
    count = await service.auto_describe()
    return {"described": count}


@router.patch("/{table_name}/rows")
async def update_table_row(
    table_name: str,
    body: RowUpdateRequest,
    service: Annotated[DbTableInfoService, Depends(get_db_table_info_service)],
):
    """Update a single row identified by its primary key columns."""
    await service.update_row(table_name, body.pk, body.data)
    return {"ok": True}


@router.delete("/{table_name}/rows")
async def delete_table_row(
    table_name: str,
    body: RowDeleteRequest,
    service: Annotated[DbTableInfoService, Depends(get_db_table_info_service)],
):
    """Delete a single row identified by its primary key columns."""
    await service.delete_row(table_name, body.pk)
    return {"ok": True}
