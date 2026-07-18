#!/usr/bin/env python3
"""
Model Structure Scanner
Location: talent/backend/utils/model_scanner.py

Scans all *_model.py files under api_v1, parses SQLAlchemy class definitions,
and emits a compact model_structure.txt that can be uploaded to Claude.

Output format per model (example):

=== Employee [table: employees] ===
MIXINS: IntIdPkMixin, TimestampMixin
COLUMNS:
  code          String(10)       NOT NULL  UNIQUE
  name          String(128)      NOT NULL
  email         String(64)       NULL      UNIQUE
  is_active     Boolean          NOT NULL  default=True
  status_id     Integer FK->employee_statuses.id  NOT NULL
  job_id        Integer FK->jobs.id                NOT NULL
  lang_id       Integer FK->langs.id               NOT NULL
RELATIONSHIPS:
  user_groups   -> EmployeeUserGroupLink  (lazy=selectin)
  status        -> EmployeeStatus         (lazy=selectin)
  job           -> Job                    (lazy=selectin)
  lang          -> Lang                   (lazy=selectin)
  departments   -> EmployeeDepartment     (lazy=selectin)
  events        -> EmployeeEvent          (lazy=selectin, FK=employee_id)
  created_events-> EmployeeEvent          (lazy=selectin, FK=created_by)
UNIQUE_CONSTRAINTS: (none)
SOURCE: backend/api_v1/employee/employee_model.py
"""

import ast
import re
import sys
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _unparse(node) -> str:
    """Best-effort stringify an AST node (column type / default)."""
    try:
        return ast.unparse(node)
    except Exception:
        return "<expr>"


def _extract_tablename(class_body: list) -> Optional[str]:
    """Return explicit __tablename__ value if present."""
    for node in class_body:
        if isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name) and t.id == "__tablename__":
                    if isinstance(node.value, ast.Constant):
                        return node.value.value
    return None


def _extract_table_args(class_body: list) -> list[str]:
    """Extract UniqueConstraint names / column lists from __table_args__."""
    constraints = []
    for node in class_body:
        if isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name) and t.id == "__table_args__":
                    # Walk all Call nodes looking for UniqueConstraint(...)
                    for call in ast.walk(node.value):
                        if isinstance(call, ast.Call):
                            func = call.func
                            fname = (
                                func.id
                                if isinstance(func, ast.Name)
                                else (
                                    func.attr if isinstance(func, ast.Attribute) else ""
                                )
                            )
                            if fname == "UniqueConstraint":
                                cols = [
                                    a.value
                                    for a in call.args
                                    if isinstance(a, ast.Constant)
                                    and isinstance(a.value, str)
                                ]
                                name_kw = next(
                                    (
                                        kw.value.value
                                        for kw in call.keywords
                                        if kw.arg == "name"
                                        and isinstance(kw.value, ast.Constant)
                                    ),
                                    None,
                                )
                                if cols:
                                    s = "UNIQUE(" + ", ".join(cols) + ")"
                                    if name_kw:
                                        s += f"  [{name_kw}]"
                                    constraints.append(s)
    return constraints


def _parse_mapped_column(call_node: ast.Call) -> dict:
    """
    Extract column metadata from a mapped_column(...) call node.
    Returns dict with keys: fk, type_, nullable, unique, default, ondelete
    """
    info: dict = {
        "type_": None,
        "fk": None,
        "nullable": None,
        "unique": None,
        "default": None,
        "ondelete": None,
        "server_default": None,
    }

    for arg in call_node.args:
        s = _unparse(arg)
        # ForeignKey("table.col", ...) as positional arg
        if "ForeignKey(" in s:
            fk_match = re.search(r'ForeignKey\(["\']([^"\']+)["\']', s)
            if fk_match:
                info["fk"] = fk_match.group(1)
            od_match = re.search(r'ondelete=["\']([^"\']+)["\']', s)
            if od_match:
                info["ondelete"] = od_match.group(1)
        elif info["type_"] is None:
            info["type_"] = s

    for kw in call_node.keywords:
        val = _unparse(kw.value)
        if kw.arg == "nullable":
            info["nullable"] = val
        elif kw.arg == "unique":
            info["unique"] = val
        elif kw.arg in ("default", "server_default"):
            info[kw.arg] = val
        elif kw.arg == "ondelete":
            od_match = re.search(r'["\']([^"\']+)["\']', val)
            info["ondelete"] = od_match.group(1) if od_match else val

    return info


def _find_mapped_column_call(annotation_node, value_node) -> Optional[dict]:
    """
    Given an AnnAssign's annotation and value, find and parse mapped_column().
    Returns column info dict or None if not a column.
    """
    if value_node is None:
        return None
    for node in ast.walk(value_node):
        if isinstance(node, ast.Call):
            func = node.func
            fname = (
                func.id
                if isinstance(func, ast.Name)
                else func.attr if isinstance(func, ast.Attribute) else ""
            )
            if fname == "mapped_column":
                return _parse_mapped_column(node)
    return None


