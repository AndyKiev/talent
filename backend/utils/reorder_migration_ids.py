#!/usr/bin/env python3
"""
Reorders `id` columns to be first in all op.create_table() calls
in the latest Alembic migration file.

Place this file in:  /home/andry/Projects/talent/backend/utils/

Usage:
    python reorder_migration_ids.py            # uses default versions dir
    python reorder_migration_ids.py <path>     # override versions dir
"""

import re
import sys
from pathlib import Path

DEFAULT_VERSIONS_DIR = Path(__file__).parent.parent / "migrations" / "versions"


def get_latest_migration(versions_dir: Path) -> Path:
    files = sorted(versions_dir.glob("*.py"), key=lambda f: f.stat().st_mtime)
    if not files:
        raise FileNotFoundError(f"No migration files found in {versions_dir}")
    return files[-1]


def extract_parens(text: str, start: int):
    """Return the balanced-paren substring starting at `start` (must be `(`)."""
    depth, j = 0, start
    while j < len(text):
        if text[j] == "(":
            depth += 1
        elif text[j] == ")":
            depth -= 1
            if depth == 0:
                return text[start: j + 1], j + 1
        j += 1
    return text[start:], len(text)


def split_top_level(inner: str) -> list:
    """Split a comma-separated string only at depth-0 commas."""
    args, current, depth = [], "", 0
    for ch in inner:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            t = current.strip()
            if t:
                args.append(t)
            current = ""
        else:
            current += ch
    t = current.strip()
    if t:
        args.append(t)
    return args


def reorder_block(block: str) -> str:
    """Move sa.Column("id", ...) to the first column slot in a create_table block."""
    m = re.search(r"\n(\s+)sa\.Column\(", block)
    if not m:
        return block
    indent = m.group(1)

    paren_pos = block.index("(")
    inner_str = block[paren_pos + 1: block.rfind(")")]
    args = split_top_level(inner_str)
    if not args:
        return block

    table_name, rest = args[0], args[1:]

    id_col, col_args, other_args = None, [], []
    for a in rest:
        if re.match(r"""sa\.Column\(\s*["']id["']""", a):
            id_col = a
        elif a.startswith("sa.Column("):
            col_args.append(a)
        else:
            other_args.append(a)

    if id_col is None:
        return block

    ordered = [table_name, id_col] + col_args + other_args
    sep = ",\n" + indent
    closing_indent = indent[:-4] if len(indent) >= 4 else ""
    return f"op.create_table(\n{indent}{sep.join(ordered)}\n{closing_indent})"


def process_file(path: Path) -> None:
    original = path.read_text(encoding="utf-8")
    text, parts, i = original, [], 0

    while i < len(text):
        m = re.search(r"op\.create_table\(", text[i:])
        if not m:
            parts.append(text[i:])
            break

        rel = m.start()
        parts.append(text[i: i + rel])
        abs_start = i + rel

        paren_pos = abs_start + len("op.create_table")
        inner_block, _ = extract_parens(text, paren_pos)
        full_block = "op.create_table" + inner_block

        parts.append(reorder_block(full_block))
        i = abs_start + len(full_block)

    new = "".join(parts)
    if new == original:
        print("No changes needed — id columns are already first everywhere.")
        return
    path.write_text(new, encoding="utf-8")
    print(f"Updated: {path}")


def main():
    versions_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_VERSIONS_DIR
    if not versions_dir.is_dir():
        print(f"Error: {versions_dir} is not a directory")
        sys.exit(1)

    latest = get_latest_migration(versions_dir)
    print(f"Processing: {latest.name}")
    process_file(latest)


if __name__ == "__main__":
    main()