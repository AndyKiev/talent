#!/usr/bin/env python3
"""
Frontend Message Key Audit Utility
Location: talent/backend/utils/msg_key_frontend_audit.py

Scans all TypeScript / TSX files under frontend/src/ for:
  - getString('someKey')           → plain key, no variables
  - getString('someKey', { ... })  → key with variable names extracted from the object literal
  - getErrorMessage('someKey', ...)  → also captured

Then queries the database msg_keys table and reports keys that appear in the
frontend code but are missing from the database.

When missing keys are found the script always writes
msg_key_frontend_translation_prompt.md  next to this script — a ready-to-paste
prompt for an LLM to generate the full ukr/eng translation JSON.
The prompt also instructs the LLM to produce a **downloadable JSON** artifact.

Usage (run from project root, backend/ or backend/utils/):
    python utils/msg_key_frontend_audit.py
    python utils/msg_key_frontend_audit.py --no-db
    python utils/msg_key_frontend_audit.py --json-stub
    python utils/msg_key_frontend_audit.py --frontend-root /home/andry/Projects/talent/frontend
    python utils/msg_key_frontend_audit.py --backend-root  /home/andry/Projects/talent/backend
"""

import asyncio
import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import NamedTuple
from datetime import datetime


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------


class FoundKey(NamedTuple):
    key: str  # e.g. "talentStatusNotFound"
    variables: list  # e.g. ["statusId"]  — empty if getString called without vars
    file: Path
    line: int


# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# Matches:  getString('key')  getString("key")  getString(`key`)
# Captures: key
_RE_GET_STRING_NO_VARS = re.compile(
    r"""get(?:String|ErrorMessage)\s*\(\s*['"`]([A-Za-z][A-Za-z0-9_]*)['"`]\s*\)"""
)

# Matches:  getString('key', { foo, bar: x, baz: y })
# Captures: key  +  the object literal body (everything between { })
_RE_GET_STRING_WITH_VARS = re.compile(
    r"""get(?:String|ErrorMessage)\s*\(\s*['"`]([A-Za-z][A-Za-z0-9_]*)['"`]\s*,\s*\{([^}]*)\}"""
)

# From an object literal body, extract the keys (shorthand { foo } or { foo: ... })
# Matches identifiers at the start of a key-value pair or shorthand property.
_RE_OBJ_KEY = re.compile(r"""(?:^|,)\s*([A-Za-z_][A-Za-z0-9_]*)""")

# Also capture ${varName} placeholders used directly in template literals passed
# as the key, e.g.  getString(`prefix_${something}`)  — we skip these (dynamic key).
_RE_DYNAMIC_KEY = re.compile(r"""\$\{""")


# ---------------------------------------------------------------------------
# File scanner
# ---------------------------------------------------------------------------


def _extract_keys_from_source(source: str, path: Path) -> list[FoundKey]:
    """
    Returns one FoundKey per getString / getErrorMessage call found in source.
    Dynamic keys (containing ${…}) are skipped with a warning.
    """
    found: list[FoundKey] = []
    seen: set[tuple[str, frozenset]] = set()  # dedup within file

    # Track line numbers via cumulative offsets
    line_starts = [0]
    for m in re.finditer(r"\n", source):
        line_starts.append(m.end())

    def _line_of(pos: int) -> int:
        lo, hi = 0, len(line_starts) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if line_starts[mid] <= pos:
                lo = mid
            else:
                hi = mid - 1
        return lo + 1  # 1-based

    # ── calls WITH explicit variable object ──────────────────────────────────
    for m in _RE_GET_STRING_WITH_VARS.finditer(source):
        key = m.group(1)
        if _RE_DYNAMIC_KEY.search(key):
            continue
        obj_body = m.group(2)
        vars_ = _RE_OBJ_KEY.findall(obj_body)
        sig = (key, frozenset(vars_))
        if sig not in seen:
            seen.add(sig)
            found.append(
                FoundKey(
                    key=key,
                    variables=sorted(vars_),
                    file=path,
                    line=_line_of(m.start()),
                )
            )

    # ── calls WITHOUT variable object ────────────────────────────────────────
    for m in _RE_GET_STRING_NO_VARS.finditer(source):
        key = m.group(1)
        if _RE_DYNAMIC_KEY.search(key):
            continue
        sig = (key, frozenset())
        if sig not in seen:
            seen.add(sig)
            found.append(
                FoundKey(key=key, variables=[], file=path, line=_line_of(m.start()))
            )

    return found


