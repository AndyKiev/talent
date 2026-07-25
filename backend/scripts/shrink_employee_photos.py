"""
Re-encode existing employee photos to the current storage target
(MAX_DIMENSION / JPEG_QUALITY in EmployeePhotoService), shrinking the blobs
already in the database.

Why: older photos were stored at 512px / quality 85. The photo is never shown
larger than the TEMPO 96x120 box (~240px at 2x DPI), so they were oversized.
This rewrites each stored blob to the smaller target.

ONE-WAY: the stored blob is the only copy (the original upload was discarded on
ingest), so re-encoding is lossy and cannot be undone. Run --dry-run first.

Rows whose longest edge is already <= MAX_DIMENSION are SKIPPED — re-encoding an
already-small image would only degrade it for a negligible byte saving.

Run from the repo root:
    cd backend && poetry run python scripts/shrink_employee_photos.py --dry-run
    cd backend && poetry run python scripts/shrink_employee_photos.py

Optional:
    --limit N   process at most N photos
"""

import io
import sys
from pathlib import Path

from PIL import Image, UnidentifiedImageError

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from backend.api_v1.employee_photo.employee_photo_model import EmployeePhoto

# Pull the live target straight from the service so this can never drift from it.
from backend.api_v1.employee_photo.employee_photo_service import (
    JPEG_QUALITY,
    MAX_DIMENSION,
)
from backend.database.db_helper import db_helper
from sqlalchemy import select


def reprocess(raw: bytes) -> tuple[bytes, str]:
    """Downscale + re-encode to the current target. Returns (bytes, content_type).
    Mirrors EmployeePhotoService._process_image."""
    img = Image.open(io.BytesIO(raw))
    img.load()

    has_alpha = img.mode in ("RGBA", "LA") or (
        img.mode == "P" and "transparency" in img.info
    )
    img.thumbnail((MAX_DIMENSION, MAX_DIMENSION))
    out = io.BytesIO()
    if has_alpha:
        img.convert("RGBA").save(out, format="PNG", optimize=True)
        content_type = "image/png"
    else:
        img.convert("RGB").save(out, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        content_type = "image/jpeg"
    return out.getvalue(), content_type


def _human(n: int) -> str:
    return f"{n / 1024:.1f} KB" if n < 1024 * 1024 else f"{n / (1024 * 1024):.2f} MB"


def main(dry_run: bool = False, limit: int | None = None):
    session = db_helper.sync_session_factory()

    photos = session.execute(select(EmployeePhoto)).scalars().all()
    print(f"Target: {MAX_DIMENSION}px / quality {JPEG_QUALITY}")
    print(f"Photos in DB: {len(photos)}")
    if dry_run:
        print("DRY RUN — nothing will be written.\n")
    print()

    processed = 0
    skipped = 0
    errors = 0
    before_total = 0
    after_total = 0

    count = 0
    for p in photos:
        if limit and count >= limit:
            break
        count += 1

        raw = p.data
        if not raw:
            skipped += 1
            continue

        try:
            img = Image.open(io.BytesIO(raw))
            img.load()
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            print(f"employee_id={p.employee_id:>4}  ERROR decoding: {exc}")
            errors += 1
            continue

        longest = max(img.size)
        old_size = len(raw)

        # Already small enough: re-encoding would only degrade it. Skip.
        if longest <= MAX_DIMENSION:
            skipped += 1
            print(
                f"employee_id={p.employee_id:>4}  SKIP  {img.size[0]}x{img.size[1]} "
                f"{_human(old_size)} (already <= {MAX_DIMENSION}px)"
            )
            continue

        try:
            new_data, content_type = reprocess(raw)
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            print(f"employee_id={p.employee_id:>4}  ERROR re-encoding: {exc}")
            errors += 1
            continue

        new_size = len(new_data)
        before_total += old_size
        after_total += new_size
        pct = (1 - new_size / old_size) * 100 if old_size else 0
        print(
            f"employee_id={p.employee_id:>4}  {img.size[0]}x{img.size[1]} -> "
            f"<= {MAX_DIMENSION}px   {_human(old_size)} -> {_human(new_size)}  (-{pct:.0f}%)"
        )

        if not dry_run:
            p.data = new_data
            p.content_type = content_type
            p.size = new_size
            session.commit()
        processed += 1

    session.close()

    print(f"\nDone. Re-encoded: {processed}  Skipped: {skipped}  Errors: {errors}")
    if processed:
        saved = before_total - after_total
        print(
            f"Bytes: {_human(before_total)} -> {_human(after_total)}  "
            f"(saved {_human(saved)})"
        )


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    limit = None
    for i, arg in enumerate(sys.argv):
        if arg == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
    main(dry_run=dry_run, limit=limit)
