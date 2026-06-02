#!/usr/bin/env python3
"""
Essence File Grouper
Location: talent/backend/utils/group_essence_files.py

Recursively scans api_v1 for essence files grouped by suffix type,
then writes one combined .txt file per category into grouped_essence_files/.

Supported suffixes:
  _dependencies.py  →  joint_dependencies.txt
  _errors.py        →  joint_errors.txt
  _success.py       →  joint_success.txt
  _model.py         →  joint_model.txt
  _schema.py        →  joint_schema.txt
  _repository.py    →  joint_repository.txt
  _service.py       →  joint_service.txt
  _views.py         →  joint_views.txt
"""

from __future__ import annotations

import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUFFIXES: list[str] = [
    "_dependencies",
    "_errors",
    "_success",
    "_model",
    "_schema",
    "_repository",
    "_service",
    "_views",
]

FILE_EXTENSION = ".py"

SEPARATOR = "=" * 80


def get_project_root() -> Path:
    """Return talent/ root. Assumes this file lives in talent/backend/utils/."""
    return Path(__file__).resolve().parent.parent.parent


def find_files_by_suffix(api_v1_dir: Path, suffix: str) -> list[Path]:
    """Return all .py files ending with *<suffix>.py, sorted by relative path."""
    pattern = f"*{suffix}{FILE_EXTENSION}"
    return sorted(api_v1_dir.rglob(pattern))


def build_header(file_path: Path, api_v1_dir: Path) -> str:
    """Build a readable section header showing the file's relative path."""
    try:
        rel = file_path.relative_to(api_v1_dir.parent.parent)  # relative to project root
    except ValueError:
        rel = file_path
    return f"\n{SEPARATOR}\n# FILE: {rel}\n{SEPARATOR}\n"


def group_files(api_v1_dir: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    total_written = 0

    for suffix in SUFFIXES:
        files = find_files_by_suffix(api_v1_dir, suffix)

        if not files:
            print(f"  ⚠️  No files found for suffix '{suffix}{FILE_EXTENSION}' — skipping.")
            continue

        output_file = output_dir / f"joint{suffix}.txt"

        with open(output_file, "w", encoding="utf-8") as out:
            out.write(f"# JOINT FILE: *{suffix}.py\n")
            out.write(f"# Source directory: {api_v1_dir}\n")
            out.write(f"# Total files: {len(files)}\n")

            for fp in files:
                out.write(build_header(fp, api_v1_dir))
                try:
                    out.write(fp.read_text(encoding="utf-8"))
                except Exception as exc:
                    out.write(f"# ERROR reading file: {exc}\n")
                out.write("\n")

        print(f"  ✅  {output_file.name:35s}  ({len(files)} file{'s' if len(files) != 1 else ''})")
        total_written += 1

    print(f"\n✨  Done — {total_written} joint file(s) written to: {output_dir}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    project_root = get_project_root()

    # Allow overriding api_v1 path as first CLI argument
    if len(sys.argv) > 1:
        api_v1_dir = Path(sys.argv[1]).resolve()
    else:
        api_v1_dir = project_root / "backend" / "api_v1"

    # Allow overriding output dir as second CLI argument
    if len(sys.argv) > 2:
        output_dir = Path(sys.argv[2]).resolve()
    else:
        output_dir = project_root / "backend" / "utils" / "grouped_essence_files"

    if not api_v1_dir.exists():
        print(f"❌  api_v1 directory not found: {api_v1_dir}")
        sys.exit(1)

    print(f"🔍  Scanning: {api_v1_dir}")
    print(f"📁  Output:   {output_dir}\n")

    group_files(api_v1_dir, output_dir)


if __name__ == "__main__":
    main()