def scan_frontend_keys(frontend_src: Path) -> list[FoundKey]:
    """Walk frontend/src and collect every getString / getErrorMessage call."""
    targets = sorted(frontend_src.rglob("*.ts")) + sorted(frontend_src.rglob("*.tsx"))
    if not targets:
        print(
            "[WARN] No .ts / .tsx files found under {}".format(frontend_src),
            file=sys.stderr,
        )
    all_keys: list[FoundKey] = []
    for path in targets:
        try:
            source = path.read_text(encoding="utf-8")
        except OSError as exc:
            print("  [WARN] Cannot read {}: {}".format(path, exc), file=sys.stderr)
            continue
        all_keys.extend(_extract_keys_from_source(source, path))
    return all_keys


# ---------------------------------------------------------------------------
# Database query  (same helper as the backend script)
# ---------------------------------------------------------------------------


async def fetch_db_keys(backend_root: Path) -> set[str]:
    from sqlalchemy import text
    from backend.database.db_helper import db_helper  # type: ignore

    async with db_helper.engine.connect() as conn:
        result = await conn.execute(text("SELECT name FROM msg_keys"))
        rows = result.fetchall()
    return {row[0] for row in rows}


# ---------------------------------------------------------------------------
# JSON stub builder
# ---------------------------------------------------------------------------


def build_json_stub(missing: list[FoundKey]) -> dict:
    stub = {}
    for fk in missing:
        placeholder = (
            " ".join("${" + v + "}" for v in fk.variables) if fk.variables else ""
        )
        stub[fk.key] = {"ukr": placeholder, "eng": placeholder}
    return stub


# ---------------------------------------------------------------------------
# Translation prompt builder
# ---------------------------------------------------------------------------


def build_translation_prompt(missing: list[FoundKey]) -> str:
    lines = []
    lines.append("# Translation Prompt — Missing Frontend Message Keys")
    lines.append("")
    lines.append("Generated: {}".format(datetime.now().strftime("%Y-%m-%d %H:%M")))
    lines.append("Missing keys: {}".format(len(missing)))
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Task")
    lines.append("")
    lines.append(
        "Below is a list of i18n message keys that are used in the frontend code "
        "but are not yet seeded in the database. For each key, produce a JSON object "
        "with two fields: `ukr` (Ukrainian) and `eng` (English)."
    )
    lines.append("")
    lines.append("### Rules")
    lines.append("")
    lines.append(
        "- Interpolation variables are written as `${varName}` — keep them verbatim "
        "in both translations."
    )
    lines.append(
        "- If there is no obvious English wording for a key, derive it from the "
        "camelCase key name itself (e.g. `talentStatusNotFound` → "
        '"Talent status not found").'
    )
    lines.append(
        "- For `ukr`, produce a natural Ukrainian translation that mirrors the English "
        "meaning and keeps all `${varName}` placeholders in the same logical position."
    )
    lines.append("- Keys with no variables get plain strings with no placeholders.")
    lines.append(
        "- **Important:** Return ONLY a single valid JSON object — "
        "no markdown fences, no commentary, no trailing commas."
    )
    lines.append(
        "- **Important:** The JSON must also be available as a **downloadable file** "
        "(e.g. an artifact the user can save), not only shown inline."
    )
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Keys to translate")
    lines.append("")

    for fk in missing:
        lines.append("### `{}`".format(fk.key))
        if fk.variables:
            lines.append(
                "- **Variables:** {}".format(
                    ", ".join("`${" + v + "}`" for v in fk.variables)
                )
            )
        else:
            lines.append("- **Variables:** none")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## Expected output format")
    lines.append("")
    lines.append("```json")
    lines.append("{")

    example_lines = []
    for fk in missing:
        if fk.variables:
            eng_val = " ".join("${" + v + "}" for v in fk.variables)
        else:
            # Derive a readable English string from the camelCase key
            eng_val = re.sub(r"([A-Z])", r" \1", fk.key).strip().capitalize()
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


