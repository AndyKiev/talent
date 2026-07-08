"""Business logic for db_table_info — refresh from live DB, merge, reorder."""

import json
from pathlib import Path

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import text

from backend.api_v1.db_table_info.db_table_info_repository import (
    DbTableInfoRepository,
)
from backend.api_v1.db_table_info.db_table_info_schema import (
    BackupResult,
    ColumnInfo,
    DbTableInfo,
    DbTableInfoUpdate,
    FkRef,
    TableStats,
    TableDataFile,
)
from backend.api_v1.db_table_info.db_table_info_messages import (
    DbTableInfoNotFound,
)
from backend.database.db_helper import db_helper

# Manifest written by the backup dump (backend/utils/table_data/restore_manifest.json).
_MANIFEST_PATH = (
    Path(__file__).resolve().parents[2]
    / "utils"
    / "table_data"
    / "restore_manifest.json"
)


def _quote_ident(name: str) -> str:
    """Quote a PostgreSQL identifier safely (doubles embedded quotes)."""
    return '"' + name.replace('"', '""') + '"'


def _serialize_cell(value: object) -> object:
    """Convert DB-returned values to JSON-serializable primitives."""
    if value is None:
        return None
    if isinstance(value, (int, float, str, bool)):
        return value
    # datetime, UUID, Decimal, etc. → str
    return str(value)