def _extract_mapped_type(annotation) -> str:
    """
    From Mapped[str] / Mapped[int | None] / Mapped[Optional[int]]
    return the inner type string.
    """
    s = _unparse(annotation)
    # Mapped[X] -> X
    m = re.match(r"Mapped\[(.+)\]", s)
    if m:
        inner = m.group(1).strip()
        # Normalize Optional[X] -> X | None
        inner = re.sub(r"Optional\[(.+)\]", r"\1 | None", inner)
        return inner
    return s


def _is_relationship(value_node) -> Optional[dict]:
    """
    If value_node contains a relationship() call, return its metadata dict.
    """
    if value_node is None:
        return None
    for node in ast.walk(value_node):
        if isinstance(node, ast.Call):
            func = node.func
            fname = (
                func.id
                if isinstance(func, ast.Name)
                else func.attr if isinstance(func, ast.Attribute) else ""
            )
            if fname == "relationship":
                info = {
                    "target": None,
                    "lazy": None,
                    "fk": None,
                    "secondary": None,
                    "back_populates": None,
                }
                # First positional arg = target model string
                if node.args:
                    a = node.args[0]
                    if isinstance(a, ast.Constant):
                        info["target"] = a.value
                for kw in node.keywords:
                    val = _unparse(kw.value)
                    if kw.arg == "lazy":
                        info["lazy"] = val.strip("\"'")
                    elif kw.arg == "foreign_keys":
                        # e.g. "[EmployeeEvent.employee_id]" or "foreign_keys=[...]"
                        fk_names = re.findall(r"\w+\.(\w+)", val)
                        info["fk"] = ", ".join(fk_names) if fk_names else val
                    elif kw.arg == "secondary":
                        info["secondary"] = val.strip("\"'")
                    elif kw.arg == "back_populates":
                        info["back_populates"] = val.strip("\"'")
                return info
    return None


def _camel_to_snake(name: str) -> str:
    s1 = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1).lower() + "s"


def parse_model_file(path: Path) -> list[dict]:
    """
    Parse one *_model.py file and return a list of model dicts.
    Each dict has: class_name, table_name, mixins, columns, relationships, unique_constraints, source
    """
    source = path.read_text(encoding="utf-8")
    try:
        tree = ast.parse(source, filename=str(path))
    except SyntaxError as e:
        print(f"  [WARN] SyntaxError in {path}: {e}", file=sys.stderr)
        return []

    models = []

    for node in ast.walk(tree):
        if not isinstance(node, ast.ClassDef):
            continue

        # Only process classes that inherit from Base (directly or via mixins)
        bases = [_unparse(b) for b in node.bases]
        if not any("Base" in b or "Mixin" in b for b in bases):
            continue

        # Filter out pure mixin definitions (IntIdPkMixin etc.)
        if node.name.endswith("Mixin"):
            continue

        # Determine table name
        explicit_table = _extract_tablename(node.body)
        inferred_table = _camel_to_snake(node.name)
        table_name = explicit_table or inferred_table

        # Mixins
        mixins = [b for b in bases if "Mixin" in b or b in ("Base",)]
        mixins_str = ", ".join(b for b in bases if "Mixin" in b)

        # Unique constraints from __table_args__
        unique_constraints = _extract_table_args(node.body)

        columns = []
        relationships = []

        for stmt in node.body:
            if not isinstance(stmt, ast.AnnAssign):
                continue
            if not isinstance(stmt.target, ast.Name):
                continue

            attr_name = stmt.target.id
            # Skip dunder and private helpers
            if attr_name.startswith("__"):
                continue

            # Check if it's a relationship
            rel_info = _is_relationship(stmt.value)
            if rel_info is not None:
                # Determine target from annotation if not in positional arg
                if rel_info["target"] is None:
                    ann_inner = _extract_mapped_type(stmt.annotation)
                    # list["Foo"] -> Foo
                    m = re.search(r'list\[["\'"]?(\w+)["\']?\]', ann_inner)
                    if m:
                        rel_info["target"] = m.group(1)
                    else:
                        # Mapped["Foo"] or "Foo"
                        m2 = re.search(r'["\'](\w+)["\']', ann_inner)
                        if m2:
                            rel_info["target"] = m2.group(1)
                        else:
                            # plain type name
                            rel_info["target"] = ann_inner.strip("\"'")

                relationships.append(
                    {
                        "name": attr_name,
                        **rel_info,
                    }
                )
                continue

            # Check if it's a mapped_column
            col_info = _find_mapped_column_call(stmt.annotation, stmt.value)
            if col_info is None:
                continue

            # Fill in python type from annotation if column type not found
            if col_info["type_"] is None:
                col_info["type_"] = _extract_mapped_type(stmt.annotation)

            columns.append(
                {
                    "name": attr_name,
                    **col_info,
                }
            )

        models.append(
            {
                "class_name": node.name,
                "table_name": table_name,
                "mixins": mixins_str,
                "columns": columns,
                "relationships": relationships,
                "unique_constraints": unique_constraints,
                "source": str(path),
            }
        )

    return models


