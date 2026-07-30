"""Report where the codebase disagrees with the project naming convention.

READ-ONLY and always exits 0 -- this is a report, not a gate. It parses the backend
with `ast` (no database, no app import, no side effects) and reads a few frontend files
as text.

    python scripts/naming/check_naming.py                 # everything, grouped by module
    python scripts/naming/check_naming.py --module recruitment
    python scripts/naming/check_naming.py --rules R6,R7   # only these rules
    python scripts/naming/check_naming.py --summary        # counts per rule only

The rules are stated in the `## Naming` section of CLAUDE.md; the full cross-layer
derivation table lives in the /naming skill. Rule numbers here match both.

  R0  no dashes in any file or folder name
  R1  every table starts with a known module stem
  R2  table == the real English plural of snake(ClassName); this also covers R4, since
      the class is what the table is derived FROM
  R3  essence package = singular of the table; every file inside is <package>_<part>.py
  R5  router prefix ends in the table name, verbatim
  R6  FK column = singular of the target table, either in full or minus the stem it
      shares with its own table -- both forms are correct, neither is required
  R7  actor/time columns are created_by / created_at / updated_by / updated_at
  R8  a lookup table's code-bearing identity column is `key`, not `name`
  R9  two constraint names must not COLLIDE after 63-byte truncation. Truncation itself
      is fine -- it is deterministic and 59 existing constraints rely on it
  R10 query key constant is derived from key[0]
  R11 (informational) key[0] is not a table -- a computed endpoint, or a stale key

Findings are grouped so a clean module reads as clean. The pre-existing backlog in other
modules is expected on a first run -- it is a to-do list, not a regression.
"""

from __future__ import annotations

import argparse
import ast
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
API_V1 = REPO / "backend" / "api_v1"
QUERY_KEYS = REPO / "frontend" / "src" / "utils" / "queryKeys.ts"

MAX_IDENTIFIER_LENGTH = 63

# Irregular English plurals the convention accepts (a real plural always beats a
# mechanical one -- `employee_children`, never `employee_childs`). Only what the schema
# actually uses: `person` is deliberately pluralised `persons` here, not `people`.
IRREGULAR_PLURALS = {
    "child": "children",
}

# --- convention configuration ---------------------------------------------------

# R2: legacy singular tables. FROZEN -- an exception, never a precedent. Renaming any of
# these is a migration, so they are recorded rather than reported.
SINGULAR_ALLOWLIST = {
    "change_log",
    "change_session",
    "employee_personal_data",
    "talent_audit",
    "talent_audit_job",
    "talent_audit_interview",
    "talent_audit_interview_job",
    "talent_status_period_link",
}

# R1: the module stems in use. A table's first segment must be one of these (longest
# match wins) or it belongs to no module.
MODULE_STEMS = [
    "review_session_employee",
    "review_session",
    "review_dimension",
    "review_level",
    "employee_event",
    "employee_mission",
    "employee_recommended_training",
    "employee_training",
    "employee_fact",
    "employee_language",
    "recruitment",
    "job_requirement",
    "talent_audit",
    "talent",
    "process_role",
    "process",
    "plan",
    "department",
    "employee",
    "person",
    "job",
    "user_group",
    "operation",
    "essence",
    "training",
    "app_setting",
    "user_setting",
    "setting_value",
    "menu",
    "msg",
    "lang",
    "hrm_scope",
    "access_test",
    "region",
    "education",
    "language_level",
    "sex",
    "marital_status",
    "change",
]

# R1: tables whose lifecycle is owned by another module, so they keep that owner's stem
# even though a different module reads them.
OWNED_BY_OTHER_MODULE = {
    "job_requirement_groups": "jobs",
    "job_requirement_items": "jobs",
}

# R6: sanctioned shorthand -- a row with exactly one status FK may call it `status_id`.
STATUS_SHORTHAND = "status_id"

# R7: the only blessed actor / timestamp column names.
GOOD_ACTOR = {"created_by", "updated_by"}
GOOD_TIME = {"created_at", "updated_at"}
# Names that mean "the actor" but say it differently.
BAD_ACTOR = {
    "author_id": "created_by",
    "changed_by": "created_by",
    "created_by_id": "created_by",
    "updated_by_id": "updated_by",
    "modified_by": "updated_by",
    "changed_at": "created_at",
    "modified_at": "updated_at",
}

# R3: packages that deliberately hold several unrelated models rather than being one
# essence. Their children are not <package>_*.py and that is correct.
CONTAINER_PACKAGES = {
    "table_relationship_links",
    "links",
    "models",
    "base",
}

ESSENCE_FILE_PARTS = {
    "model",
    "schema",
    "repository",
    "service",
    "dependencies",
    "messages",
    "views",
    "errors",
    "success",
    "state_machine",
}