class DbTableInfoService:
    """Orchestrates db_table_info operations.

    No inheritance from BaseService — this is a file-backed essence,
    not a SQLAlchemy one.  Dependencies (session, user) are passed
    explicitly where needed.
    """

    def __init__(self, repository: DbTableInfoRepository) -> None:
        self.repository = repository

    # ── read ───────────────────────────────────────────────────────────────

    async def get_all(self) -> TableDataFile:
        """Return all stored table info, sorted by sort_order then table_name."""
        data = self.repository.load_all()
        data.tables.sort(key=lambda t: (t.sort_order, t.table_name))
        self._stamp_restore_counts(data.tables)
        return data

    # ── backup row counts (from the local dump manifest) ───────────────────

    @staticmethod
    def _load_restore_counts() -> dict[str, int]:
        """Read per-table row counts from the latest backup manifest.

        Returns an empty dict if no backup has been made yet (fresh clone).
        """
        if not _MANIFEST_PATH.exists():
            return {}
        try:
            raw = json.loads(_MANIFEST_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
        counts = raw.get("row_counts", {})
        return {k: int(v) for k, v in counts.items()} if isinstance(counts, dict) else {}

    def _stamp_restore_counts(self, tables: list[DbTableInfo]) -> None:
        """Set ``restore_row_count`` on each record from the backup manifest.

        Display-only: always overwrites, never persisted (the manifest is the
        source of truth and is read fresh on every request).
        """
        counts = self._load_restore_counts()
        for t in tables:
            t.restore_row_count = counts.get(t.table_name, 0)

    async def backup(self) -> BackupResult:
        """Dump every table to the local backup files + manifest.

        The dump is synchronous (reflection + sync engine), so it runs off the
        event loop. The file always wins on a later restore.
        """
        # Imported lazily to avoid any import-time cost / circularity at startup.
        from backend.utils.table_data.dump_table_data import dump_to_files

        manifest = await run_in_threadpool(dump_to_files)
        return BackupResult(
            generated_at=manifest["generated_at"],
            total_rows=manifest["total_rows"],
            table_count=manifest["table_count"],
            files=manifest["files"],
        )

    # ── single-record update (description / sort_order) ────────────────────

    async def update(
        self, table_name: str, update_in: DbTableInfoUpdate
    ) -> DbTableInfo:
        record = self.repository.get_by_table_name(table_name)
        if record is None:
            # Create a minimal record so the user can set a description
            # without having clicked Refresh first.
            record = DbTableInfo(table_name=table_name)

        changed = False
        if update_in.description_ru is not None:
            record.description_ru = update_in.description_ru
            changed = True
        if update_in.sort_order is not None:
            record.sort_order = update_in.sort_order
            changed = True
        if update_in.sample_limit is not None:
            record.sample_limit = max(1, min(update_in.sample_limit, 1000))
            changed = True

        if changed:
            self.repository.upsert(record)

        return record

    # ── column preferences ──────────────────────────────────────────────

    def get_column_prefs(self) -> list["ColumnPref"]:
        from backend.api_v1.db_table_info.db_table_info_schema import ColumnPref
        data = self.repository.load_all()
        return data.column_prefs

    def save_column_prefs(self, prefs: list["ColumnPref"]) -> list["ColumnPref"]:
        from backend.api_v1.db_table_info.db_table_info_schema import ColumnPref
        data = self.repository.load_all()
        data.column_prefs = prefs
        self.repository.save_all(data)
        return data.column_prefs

    # ── auto-describe ────────────────────────────────────────────────────

    # Heuristic mapping: table_name → Russian description.
    _DESCRIPTIONS: dict[str, str] = {
        "langs": "Языки интерфейса",
        "msgs": "Сообщения переводов",
        "msg_keys": "Ключи сообщений",
        "jobs": "Должности",
        "employees": "Сотрудники",
        "user_groups": "Группы пользователей",
        "user_group_types": "Типы групп пользователей",
        "operations": "Операции (действия в системе)",
        "employee_statuses": "Статусы сотрудников",
        "employee_user_group_links": "Связи сотрудник–группа пользователей",
        "employee_current_levels": "Текущие грейды сотрудников",
        "employee_personal_data": "Персональные данные сотрудников",
        "job_user_group_links": "Связи должность–группа пользователей",
        "operation_user_group_links": "Связи операция–группа пользователей",
        "departments": "Департаменты / подразделения",
        "department_types": "Типы департаментов",
        "department_categories": "Категории департаментов",
        "talent_status_period_links": "Связи статус–период талантов",
        "talent_statuses": "Статусы талантов",
        "talent_periods": "Периоды оценки талантов",
        "employee_departments": "Основной департамент сотрудника",
        "menus": "Пункты главного меню",
        "employee_responsibility_departments": "Департаменты ответственности сотрудника",
        "talent_audit_statuses": "Статусы аудита талантов",
        "talent_audits": "Аудиты талантов",
        "talent_audit_job_statuses": "Статусы целевых должностей аудита",
        "talent_audit_jobs": "Целевые должности в аудите талантов",
        "talent_audit_interview_statuses": "Статусы интервью аудита талантов",
        "talent_audit_interviews": "Интервью аудита талантов",
        "talent_audit_interview_jobs": "Должности в интервью аудита",
        "employee_event_direction_types": "Типы направлений кадровых событий",
        "employee_event_types": "Типы кадровых событий",
        "employee_event_type_directions": "Связи тип–направление кадровых событий",
        "employee_event_statuses": "Статусы кадровых событий",
        "employee_events": "Кадровые события сотрудников",
        "employee_event_changes": "Изменения в кадровых событиях",
        "employee_event_change_departments": "Департаменты, изменённые в событиях",
        "department_type_parental_links": "Родительские связи типов департаментов",
        "department_type_job_links": "Связи тип департамента–должность",
        "essences": "Сутности системы (для ACL)",
        "operation_essence_links": "Связи операция–сущность",
        "user_group_operation_essence_links": "Права групп на сущности",
        "essence_sets": "Наборы сущностей",
        "essence_set_members": "Члены наборов сущностей",
        "operation_essence_set_links": "Связи операция–набор сущностей",
        "user_group_operation_essence_set_links": "Права групп на наборы сущностей",
        "job_group_types": "Типы групп должностей",
        "job_groups": "Группы должностей",
        "job_job_group_links": "Связи должность–группа должностей",
        "job_process_role_links": "Связи должность–роль процесса",
        "job_responsibility_category_links": "Категории ответственности должностей",
        "plan_session_statuses": "Статусы сессий планирования",
        "plan_sessions": "Сессии планирования преемственности",
        "plan_category_defaults": "Категории планирования по умолчанию",
        "plan_session_categories": "Категории сессии планирования",
        "plan_scope_defaults": "Области охвата планирования по умолчанию",
        "plan_scopes": "Области охвата планирования",
        "review_dimensions": "Измерения оценки People Review",
        "review_dimension_criteria": "Критерии измерений оценки",
        "review_sessions": "Сессии оценки People Review",
        "review_session_criteria": "Критерии, привязанные к сессии оценки",
        "review_session_levels": "Уровни оценки в сессии",
        "review_session_level_requirements": "Требования к уровням оценки",
        "review_session_employees": "Сотрудники, участвующие в сессии оценки",
        "review_session_employee_evaluations": "Оценки сотрудников в сессии",
        "review_session_employee_criterion_scores": "Баллы сотрудников по критериям",
        "review_session_employee_comments": "Комментарии к оценкам сотрудников",
        "review_levels": "Уровни компетенций (грейды)",
        "review_level_requirements": "Требования к уровням компетенций",
        "review_session_employee_levels": "Привязка сотрудников к уровням в сессии",
        "review_session_employee_level_answers": "Ответы по уровням компетенций",
        "language_levels": "Уровни владения языком",
        "employee_language_profiles": "Языковые профили (уровень персоны)",
        "employee_languages": "Конкретные языки персоны",
        "education_degrees": "Учёные степени / уровни образования",
        "employee_educations": "Образование сотрудников",
        "employee_children": "Дети сотрудников",
        "employee_photos": "Фотографии сотрудников",
        "processes": "Бизнес-процессы",
        "process_roles": "Роли в бизнес-процессах",
        "process_role_holders": "Держатели ролей процессов",
        "process_role_holder_employee_links": "Связи держатель роли–сотрудник",
        "process_role_holder_department_links": "Связи держатель роли–департамент",
        "process_role_active_contexts": "Активные контексты ролей процессов",
        "setting_value_types": "Типы значений настроек",
        "app_settings": "Настройки приложения (ключ–значение)",
        "regions": "Регионы",
        "department_region_links": "Связи департамент–регион",
        "change_sessions": "Сессии аудита изменений",
        "change_logs": "Записи лога изменений",
        "hrm_scopes": "Области HRM-доступа",
        "permission_manifests": "Манифесты разрешений",
    }

    async def auto_describe(self) -> int:
        """Fill empty description_ru fields with heuristic Russian names."""
        data = self.repository.load_all()
        count = 0
        for t in data.tables:
            if not t.description_ru.strip():
                desc = self._DESCRIPTIONS.get(t.table_name, "")
                if desc:
                    t.description_ru = desc
                    count += 1
        if count:
            self.repository.save_all(data)
        return count

    # ── row CRUD (dev tool — direct table mutation) ──────────────────────

    @staticmethod
    def _coerce_value(val: object) -> object:
        """Try to convert a string value to int/float/datetime for asyncpg."""
        if not isinstance(val, str):
            return val
        # int
        try:
            return int(val)
        except ValueError:
            pass
        # float
        try:
            return float(val)
        except ValueError:
            pass
        # datetime (try common formats)
        from datetime import datetime as dt
        for fmt in (
            "%Y-%m-%d %H:%M:%S.%f%z",
            "%Y-%m-%d %H:%M:%S%z",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f%z",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d",
        ):
            try:
                return dt.strptime(val, fmt)
            except ValueError:
                continue
        return val

    async def update_row(
        self, table_name: str, pk: dict[str, object], data: dict[str, object]
    ) -> None:
        """UPDATE table SET ... WHERE pk_col1=val1 AND pk_col2=val2 ..."""
        if not pk or not data:
            raise DbTableInfoNotFound(table_name)

        # Exclude PK columns from the SET clause — they identify the row
        non_pk_cols = [col for col in data.keys() if col not in pk]
        if not non_pk_cols:
            raise DbTableInfoNotFound(table_name)
        set_clause = ", ".join(
            f"{_quote_ident(col)} = :set_{i}"
            for i, col in enumerate(non_pk_cols)
        )
        where_clause = " AND ".join(
            f"{_quote_ident(col)} = :pk_{i}"
            for i, col in enumerate(pk.keys())
        )
        query = text(
            f"UPDATE {_quote_ident(table_name)} SET {set_clause} WHERE {where_clause}"
        )
        params: dict[str, object] = {}
        for i, col in enumerate(non_pk_cols):
            params[f"set_{i}"] = self._coerce_value(data[col])
        for i, val in enumerate(pk.values()):
            params[f"pk_{i}"] = self._coerce_value(val)

        async with db_helper.engine.connect() as conn:
            result = await conn.execute(query, params)
            await conn.commit()
            if result.rowcount == 0:
                raise DbTableInfoNotFound(table_name)

    async def delete_row(self, table_name: str, pk: dict[str, object]) -> None:
        """DELETE FROM table WHERE pk_col1=val1 AND pk_col2=val2 ..."""
        if not pk:
            raise DbTableInfoNotFound(table_name)

        where_clause = " AND ".join(
            f"{_quote_ident(col)} = :pk_{i}"
            for i, col in enumerate(pk.keys())
        )
        query = text(
            f"DELETE FROM {_quote_ident(table_name)} WHERE {where_clause}"
        )
        params: dict[str, object] = {}
        for i, val in enumerate(pk.values()):
            params[f"pk_{i}"] = self._coerce_value(val)

        async with db_helper.engine.connect() as conn:
            result = await conn.execute(query, params)
            await conn.commit()
            if result.rowcount == 0:
                raise DbTableInfoNotFound(table_name)

    # ── live data ────────────────────────────────────────────────────────

    async def fetch_rows(self, table_name: str, limit: int = 30) -> "TableRowsResponse":
        """Run SELECT * FROM table LIMIT x and return column names + rows + metadata."""
        from backend.api_v1.db_table_info.db_table_info_schema import (
            TableRowsResponse,
        )

        limit = max(1, min(limit, 1000))
        async with db_helper.engine.connect() as conn:
            # Get column names
            col_query = text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = :tname "
                "ORDER BY ordinal_position"
            )
            col_rows = await conn.execute(col_query, {"tname": table_name})
            columns = [r[0] for r in col_rows]

            if not columns:
                raise DbTableInfoNotFound(table_name)

            # Column metadata (PK, FK, etc.) from the stored table info
            record = self.repository.get_by_table_name(table_name)
            column_meta = record.columns if record else []

            # Fetch rows
            cols_sql = ", ".join(_quote_ident(c) for c in columns)
            data_query = text(
                f"SELECT {cols_sql} FROM {_quote_ident(table_name)} LIMIT :lim"
            )
            data_rows = await conn.execute(data_query, {"lim": limit})
            rows = [[_serialize_cell(v) for v in row] for row in data_rows]

            # Total count
            cnt_query = text(
                f"SELECT COUNT(*) FROM {_quote_ident(table_name)}"
            )
            total = (await conn.execute(cnt_query)).scalar() or 0

        return TableRowsResponse(
            columns=columns,
            column_meta=column_meta,
            rows=rows,
            total_available=total,
        )

    # ── reorder ────────────────────────────────────────────────────────────

    async def reorder(self, ordered_names: list[str]) -> None:
        """Assign sort_order 0, 10, 20, … based on the supplied name list."""
        data = self.repository.load_all()
        lookup = {t.table_name: t for t in data.tables}

        for idx, name in enumerate(ordered_names):
            if name in lookup:
                lookup[name].sort_order = idx * 10

        data.tables.sort(key=lambda t: t.sort_order)
        self.repository.replace_all(data.tables)

    # ── refresh ────────────────────────────────────────────────────────────

    async def refresh(self) -> TableDataFile:
        """Query live PostgreSQL for tables, columns, row counts, and sizes.

        Strategy
        --------
        1. Read the existing JSON file (so we can shift current→previous).
         2. Query information_schema + pg_total_relation_size + COUNT(*).
        3. For each live table:
           - Preserve description_ru and sort_order from the old record.
           - Shift old current→previous.
           - Store new counts/sizes in current.
        4. Remove records for tables that no longer exist.
        5. Add new tables with empty description_ru.
        6. Persist.
        """
        # 1. Existing data
        old_data = self.repository.load_all()
        old_by_name: dict[str, DbTableInfo] = {
            t.table_name: t for t in old_data.tables
        }

        # 2. Live DB metadata
        live_tables_raw = await self._fetch_live_tables()
        live_column_map = await self._fetch_live_columns(list(live_tables_raw.keys()))


        # 3. Build new records
        new_records: list[DbTableInfo] = []
        for table_name, stats in live_tables_raw.items():
            old = old_by_name.get(table_name)

            # Shift current → previous
            prev = TableStats()
            if old is not None:
                prev = old.current

            columns = live_column_map.get(table_name, [])

            record = DbTableInfo(
                table_name=table_name,
                sort_order=old.sort_order if old else 0,
                description_ru=old.description_ru if old else "",
                sample_limit=old.sample_limit if old else 30,
                columns=columns,
                current=stats,
                previous=prev,
            )
            new_records.append(record)

        # 4. Persist (restore counts are stamped AFTER the write so the derived
        #    value is never saved into db_table_info.json).
        new_records.sort(key=lambda t: (t.sort_order, t.table_name))
        self.repository.replace_all(new_records)
        self._stamp_restore_counts(new_records)

        return TableDataFile(tables=new_records)

    # ── internal helpers ───────────────────────────────────────────────────

    async def _fetch_live_tables(self) -> dict[str, TableStats]:
        """Return {table_name: TableStats} for all user tables in the public schema.

        Row counts use exact SELECT COUNT(*) so they never show stale estimates.
        """
        # 1. Discover table names and disk sizes (one fast query).
        meta_query = text(
            """
            SELECT
                t.table_name,
                pg_total_relation_size(quote_ident(t.table_name))::bigint AS size_bytes,
                pg_size_pretty(
                    pg_total_relation_size(quote_ident(t.table_name))
                ) AS size_pretty
            FROM information_schema.tables t
            WHERE t.table_schema = 'public'
              AND t.table_type = 'BASE TABLE'
              AND t.table_name NOT IN ('alembic_version')
            ORDER BY t.table_name
            """
        )
        result: dict[str, TableStats] = {}
        async with db_helper.engine.connect() as conn:
            meta_rows = await conn.execute(meta_query)
            for row in meta_rows:
                result[row.table_name] = TableStats(
                    row_count=0,
                    size_bytes=row.size_bytes or 0,
                    size_pretty=row.size_pretty or "0 bytes",
                )

            # 2. Exact row counts — one COUNT(*) per table (uses index-only
            #    scans or the visibility map, so it's fast even on large tables).
            for table_name in list(result.keys()):
                # quote_ident protects against SQL injection from table names.
                count_query = text(
                    f"SELECT COUNT(*) AS cnt FROM {_quote_ident(table_name)}"
                )
                count_row = await conn.execute(count_query)
                cnt = count_row.scalar() or 0
                result[table_name].row_count = cnt

        return result

    async def _fetch_live_columns(
        self, table_names: list[str]
    ) -> dict[str, list[ColumnInfo]]:
        """Return {table_name: [ColumnInfo, ...]} using raw SQL (no inspector).

        The SQLAlchemy inspector fails on the sync engine (returns strings
        instead of dicts), so we query information_schema directly.
        """

        result: dict[str, list[ColumnInfo]] = {}

        async with db_helper.engine.connect() as conn:
            # 1. Fetch columns + PK info in one query
            col_query = text(
                """
                SELECT
                    c.table_name,
                    c.column_name,
                    c.data_type,
                    c.is_nullable,
                    c.character_maximum_length,
                    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_pk
                FROM information_schema.columns c
                LEFT JOIN (
                    SELECT ku.table_name, ku.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage ku
                        ON tc.constraint_name = ku.constraint_name
                        AND tc.table_schema = ku.table_schema
                        AND tc.table_name = ku.table_name
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_schema = 'public'
                ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
                WHERE c.table_schema = 'public'
                  AND c.table_name = ANY(:tnames)
                ORDER BY c.table_name, c.ordinal_position
                """
            )
            col_rows = await conn.execute(col_query, {"tnames": table_names})

            # Group by table
            cols_by_table: dict[str, list[dict]] = {}
            for row in col_rows:
                tname = row.table_name
                if tname not in cols_by_table:
                    cols_by_table[tname] = []
                cols_by_table[tname].append({
                    "name": row.column_name,
                    "type": row.data_type,
                    "nullable": row.is_nullable == "YES",
                    "is_pk": row.is_pk,
                    "max_length": row.character_maximum_length,
                })

            # 2. Fetch FK info
            fk_query = text(
                """
                SELECT
                    kcu.table_name,
                    kcu.column_name,
                    ccu.table_name AS ref_table,
                    ccu.column_name AS ref_column
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                    AND tc.table_name = kcu.table_name
                JOIN information_schema.constraint_column_usage ccu
                    ON tc.constraint_name = ccu.constraint_name
                    AND tc.table_schema = ccu.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_schema = 'public'
                  AND tc.table_name = ANY(:tnames)
                """
            )
            fk_rows = await conn.execute(fk_query, {"tnames": table_names})

            # Group FK by table + column
            fk_by_table: dict[str, dict[str, FkRef]] = {}
            for row in fk_rows:
                tname = row.table_name
                if tname not in fk_by_table:
                    fk_by_table[tname] = {}
                fk_by_table[tname][row.column_name] = FkRef(
                    table=row.ref_table,
                    column=row.ref_column,
                )

            # 3. Build ColumnInfo objects
            for tname, raw_cols in cols_by_table.items():
                fks = fk_by_table.get(tname, {})
                cols: list[ColumnInfo] = []
                for c in raw_cols:
                    fk_ref = fks.get(c["name"])
                    cols.append(
                        ColumnInfo(
                            name=c["name"],
                            data_type=c["type"],
                            nullable=c["nullable"],
                            is_primary_key=c["is_pk"],
                            is_foreign_key=fk_ref is not None,
                            fk_ref=fk_ref,
                            max_length=c["max_length"],
                        )
                    )
                result[tname] = cols

            # Any table not in cols_by_table gets empty list
            for tname in table_names:
                if tname not in result:
                    result[tname] = []

        return result