def write_prompt_file(missing: list[FoundKey], script_dir: Path) -> Path:
    prompt_path = script_dir / "msg_key_frontend_translation_prompt.md"
    prompt_path.write_text(build_translation_prompt(missing), encoding="utf-8")
    return prompt_path


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------


def _relative(path: Path, base: Path) -> str:
    try:
        return str(path.relative_to(base))
    except ValueError:
        return str(path)


def report(
    code_keys: list[FoundKey],
    db_keys: set[str] | None,
    frontend_root: Path,
    emit_json_stub: bool,
    script_dir: Path,
) -> int:
    """Print findings, write prompt file. Returns number of missing keys."""

    # Deduplicate: for each key keep the entry with the most variables found
    by_key: dict[str, FoundKey] = {}
    for fk in code_keys:
        existing = by_key.get(fk.key)
        if existing is None or len(fk.variables) > len(existing.variables):
            by_key[fk.key] = fk

    unique_code_keys = set(by_key.keys())

    print("\n" + "=" * 68)
    print("  Frontend Message Key Audit")
    print("=" * 68)

    # ── keys found in code ───────────────────────────────────────────────────
    total_calls = len(code_keys)
    total_files = len({fk.file for fk in code_keys})
    print("\n[CODE]  {} call(s) across {} file(s):\n".format(total_calls, total_files))

    by_file: dict[Path, list[FoundKey]] = defaultdict(list)
    for fk in sorted(code_keys, key=lambda x: (str(x.file), x.line)):
        by_file[fk.file].append(fk)

    for path, entries in sorted(by_file.items(), key=lambda kv: str(kv[0])):
        print("  {}".format(_relative(path, frontend_root)))
        for e in entries:
            vars_str = (
                ", ".join("${" + v + "}" for v in e.variables) if e.variables else "-"
            )
            print("    L{:<5}  {:<45}  [{}]".format(e.line, e.key, vars_str))

    # ── DB comparison ────────────────────────────────────────────────────────
    if db_keys is None:
        print("\n[DB]   Skipped (--no-db).\n")
        missing_found = sorted(by_key.values(), key=lambda x: x.key)
    else:
        print("\n[DB]   {} key(s) currently in msg_keys table.".format(len(db_keys)))
        missing_found = [by_key[k] for k in sorted(unique_code_keys - db_keys)]

    if db_keys is not None and not missing_found:
        print("\n  All frontend message keys are present in the database.\n")
        return 0

    # ── list missing keys ────────────────────────────────────────────────────
    if db_keys is not None:
        print(
            "\n  {} key(s) in FRONTEND CODE but MISSING from database:\n".format(
                len(missing_found)
            )
        )
        for fk in missing_found:
            vars_str = (
                "  vars: " + ", ".join("${" + v + "}" for v in fk.variables)
                if fk.variables
                else "  (no variables)"
            )
            print('    "{}"{}'.format(fk.key, vars_str))
            print("         {}:{}".format(_relative(fk.file, frontend_root), fk.line))

    # ── JSON stub (optional) ─────────────────────────────────────────────────
    if emit_json_stub and missing_found:
        stub = build_json_stub(missing_found)
        print("\n" + "-" * 68)
        print("  JSON stub (placeholders only — fill in real translations):")
        print("-" * 68 + "\n")
        print(json.dumps(stub, ensure_ascii=False, indent=2))
        print()

    # ── always write prompt file ─────────────────────────────────────────────
    if missing_found:
        prompt_path = write_prompt_file(missing_found, script_dir)
        print("\n  Translation prompt written to:")
        print("  {}\n".format(prompt_path))

    return len(missing_found)