# --- helpers --------------------------------------------------------------------


def camel_to_snake(name: str) -> str:
    """Mirror backend/api_v1/base/models/utils.camel_case_to_snake_case."""
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def pluralize(word: str) -> str:
    """English plural of a snake_case name's last word.

    NOTE the base class default (`snake(cls) + "s"`, base_model.py:20) is only correct
    when the name does not need "es" -- it would yield `recruitment_task_statuss`. Every
    such table therefore overrides __tablename__, and the convention is the real English
    plural, not the naive default.
    """
    if word.endswith("y") and not word.endswith(("ay", "ey", "iy", "oy", "uy")):
        return word[:-1] + "ies"
    if word.endswith(("s", "x", "z", "ch", "sh")):
        return word + "es"
    for singular, plural in IRREGULAR_PLURALS.items():
        if word == singular or word.endswith("_" + singular):
            return word[: len(word) - len(singular)] + plural
    return word + "s"


def singularize(table: str) -> str:
    """Inverse of `pluralize`."""
    if table.endswith("ies"):
        return table[:-3] + "y"
    for suffix in ("ses", "xes", "zes", "ches", "shes"):
        if table.endswith(suffix):
            return table[: -len("es")]
    return table[:-1] if table.endswith("s") else table


def module_stem(table: str) -> str | None:
    for stem in sorted(MODULE_STEMS, key=len, reverse=True):
        if table in {stem, pluralize(stem)} or table.startswith(stem + "_"):
            return stem
    return None


def shared_stem(owner_table: str, target_table: str) -> str:
    """The longest leading snake_case segment run the two tables share."""
    a = owner_table.split("_")
    b = target_table.split("_")
    n = 0
    while n < min(len(a), len(b)) and a[n] == b[n]:
        n += 1
    return "_".join(b[:n])


@dataclass
class Finding:
    rule: str
    module: str
    where: str
    message: str


@dataclass
class Model:
    cls: str
    table: str
    path: Path
    explicit_table: bool
    columns: list[str] = field(default_factory=list)
    # column name -> referred table
    fks: dict[str, str] = field(default_factory=dict)


# --- parsing --------------------------------------------------------------------


def _str_of(node: ast.AST) -> str | None:
    return (
        node.value
        if isinstance(node, ast.Constant) and isinstance(node.value, str)
        else None
    )


def parse_models(path: Path) -> list[Model]:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except (SyntaxError, UnicodeDecodeError):
        return []

    models: list[Model] = []
    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        # a model inherits Base (directly or via a mixin list containing Base)
        base_names = {b.id for b in node.bases if isinstance(b, ast.Name)}
        if "Base" not in base_names:
            continue

        table: str | None = None
        columns: list[str] = []
        fks: dict[str, str] = {}

        for stmt in node.body:
            # __tablename__ = "..."
            if isinstance(stmt, ast.Assign):
                for t in stmt.targets:
                    if isinstance(t, ast.Name) and t.id == "__tablename__":
                        table = _str_of(stmt.value)
            # col: Mapped[...] = mapped_column(...)
            if isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Name):
                name = stmt.target.id
                annotation = ast.unparse(stmt.annotation)
                if not annotation.startswith("Mapped"):
                    continue
                is_rel = isinstance(stmt.value, ast.Call) and (
                    getattr(stmt.value.func, "id", "") == "relationship"
                )
                if is_rel:
                    continue
                columns.append(name)
                for sub in ast.walk(stmt):
                    if (
                        isinstance(sub, ast.Call)
                        and getattr(sub.func, "id", "") == "ForeignKey"
                        and sub.args
                    ):
                        target = _str_of(sub.args[0])
                        if target and "." in target:
                            fks[name] = target.split(".")[0]

        explicit = table is not None
        if table is None:
            table = camel_to_snake(node.name) + "s"
        models.append(Model(node.name, table, path, explicit, columns, fks))
    return models


def parse_router_prefix(path: Path) -> str | None:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except (SyntaxError, UnicodeDecodeError):
        return None
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "APIRouter":
            for kw in node.keywords:
                if kw.arg == "prefix":
                    return _str_of(kw.value)
    return None


# --- rules ----------------------------------------------------------------------