def format_column(col: dict) -> str:
    parts = [f"  {col['name']:<20}"]

    # Type
    t = col["type_"] or "?"
    if col["fk"]:
        parts.append(f"FK->{col['fk']}")
        if col["ondelete"]:
            parts.append(f"({col['ondelete']})")
    else:
        parts.append(t)

    # Nullable
    if col["nullable"] == "False":
        parts.append("NOT NULL")
    elif col["nullable"] == "True":
        parts.append("NULL")
    else:
        # guess from python type annotation
        ann = col.get("type_") or ""
        if "None" in ann:
            parts.append("NULL")
        else:
            parts.append("")

    if col.get("unique") == "True":
        parts.append("UNIQUE")
    if col.get("default") is not None:
        parts.append(f"default={col['default']}")
    if col.get("server_default") is not None:
        parts.append(f"server_default={col['server_default']}")

    return "  " + "  ".join(p for p in parts if p).strip()


def format_relationship(rel: dict) -> str:
    target = rel["target"] or "?"
    lazy = rel["lazy"] or "?"
    extras = []
    if rel.get("fk"):
        extras.append(f"FK={rel['fk']}")
    if rel.get("secondary"):
        extras.append(f"secondary={rel['secondary']}")
    if rel.get("back_populates"):
        extras.append(f"back={rel['back_populates']}")
    extra_str = "  " + ", ".join(extras) if extras else ""
    return f"  {rel['name']:<22} -> {target:<35} (lazy={lazy}){extra_str}"


def format_model(m: dict) -> str:
    lines = []
    lines.append(f"=== {m['class_name']} [table: {m['table_name']}] ===")
    if m["mixins"]:
        lines.append(f"MIXINS: {m['mixins']}")

    if m["columns"]:
        lines.append("COLUMNS:")
        for col in m["columns"]:
            lines.append(format_column(col))
    else:
        lines.append("COLUMNS: (none)")

    if m["relationships"]:
        lines.append("RELATIONSHIPS:")
        for rel in m["relationships"]:
            lines.append(format_relationship(rel))
    else:
        lines.append("RELATIONSHIPS: (none)")

    if m["unique_constraints"]:
        lines.append("UNIQUE_CONSTRAINTS:")
        for uc in m["unique_constraints"]:
            lines.append(f"  {uc}")

    # Shorten source path to relative
    src = m["source"]
    for marker in ["backend/api_v1", "api_v1"]:
        idx = src.find(marker)
        if idx != -1:
            src = src[idx:]
            break
    lines.append(f"SOURCE: {src}")
    lines.append("")
    return "\n".join(lines)


def scan_models(api_v1_root: str, output_file: str) -> None:
    root = Path(api_v1_root).resolve()
    if not root.exists():
        print(f"ERROR: path not found: {root}", file=sys.stderr)
        sys.exit(1)

    model_files = sorted(root.rglob("*_model.py"))
    print(f"Found {len(model_files)} model files under {root}")

    all_models = []
    for mf in model_files:
        # Skip base models and oracle models
        if mf.name in ("base_model.py", "base_model_oracle.py"):
            continue
        parsed = parse_model_file(mf)
        all_models.extend(parsed)
        if parsed:
            print(
                f"  [OK] {mf.relative_to(root.parent)} — {len(parsed)} model(s): {', '.join(m['class_name'] for m in parsed)}"
            )
        else:
            print(f"  ~ {mf.relative_to(root.parent)} — (skipped / no Base subclasses)")

    out = Path(output_file)
    out.parent.mkdir(parents=True, exist_ok=True)

    header = (
        "# model_structure.txt — auto-generated by model_scanner.py\n"
        f"# Models found: {len(all_models)}\n"
        f"# Source root:  {root}\n"
        "#\n"
        "# Column format:\n"
        "#   name   type/FK   nullable   [UNIQUE]   [default=...]\n"
        "# Relationship format:\n"
        "#   name -> TargetClass (lazy=...) [FK=col] [secondary=table]\n"
        "#\n\n"
    )

    with open(out, "w", encoding="utf-8") as f:
        f.write(header)
        for m in all_models:
            f.write(format_model(m))

    print(f"\n[OK] model_structure.txt written → {out}  ({len(all_models)} models)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nUsage: python model_scanner.py <path/to/api_v1> [output_file]")
        print("       python model_scanner.py <path/to/api_v1>")
        print("       # output defaults to ./model_structure.txt")
        sys.exit(0)

    api_v1_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else "model_structure.txt"
    scan_models(api_v1_path, out_path)