# ---------------------------------------------------------------------------
# Root resolution helpers
# ---------------------------------------------------------------------------


def _resolve_frontend_root(arg: str | None) -> Path:
    if arg:
        p = Path(arg).resolve()
        if not p.is_dir():
            raise SystemExit("[ERROR] --frontend-root does not exist: {}".format(p))
        return p

    script_dir = Path(__file__).resolve().parent  # backend/utils/
    cwd = Path.cwd()

    # Build candidate list: walk up from both the script location and cwd,
    # looking for a sibling/ancestor directory called "frontend" that has src/.
    candidates = []
    # From script: utils/ -> backend/ -> project root -> ...
    p = script_dir
    for _ in range(4):
        candidates.append(p / "frontend")
        p = p.parent
    # From cwd
    p = cwd
    for _ in range(3):
        candidates.append(p / "frontend")
        p = p.parent

    for candidate in candidates:
        if (candidate / "src").is_dir():
            return candidate.resolve()

    raise SystemExit(
        "[ERROR] Cannot locate frontend root (expected a frontend/src/ directory).\n"
        "        Pass --frontend-root /path/to/frontend"
    )


def _resolve_backend_root(arg: str | None) -> Path | None:
    """Returns None only when --no-db is active."""
    if arg:
        p = Path(arg).resolve()
        if not p.is_dir():
            raise SystemExit("[ERROR] --backend-root does not exist: {}".format(p))
        return p

    cwd = Path.cwd()
    if (cwd / "api_v1").is_dir():
        return cwd

    script_dir = Path(__file__).resolve().parent  # backend/utils/
    candidate = script_dir.parent  # backend/
    if (candidate / "api_v1").is_dir():
        return candidate

    # Try sibling directory
    for candidate in [cwd / "backend", cwd.parent / "backend"]:
        if (candidate / "api_v1").is_dir():
            return candidate.resolve()

    return None  # caller will decide whether this is fatal


# ---------------------------------------------------------------------------
# Async main
# ---------------------------------------------------------------------------


async def _async_main(
    frontend_root: Path,
    backend_root: Path | None,
    skip_db: bool,
    emit_json_stub: bool,
) -> int:
    frontend_src = frontend_root / "src"
    if not frontend_src.is_dir():
        raise SystemExit("[ERROR] src/ not found under {}".format(frontend_root))

    script_dir = Path(__file__).resolve().parent

    print("Scanning: {}".format(frontend_src))
    code_keys = scan_frontend_keys(frontend_src)

    db_keys: set[str] | None = None
    if not skip_db:
        if backend_root is None:
            print(
                "[WARN] Cannot auto-detect backend root. "
                "Pass --backend-root or use --no-db.",
                file=sys.stderr,
            )
        else:
            if str(backend_root.parent) not in sys.path:
                sys.path.insert(0, str(backend_root.parent))
            print("Querying database ...")
            try:
                db_keys = await fetch_db_keys(backend_root)
            except Exception as exc:
                print("[ERROR] DB query failed: {}".format(exc), file=sys.stderr)
                print(
                    "        Re-run with --no-db to see only the code scan.",
                    file=sys.stderr,
                )
                return 2

    return report(code_keys, db_keys, frontend_root, emit_json_stub, script_dir)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Audit getString / getErrorMessage keys in frontend against the msg_keys DB table.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--frontend-root",
        metavar="PATH",
        default=None,
        help="Path to the frontend/ directory (the one that contains src/). Auto-detected if omitted.",
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
        help="Skip the database query; scan code only and write prompt for all found keys.",
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

    frontend_root = _resolve_frontend_root(args.frontend_root)
    backend_root = None if args.no_db else _resolve_backend_root(args.backend_root)

    exit_code = asyncio.run(
        _async_main(
            frontend_root=frontend_root,
            backend_root=backend_root,
            skip_db=args.no_db,
            emit_json_stub=args.json_stub,
        )
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