def check_models(models: list[Model], tables: dict[str, Model]) -> list[Finding]:
    out: list[Finding] = []
    for m in models:
        mod = module_stem(m.table) or "(no module)"
        rel = m.path.relative_to(REPO).as_posix()

        # R1 -- stemmed into a module
        if module_stem(m.table) is None:
            out.append(
                Finding(
                    "R1",
                    mod,
                    rel,
                    f"table `{m.table}` starts with no known module stem",
                )
            )

        # R2 / R4 -- plural, and derivable from the class name
        expected = pluralize(camel_to_snake(m.cls))
        if m.table != expected and m.table not in SINGULAR_ALLOWLIST:
            out.append(
                Finding(
                    "R2",
                    mod,
                    rel,
                    f"`{m.table}` != snake({m.cls}) + 's' = `{expected}`",
                )
            )

        # R3 -- package name is the singular of the table, files are prefixed with it
        pkg = m.path.parent.name
        if pkg not in CONTAINER_PACKAGES:
            want_pkg = singularize(m.table)
            if pkg != want_pkg:
                out.append(
                    Finding(
                        "R3",
                        mod,
                        rel,
                        f"package `{pkg}/` should be `{want_pkg}/` (singular of {m.table})",
                    )
                )
            else:
                for f in sorted(m.path.parent.glob("*.py")):
                    if f.name == "__init__.py":
                        continue
                    if not f.name.startswith(pkg + "_"):
                        out.append(
                            Finding(
                                "R3",
                                mod,
                                f.relative_to(REPO).as_posix(),
                                f"file should start with `{pkg}_`",
                            )
                        )

        # R6 -- FK column names
        status_fks = [c for c, t in m.fks.items() if t.endswith("statuses")]
        for col, target in sorted(m.fks.items()):
            if col in GOOD_ACTOR and target == "employees":
                continue  # actor column, governed by R7
            if col == STATUS_SHORTHAND and len(status_fks) == 1:
                continue  # sanctioned shorthand
            # Both the full singular and the stem-dropped short form are correct: the
            # stem may be dropped when the owning table already carries it, but keeping
            # it is never wrong. Only a name that is NEITHER is a finding.
            full = singularize(target) + "_id"
            stem = shared_stem(m.table, target)
            short = full
            if stem and full.startswith(stem + "_"):
                short = full[len(stem) + 1 :]
            if col not in {full, short}:
                want = f"`{short}`" + (f" or `{full}`" if short != full else "")
                out.append(
                    Finding(
                        "R6",
                        mod,
                        rel,
                        f"`{m.table}.{col}` -> {target} should be {want}",
                    )
                )

        # R7 -- actor / timestamp column names
        for col in m.columns:
            if col in BAD_ACTOR:
                out.append(
                    Finding(
                        "R7",
                        mod,
                        rel,
                        f"`{m.table}.{col}` should be `{BAD_ACTOR[col]}`",
                    )
                )

        # R8 -- a lookup's code-bearing identity column
        looks_like_lookup = (
            m.table.endswith(("_statuses", "_types", "_sources", "_categories"))
            and not m.fks
        )
        if looks_like_lookup and "name" in m.columns and "key" not in m.columns:
            out.append(
                Finding(
                    "R8",
                    mod,
                    rel,
                    f"lookup `{m.table}` identifies rows by `name`; the code contract "
                    f"column is `key`",
                )
            )

    # R9 -- constraint-name truncation. Truncation itself is harmless: it is
    # deterministic (name[:55] + "_" + md5(name)[-4:]) and 59 names in the schema
    # already rely on it. What is NOT harmless is two different constraints colliding
    # into the same 63-byte name, so only collisions are reported.
    seen: dict[str, str] = {}
    for m in models:
        for col, target in sorted(m.fks.items()):
            generated = f"fk_{m.table}_{col}_{target}"
            if len(generated) <= MAX_IDENTIFIER_LENGTH:
                continue
            final = (
                generated[: MAX_IDENTIFIER_LENGTH - 8]
                + "_"
                + __import__("hashlib").md5(generated.encode()).hexdigest()[-4:]
            )
            if final in seen and seen[final] != generated:
                out.append(
                    Finding(
                        "R9",
                        module_stem(m.table) or "(no module)",
                        m.path.relative_to(REPO).as_posix(),
                        f"constraint name collides after truncation with "
                        f"`{seen[final]}`: both become `{final}`",
                    )
                )
            seen[final] = generated
    return out


def check_routers(tables: dict[str, Model]) -> list[Finding]:
    out: list[Finding] = []
    by_package = {m.path.parent.name: t for t, m in tables.items()}
    for views in sorted(API_V1.rglob("*_views.py")):
        prefix = parse_router_prefix(views)
        if prefix is None:
            continue
        pkg = views.parent.name
        table = by_package.get(pkg)
        if table is None:
            continue
        rel = views.relative_to(REPO).as_posix()
        mod = module_stem(table) or "(no module)"
        stripped = prefix.lstrip("/")
        # An /admin/ segment is an existing, accepted grouping; compare the tail.
        tail = stripped.split("/")[-1]
        # A table on the frozen singular allowlist may expose the plural route -- the
        # route is the half that is already right (talent_audit -> /talent_audits).
        acceptable = {table}
        if table in SINGULAR_ALLOWLIST:
            acceptable.add(pluralize(table))
        if tail not in acceptable:
            out.append(
                Finding(
                    "R5",
                    mod,
                    rel,
                    f"router prefix `{prefix}` should end in `{table}`",
                )
            )
    return out


