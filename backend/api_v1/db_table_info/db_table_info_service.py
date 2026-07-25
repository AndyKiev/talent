"""Business logic for db_table_info — refresh from live DB, merge, reorder."""

import json
from pathlib import Path
from typing import TYPE_CHECKING, Optional

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import text

if TYPE_CHECKING:
    from backend.api_v1.employee.employee_schema import EmployeeSchema

from backend.api_v1.db_table_info.db_table_info_messages import (
    DbTableInfoNotFound,
)
from backend.api_v1.db_table_info.db_table_info_repository import (
    DbTableInfoRepository,
)
from backend.api_v1.db_table_info.db_table_info_schema import (
    BackupResult,
    ColumnInfo,
    DbTableInfo,
    DbTableInfoUpdate,
    FkRef,
    TableDataFile,
    TableStats,
)
from backend.database.db_helper import db_helper

# Manifest written by the backup dump (backend/utils/table_data/restore_manifest.json).
_MANIFEST_PATH = (
    Path(__file__).resolve().parents[2]
    / "utils"
    / "table_data"
    / "restore_manifest.json"
)

# Heuristic mapping: table_name → ENGLISH description. In-code fallback only —
# auto_describe resolves the localized text from the msg_keys/msgs tables
# (dbTableDesc<PascalTableName> keys, seeded by
# backend/seeds/seed_db_table_desc_translations.py, which imports this dict).
TABLE_DESCRIPTIONS_EN: dict[str, str] = {
    "access_test_contexts": "Access-testing contexts (dev test-as-group mode)",
    "app_setting_user_group_links": "App setting–user group links",
    "app_settings": "Application settings (key–value)",
    "application_status_history": "Candidate application status history",
    "candidate_applications": "Candidate applications (kanban cards)",
    "candidate_notes": "Candidate notes",
    "candidate_phones": "Candidate phone numbers",
    "candidate_sources": "Candidate sources",
    "candidates": "Candidates",
    "change_log": "Change log records",
    "change_session": "Change audit sessions",
    "department_categories": "Department categories",
    "department_job_targets": "Department job (headcount) targets",
    "department_region_links": "Department–region links",
    "department_type_job_links": "Department type–job links",
    "department_type_parental_links": "Department type parent links",
    "department_types": "Department types",
    "departments": "Departments / units",
    "education_degrees": "Education degrees / levels",
    "employee_children": "Employees' children",
    "employee_current_levels": "Employees' current levels (grades)",
    "employee_departments": "Employee's main department",
    "employee_educations": "Employees' education records",
    "employee_event_change_departments": "Departments changed in events",
    "employee_event_changes": "Changes within employee events",
    "employee_event_direction_types": "Employee event direction types",
    "employee_event_statuses": "Employee event statuses",
    "employee_event_type_directions": "Event type–direction links",
    "employee_event_types": "Employee event types",
    "employee_events": "Employee career events",
    "employee_language_profiles": "Language profiles (person level)",
    "employee_languages": "Person's individual languages",
    "employee_origins": "Employee origins (human / robot)",
    "employee_personal_data": "Employees' personal data",
    "employee_photos": "Employee photos",
    "employee_responsibility_departments": "Employee's responsibility departments",
    "employee_statuses": "Employee statuses",
    "employee_training_statuses": "Employee training statuses",
    "employee_trainings": "Employees' assigned trainings",
    "employee_user_group_links": "Employee–user group links",
    "employees": "Employees",
    "essence_set_members": "Essence set members",
    "essence_sets": "Essence sets",
    "essences": "System essences (for ACL)",
    "hrm_scopes": "HRM access scopes",
    "interview_feedbacks": "Interview feedback",
    "interview_interviewers": "Interview–interviewer links",
    "interviews": "Candidate interviews",
    "job_categories": "Job categories",
    "job_group_types": "Job group types",
    "job_groups": "Job groups",
    "job_job_category_links": "Job–job category links",
    "job_job_group_links": "Job–job group links",
    "job_process_role_link_department_types": (
        "Department types of job–process role links"
    ),
    "job_process_role_links": "Job–process role links",
    "job_requirement_groups": "Job requirement groups",
    "job_requirement_items": "Job requirement items",
    "job_user_group_links": "Job–user group links",
    "jobs": "Jobs",
    "langs": "Interface languages",
    "language_levels": "Language proficiency levels",
    "marital_statuses": "Marital statuses",
    "menu_user_group_links": "Menu–user group links",
    "menus": "Main menu items",
    "msg_keys": "Message keys",
    "msgs": "Translation messages",
    "operation_essence_links": "Operation–essence links",
    "operation_essence_set_links": "Operation–essence set links",
    "operation_user_group_links": "Operation–user group links",
    "operations": "Operations (system actions)",
    "persons": "Persons (shared employee/candidate identity)",
    "pipeline_statuses": "Recruitment pipeline statuses (kanban columns)",
    "plan_category_defaults": "Default planning categories",
    "plan_scope_defaults": "Default planning scopes",
    "plan_scopes": "Planning scopes",
    "plan_session_categories": "Plan session categories",
    "plan_session_statuses": "Plan session statuses",
    "plan_sessions": "Succession planning sessions",
    "process_role_active_contexts": "Active process role contexts",
    "process_role_holder_department_links": "Role holder–department links",
    "process_role_holder_employee_links": "Role holder–employee links",
    "process_role_holders": "Process role holders",
    "process_roles": "Business process roles",
    "processes": "Business processes",
    "recruitment_dimensions": "Recruitment feedback dimensions",
    "recruitment_task_statuses": "Recruitment task statuses",
    "recruitment_tasks": "Recruitment tasks (vacancies)",
    "regions": "Regions",
    "review_dimension_criterias": "Review dimension criteria",
    "review_dimensions": "People Review dimensions",
    "review_level_requirements": "Competence level requirements",
    "review_levels": "Competence levels (grades)",
    "review_session_criterions": "Criteria bound to a review session",
    "review_session_departments": "Review session–department links",
    "review_session_employee_comments": "Comments on employee reviews",
    "review_session_employee_criterion_scores": "Employee scores per criterion",
    "review_session_employee_evaluations": "Employee evaluations in a session",
    "review_session_employee_level_answers": "Competence level answers (facts)",
    "review_session_employee_levels": "Proposed employee levels in a session",
    "review_session_employees": "Employees participating in a review session",
    "review_session_level_requirements": "Level requirements frozen per session",
    "review_session_levels": "Review levels frozen per session",
    "review_session_settings": "Per-session review settings",
    "review_session_statuses": "Review session statuses",
    "review_sessions": "People Review sessions",
    "setting_value_types": "Setting value types",
    "sexes": "Sexes",
    "talent_audit": "Talent audits",
    "talent_audit_interview": "Talent audit interviews",
    "talent_audit_interview_job": "Jobs in talent audit interviews",
    "talent_audit_interview_statuses": "Talent audit interview statuses",
    "talent_audit_job": "Target jobs in talent audits",
    "talent_audit_job_statuses": "Talent audit target job statuses",
    "talent_audit_statuses": "Talent audit statuses",
    "talent_periods": "Talent assessment periods",
    "talent_status_period_link": "Talent status–period links",
    "talent_statuses": "Talent statuses",
    "training_categories": "Training categories",
    "training_link_types": "Training link types",
    "training_type_job_category_links": "Training type–job category links",
    "training_type_job_links": "Training type–job links",
    "training_types": "Training types",
    "user_group_operation_essence_links": "Group permissions on essences",
    "user_group_operation_essence_set_links": "Group permissions on essence sets",
    "user_group_types": "User group types",
    "user_groups": "User groups",
    "user_settings": "Per-user setting overrides",
}


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

    def __init__(
        self,
        repository: DbTableInfoRepository,
        user: Optional["EmployeeSchema"] = None,
    ) -> None:
        self.repository = repository
        # Current requester — auto_describe localizes to their language.
        self.user = user

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
        data = self.repository.load_all()
        return data.column_prefs

    def save_column_prefs(self, prefs: list["ColumnPref"]) -> list["ColumnPref"]:
        data = self.repository.load_all()
        data.column_prefs = prefs
        self.repository.save_all(data)
        return data.column_prefs

    # ── auto-describe ────────────────────────────────────────────────────

    @staticmethod
    def _desc_msg_key(table_name: str) -> str:
        """dbTableDesc<PascalTableName> — the msg_keys name for one table."""
        return "dbTableDesc" + "".join(p.capitalize() for p in table_name.split("_"))

    async def auto_describe(self) -> int:
        """Fill empty description fields with heuristic table descriptions,
        localized to the requesting user's language via the msg_keys/msgs
        tables (dbTableDesc* keys); TABLE_DESCRIPTIONS_EN is the fallback."""
        from backend.api_v1.msg_pg.msg_translate import LANG_ID_ENG, translate_keys

        data = self.repository.load_all()
        todo = [
            t
            for t in data.tables
            if not t.description_ru.strip() and t.table_name in TABLE_DESCRIPTIONS_EN
        ]
        if not todo:
            return 0

        keys = {
            self._desc_msg_key(t.table_name): TABLE_DESCRIPTIONS_EN[t.table_name]
            for t in todo
        }
        lang_id = self.user.lang_id if self.user else LANG_ID_ENG
        async with db_helper.session_factory() as session:
            resolved = await translate_keys(session, keys, lang_id)

        for t in todo:
            t.description_ru = resolved[self._desc_msg_key(t.table_name)]
        self.repository.save_all(data)
        return len(todo)

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
        non_pk_cols = [col for col in data if col not in pk]
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
