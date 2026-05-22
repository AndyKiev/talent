#!/usr/bin/env python3
"""
Message Key Audit Utility
Location: talent/backend/utils/msg_key_backend_audit.py

Scans all *_errors.py and *_success.py files under api_v1/ for:
  - message_key = "..."         (the i18n key)
  - self.template_vars = {...}  (variable names needed for the message)

Then queries the database msg_keys table and reports keys present in code
but missing from the database.

When missing keys are found, always writes msg_key_backend_translation_prompt.md
next to this script — a ready-to-paste prompt for an LLM to generate the
full ukr/eng translation JSON.

Usage (run from project root or backend/):
    python utils/msg_key_backend_audit.py
    python utils/msg_key_backend_audit.py --no-db          # code scan only, still writes prompt file
    python utils/msg_key_backend_audit.py --json-stub       # also print JSON stub to console
    python utils/msg_key_backend_audit.py --backend-root /home/andry/Projects/talent/backend
"""

import ast
import asyncio
import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import NamedTuple
from datetime import datetime


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

class FoundKey(NamedTuple):
    key: str             # e.g. "userGroupTypeNotFound"
    class_name: str      # e.g. "UserGroupTypeNotFound"
    template_vars: list  # e.g. ["typeId"]  — empty if no template_vars
    fallback: str        # reconstructed English fallback string
    file: Path


# ---------------------------------------------------------------------------
# AST helpers
# ---------------------------------------------------------------------------

def _extract_template_vars(init_body):
    """
    Find `self.template_vars = { ... }` in __init__ body and return the
    string dict keys in declaration order.
    Returns [] if not present (key needs no interpolation variables).
    """
    for stmt in init_body:
        if not isinstance(stmt, ast.Assign):
            continue
        if len(stmt.targets) != 1:
            continue
        target = stmt.targets[0]
        if not (
            isinstance(target, ast.Attribute)
            and isinstance(target.value, ast.Name)
            and target.value.id == "self"
            and target.attr == "template_vars"
        ):
            continue
        if not isinstance(stmt.value, ast.Dict):
            continue
        return [
            k.value
            for k in stmt.value.keys
            if isinstance(k, ast.Constant) and isinstance(k.value, str)
        ]
    return []