def check_query_keys(tables: dict[str, Model]) -> list[Finding]:
    if not QUERY_KEYS.exists():
        return []
    out: list[Finding] = []
    text = QUERY_KEYS.read_text(encoding="utf-8")
    rel = QUERY_KEYS.relative_to(REPO).as_posix()
    pattern = re.compile(
        r"export const ([A-Z0-9_]+)\s*=\s*(?:\([^)]*\)\s*=>\s*)?\[\s*'([a-z0-9_]+)'"
    )
    for const, first in pattern.findall(text):
        mod = module_stem(first) or "(no module)"
        # R10 (hard) -- the constant must be derived from key[0]. A parameterised key may
        # add a discriminator: RECRUITMENT_APPLICATIONS_QK and
        # RECRUITMENT_APPLICATIONS_BY_TASK_QK are both fine.
        stem = first.upper()
        if not (const == f"{stem}_QK" or const.startswith(f"{stem}_")):
            out.append(
                Finding("R10", mod, rel, f"{const} disagrees with its key `{first}`")
            )
        # R11 (informational) -- key[0] is not a table. Legitimate for a computed or
        # aggregate endpoint; also how a key goes stale after a table is renamed. Worth
        # an eyeball, not a fix by default. Filter with --rules.
        elif first not in tables:
            out.append(
                Finding(
                    "R11",
                    mod,
                    rel,
                    f"{const} key `{first}` is not a table "
                    f"(computed endpoint, or stale after a rename?)",
                )
            )
    return out


def check_dashes() -> list[Finding]:
    out: list[Finding] = []
    roots = [API_V1, REPO / "frontend" / "src"]
    for root in roots:
        if not root.exists():
            continue
        for p in root.rglob("*"):
            if "node_modules" in p.parts or "__pycache__" in p.parts:
                continue
            if "-" in p.name and p.suffix in {".py", ".ts", ".tsx", ""}:
                out.append(
                    Finding(
                        "R0",
                        "(all)",
                        p.relative_to(REPO).as_posix(),
                        "dash in a file or folder name",
                    )
                )
    return out


# --- reporting ------------------------------------------------------------------


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--module", help="only this module stem (e.g. recruitment)")
    ap.add_argument("--rules", help="comma-separated rule ids (e.g. R6,R7)")
    ap.add_argument("--summary", action="store_true", help="counts per rule only")
    args = ap.parse_args()

    models: list[Model] = []
    for p in sorted(API_V1.rglob("*_model.py")):
        if "__pycache__" in p.parts:
            continue
        models.extend(parse_models(p))

    tables: dict[str, Model] = {}
    for m in models:
        tables.setdefault(m.table, m)

    findings = (
        check_models(models, tables)
        + check_routers(tables)
        + check_query_keys(tables)
        + check_dashes()
    )

    if args.rules:
        wanted = {r.strip().upper() for r in args.rules.split(",")}
        findings = [f for f in findings if f.rule in wanted]
    if args.module:
        findings = [f for f in findings if f.module == args.module]

    print(f"Scanned {len(models)} models / {len(tables)} tables in backend/api_v1")
    print(f"Frozen singular allowlist: {len(SINGULAR_ALLOWLIST)} tables (not reported)")
    print()

    if args.summary:
        per_rule: dict[str, int] = defaultdict(int)
        for f in findings:
            per_rule[f.rule] += 1
        for rule in sorted(per_rule):
            print(f"  {rule}  {per_rule[rule]:4d}")
        print(f"\n{len(findings)} findings")
        return

    by_module: dict[str, list[Finding]] = defaultdict(list)
    for f in findings:
        by_module[f.module].append(f)

    all_modules = sorted({module_stem(t) or "(no module)" for t in tables})
    if args.module:
        all_modules = [args.module]

    clean = [m for m in all_modules if not by_module.get(m)]
    if clean:
        print("CLEAN: " + ", ".join(clean))
        print()

    for mod in sorted(by_module):
        rows = sorted(by_module[mod], key=lambda f: (f.rule, f.where))
        print(f"=== {mod} ({len(rows)}) " + "=" * max(0, 60 - len(mod)))
        for f in rows:
            print(f"  {f.rule}  {f.where}")
            print(f"      {f.message}")
        print()

    print(f"{len(findings)} findings across {len(by_module)} modules.")
    print("Not a gate -- other modules' findings are the backlog, not a regression.")


if __name__ == "__main__":
    main()