def _node_to_str(node):
    """Recursively convert a string-producing AST node to a plain string."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.JoinedStr):  # f-string
        parts = []
        for n in node.values:
            if isinstance(n, ast.Constant):
                parts.append(str(n.value))
            elif isinstance(n, ast.FormattedValue):
                parts.append(
                    "{" + n.value.id + "}" if isinstance(n.value, ast.Name) else "{...}"
                )
        return "".join(parts)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        return _node_to_str(node.left) + _node_to_str(node.right)
    return "{...}"


def _extract_fallback(init_body):
    """Find `self.fallback = ...` and return a reconstructed string."""
    for stmt in init_body:
        if not isinstance(stmt, ast.Assign):
            continue
        if len(stmt.targets) != 1:
            continue
        target = stmt.targets[0]
        if not (
            isinstance(target, ast.Attribute)
            and isinstance(target.value, ast.Name)
            and target.value.id == "self"
            and target.attr == "fallback"
        ):
            continue
        return _node_to_str(stmt.value)
    return ""


def _find_init(class_node):
    for node in class_node.body:
        if isinstance(node, ast.FunctionDef) and node.name == "__init__":
            return node.body
    return None


def _extract_message_keys_from_file(path):
    """Parse one file via AST and return all FoundKey entries. No imports executed."""
    try:
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(path))
    except SyntaxError as exc:
        print("  [WARN] SyntaxError in {}: {}".format(path, exc), file=sys.stderr)
        return []

    found = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.ClassDef):
            continue
        message_key = None
        for stmt in node.body:
            if (
                isinstance(stmt, ast.Assign)
                and len(stmt.targets) == 1
                and isinstance(stmt.targets[0], ast.Name)
                and stmt.targets[0].id == "message_key"
                and isinstance(stmt.value, ast.Constant)
                and isinstance(stmt.value.value, str)
            ):
                message_key = stmt.value.value
                break
        if message_key is None:
            continue
        init_body = _find_init(node)
        template_vars = _extract_template_vars(init_body) if init_body else []
        fallback = _extract_fallback(init_body) if init_body else ""
        found.append(FoundKey(
            key=message_key,
            class_name=node.name,
            template_vars=template_vars,
            fallback=fallback,
            file=path,
        ))
    return found


# ---------------------------------------------------------------------------
# Step 1 - scan source files
# ---------------------------------------------------------------------------

def scan_code_keys(api_v1_root):
    targets = (
        sorted(api_v1_root.rglob("*_errors.py"))
        + sorted(api_v1_root.rglob("*_success.py"))
    )
    if not targets:
        print(
            "[WARN] No *_errors.py / *_success.py files found under {}".format(api_v1_root),
            file=sys.stderr,
        )
    all_keys = []
    for path in targets:
        all_keys.extend(_extract_message_keys_from_file(path))
    return all_keys


# ---------------------------------------------------------------------------
# Step 2 - query the database
# ---------------------------------------------------------------------------

async def fetch_db_keys(backend_root):
    from sqlalchemy import text
    from backend.database.db_helper import db_helper  # type: ignore

    async with db_helper.engine.connect() as conn:
        result = await conn.execute(text("SELECT name FROM msg_keys"))
        rows = result.fetchall()
    return {row[0] for row in rows}


# ---------------------------------------------------------------------------
# Step 3 - build JSON stub (for --json-stub console output)
# ---------------------------------------------------------------------------

def build_json_stub(missing_keys):
    """
    Returns a dict ready for json.dumps with ${varName} placeholders so you
    can see what each translation entry needs to interpolate.
    """
    stub = {}
    for fk in missing_keys:
        placeholder = (
            " ".join("${" + v + "}" for v in fk.template_vars)
            if fk.template_vars else ""
        )
        stub[fk.key] = {"ukr": placeholder, "eng": placeholder}
    return stub


# ---------------------------------------------------------------------------
# Step 4 - write translation prompt file
# ---------------------------------------------------------------------------

def build_translation_prompt(missing_keys):
    """
    Build a Markdown prompt document describing every missing key with enough
    context for an LLM to produce correct ukr + eng translations.
    """
    lines = []
    lines.append("# Translation Prompt — Missing Message Keys")
    lines.append("")
    lines.append(
        "Generated: {}".format(datetime.now().strftime("%Y-%m-%d %H:%M"))
    )
    lines.append("Missing keys: {}".format(len(missing_keys)))
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Task")
    lines.append("")
    lines.append(
        "Below is a list of i18n message keys that exist in the backend code "
        "but are not yet seeded in the database. For each key, produce a JSON "
        "object with two fields: `ukr` (Ukrainian) and `eng` (English)."
    )
    lines.append("")
    lines.append("### Rules")
    lines.append("")
    lines.append(
        "- Interpolation variables are written as `${varName}` — keep them "
        "verbatim in both translations."
    )
    lines.append(
        "- The English fallback string shown under each key is the exact "
        "wording already used in the code. Use it as the `eng` value, but convert "
        "`{variable}` to `${variable}`. Adjust grammar/capitalisation only if clearly wrong."
    )
    lines.append(
        "- For `ukr`, produce a natural Ukrainian translation that mirrors the "
        "English meaning and keeps all `${varName}` placeholders in the same "
        "logical position."
    )
    lines.append(
        "- verify twice not to forget to use $ in front of curly braces like `${variable}`."
    )
    lines.append(
        "- Keys with no variables get plain strings with no placeholders."
    )
    lines.append(
        "- Return **only** a single valid JSON object — no markdown fences, "
        "no commentary, no trailing commas."
    )
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Keys to translate")
    lines.append("")

    for fk in missing_keys:
        lines.append("### `{}`".format(fk.key))
        if fk.template_vars:
            lines.append(
                "- **Variables:** {}".format(
                    ", ".join("`${" + v + "}`" for v in fk.template_vars)
                )
            )
        else:
            lines.append("- **Variables:** none")
        if fk.fallback:
            # Convert {var} to ${var} in the displayed fallback
            converted_fallback = fk.fallback
            for var in fk.template_vars:
                converted_fallback = converted_fallback.replace("{" + var + "}", "${" + var + "}")
            lines.append("- **English fallback:** {}".format(converted_fallback))
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## Expected output format")
    lines.append("")
    lines.append("```json")
    lines.append("{")

    example_lines = []
    for fk in missing_keys:
        # Build the eng value with ${varName} placeholders
        eng_val = fk.fallback if fk.fallback else ""
        for var in fk.template_vars:
            eng_val = eng_val.replace("{" + var + "}", "${" + var + "}")

        example_lines.append(
            '  "{}": {{\n    "ukr": "<Ukrainian translation>",\n    "eng": "{}"\n  }}'.format(
                fk.key, eng_val
            )
        )
    lines.append(",\n".join(example_lines))
    lines.append("}")
    lines.append("```")
    lines.append("")

    return "\n".join(lines)


def write_prompt_file(missing_keys, script_dir):
    """Write the translation prompt markdown next to the script."""
    prompt_path = script_dir / "msg_key_backend_translation_prompt.md"
    content = build_translation_prompt(missing_keys)
    prompt_path.write_text(content, encoding="utf-8")
    return prompt_path


# ---------------------------------------------------------------------------
# Step 5 - report
# ---------------------------------------------------------------------------

def _relative(path, base):
    try:
        return str(path.relative_to(base))
    except ValueError:
        return str(path)


def report(code_keys, db_keys, backend_root, emit_json_stub, script_dir):
    """Print findings and write prompt file. Returns number of missing keys."""
    unique_code_keys = {fk.key for fk in code_keys}

    by_key = {}
    for fk in code_keys:
        by_key.setdefault(fk.key, fk)

    print("\n" + "=" * 68)
    print("  Message Key Audit")
    print("=" * 68)

    # -- keys found in code --------------------------------------------------
    print("\n[CODE]  {} declaration(s) across {} file(s):\n".format(
        len(code_keys), len({fk.file for fk in code_keys})
    ))

    by_file = defaultdict(list)
    for fk in sorted(code_keys, key=lambda x: (str(x.file), x.class_name)):
        by_file[fk.file].append(fk)

    for path, entries in sorted(by_file.items(), key=lambda kv: str(kv[0])):
        print("  {}".format(_relative(path, backend_root)))
        for e in entries:
            vars_str = (
                ", ".join("${" + v + "}" for v in e.template_vars)
                if e.template_vars else "-"
            )
            print("    {:<45}  \"{}\"   [{}]".format(e.class_name, e.key, vars_str))

    # -- DB comparison -------------------------------------------------------
    if db_keys is None:
        print("\n[DB]   Skipped (--no-db).\n")
        # Still compute missing vs all code keys so we can write the prompt
        missing_found = sorted(code_keys, key=lambda x: x.key)
    else:
        print("\n[DB]   {} key(s) currently in msg_keys table.".format(len(db_keys)))
        missing_found = [by_key[k] for k in sorted(unique_code_keys - db_keys)]

    if db_keys is not None and not missing_found:
        print("\n  All code message keys are present in the database.\n")
        return 0

    # -- missing (code -> DB) ------------------------------------------------
    if db_keys is not None:
        print("\n  {} key(s) in CODE but MISSING from database:\n".format(len(missing_found)))
        for fk in missing_found:
            vars_str = (
                "  vars: " + ", ".join("${" + v + "}" for v in fk.template_vars)
                if fk.template_vars else "  (no variables)"
            )
            print("    \"{}\"{}".format(fk.key, vars_str))
            if fk.fallback:
                print("         fallback : {}".format(fk.fallback))
            print("         class    : {}  ({})".format(
                fk.class_name, _relative(fk.file, backend_root)
            ))

    # -- JSON stub (optional console output) ---------------------------------
    if emit_json_stub and missing_found:
        stub = build_json_stub(missing_found)
        print("\n" + "-" * 68)
        print("  JSON stub (placeholders only — fill in real translations):")
        print("-" * 68 + "\n")
        print(json.dumps(stub, ensure_ascii=False, indent=2))
        print()

    # -- always write the prompt file ----------------------------------------
    if missing_found:
        prompt_path = write_prompt_file(missing_found, script_dir)
        print("\n  Translation prompt written to:")
        print("  {}\n".format(prompt_path))

    return len(missing_found)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _resolve_backend_root(arg):
    if arg:
        p = Path(arg).resolve()
        if not p.is_dir():
            raise SystemExit("[ERROR] --backend-root does not exist: {}".format(p))
        return p

    cwd = Path.cwd()
    if (cwd / "api_v1").is_dir():
        return cwd

    script_dir = Path(__file__).resolve().parent   # backend/utils/
    candidate  = script_dir.parent                  # backend/
    if (candidate / "api_v1").is_dir():
        return candidate

    raise SystemExit(
        "[ERROR] Cannot locate backend root (expected api_v1/ subdirectory).\n"
        "        Run from backend/ or pass --backend-root."
    )


async def _async_main(backend_root, skip_db, emit_json_stub):
    api_v1_root = backend_root / "api_v1"
    if not api_v1_root.is_dir():
        raise SystemExit("[ERROR] api_v1/ not found under {}".format(backend_root))

    if str(backend_root.parent) not in sys.path:
        sys.path.insert(0, str(backend_root.parent))

    # The prompt file always lands next to this script
    script_dir = Path(__file__).resolve().parent

    print("Scanning: {}".format(api_v1_root))
    code_keys = scan_code_keys(api_v1_root)

    db_keys = None
    if not skip_db:
        print("Querying database ...")
        try:
            db_keys = await fetch_db_keys(backend_root)
        except Exception as exc:
            print("[ERROR] DB query failed: {}".format(exc), file=sys.stderr)
            print("        Re-run with --no-db to see only the code scan.", file=sys.stderr)
            return 2

    return report(code_keys, db_keys, backend_root, emit_json_stub, script_dir)


def main():
    parser = argparse.ArgumentParser(
        description="Audit message_key declarations against the msg_keys DB table.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--backend-root",
        metavar="PATH",
        default=None,
        help="Path to the backend/ directory. Auto-detected if omitted.",
    )
    parser.add_argument(
        "--no-db",
        action="store_true",
        default=False,
        help="Skip the database query; scan code only and write prompt for all keys.",
    )
    parser.add_argument(
        "--json-stub",
        action="store_true",
        default=False,
        help=(
            "Also print a JSON stub with ${varName} placeholders to the console "
            "(the prompt file is always written regardless of this flag)."
        ),
    )
    args = parser.parse_args()

    backend_root = _resolve_backend_root(args.backend_root)
    exit_code = asyncio.run(
        _async_main(backend_root, skip_db=args.no_db, emit_json_stub=args.json_stub)
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()