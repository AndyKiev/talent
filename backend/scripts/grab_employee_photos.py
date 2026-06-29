"""
Grab placeholder photos for employees who don't have one yet.

- Gender priority: personal_data.sex → genderize.io API → local heuristic.
- genderize.io is a free name→gender web API (1000 req/day, no key needed).
  We send every non-initial word from the full name and pick the best match.
- Photos are fetched from randomuser.me (nl pool = white/European faces).
- Each photo is downscaled to max 320px and stored as JPEG/PNG.

Run from the repo root:
    cd backend && poetry run python scripts/grab_employee_photos.py

Or with dry-run:
    cd backend && poetry run python scripts/grab_employee_photos.py --dry-run

Or limit to N employees:
    cd backend && poetry run python scripts/grab_employee_photos.py --limit 5
"""

import io
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, UnidentifiedImageError

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from sqlalchemy import select

from backend.database.db_helper import db_helper
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee_photo.employee_photo_model import EmployeePhoto
from backend.api_v1.table_relationship_links.employee_personal_data_model import (
    EmployeePersonalData,
)

# ── Image processing (mirrors EmployeePhotoService._process_image) ──
MAX_DIMENSION = 320
JPEG_QUALITY = 80


def process_image(raw: bytes) -> tuple[bytes, str]:
    """Downscale + normalise. Returns (bytes, content_type)."""
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


# ── Gender detection via genderize.io + local heuristic fallback ──
# genderize.io is a free name→gender API (1000 req/day without key). We cache
# results per name so repeated first names only hit the API once per run.
#
# First-name extraction tries every non-initial word from the full name (the DB
# stores names in varying orders: "SURNAME FIRSTNAME" or "FIRSTNAME SURNAME" or
# "SURNAME FIRSTNAME PATRONYMIC").  We send each candidate to genderize.io and
# pick the answer with the highest probability.  The API falls through to a local
# heuristic when rate-limited or offline.

GENDERIZE_URL = "https://api.genderize.io/?name={name}"
# In-memory cache: {lowercase_name: "male"|"female"} — avoids duplicate API hits.
_genderize_cache: dict[str, str] = {}

# Local-heuristic constants (fallback when genderize.io is unreachable).
FEMALE_ENDINGS = ("а", "я", "ія")
MALE_A_NAMES = {
    "микола", "лука", "ілля", "сава", "кузьма", "хома", "йона", "микита",
}


def _is_initial(word: str) -> bool:
    """True for single-letter-with-dot fragments like 'А.', 'В.М.'"""
    return "." in word and len(word.rstrip(".")) <= 2


def _looks_like_given_name(word: str) -> bool:
    """Quick filter: surnames / patronymics have characteristic suffixes.
    Returns False for words that are almost certainly NOT given names."""
    w = word.lower()
    # Patronymic suffixes (male & female)
    if w.endswith(("ович", "івна", "ївна", "овна", "ич", "івен")):
        return False
    # Common Ukrainian surname suffixes
    if w.endswith(("енко", "чук", "юк", "ський", "цький", "ська", "цька",
                    "овий", "ових", "єв", "ов", "ін", "їн", "ая", "ий", "их")):
        return False
    return True


def _heuristic_gender(word: str) -> str:
    """Local fallback: gender from Ukrainian name ending."""
    w = word.lower()
    if w in MALE_A_NAMES:
        return "male"
    if w.endswith(FEMALE_ENDINGS):
        return "female"
    return "male"


def _query_genderize(word: str) -> str | None:
    """Call genderize.io for a single word. Returns 'male'/'female' or None."""
    if word in _genderize_cache:
        return _genderize_cache[word]
    try:
        url = GENDERIZE_URL.format(name=urllib.parse.quote(word))
        req = urllib.request.Request(url, headers={"User-Agent": "talent-script/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
    except Exception:
        return None
    gender = data.get("gender")
    prob = data.get("probability", 0)
    if gender in ("male", "female") and prob >= 0.70:
        _genderize_cache[word] = gender
        return gender
    return None


def _extract_candidates(name: str) -> list[str]:
    """All non-initial words from a full name, roughly ordered by likelihood of
    being a given name (name-like words first, obvious surnames/patronymics last)."""
    parts = name.strip().split()
    return [w for w in parts if len(w) >= 2 and not _is_initial(w)]


def detect_gender_from_name(name: str) -> tuple[str | None, str]:
    """Return (gender, source) where source is 'genderize.io', 'heuristic', or
    'unknown'. Tries genderize.io for every candidate word and picks the best
    result; falls back to the local heuristic if the API is unavailable."""
    if not name:
        return None, "unknown"
    candidates = _extract_candidates(name)
    if not candidates:
        return None, "unknown"

    # Try the web API first — best candidate wins (highest probability).
    best: tuple[str, float] | None = None
    for w in candidates:
        g = _query_genderize(w)
        if g:
            # We don't have probability here, but the API already filters ≥0.70.
            # First API hit that succeeds on a given-name-looking word wins.
            if _looks_like_given_name(w):
                return g, "genderize.io"
            if best is None:
                best = (g, 1.0)  # placeholder

    if best is not None:
        return best[0], "genderize.io"

    # Fall back to local heuristic — prefer words that look like given names.
    for w in candidates:
        if _looks_like_given_name(w):
            return _heuristic_gender(w), "heuristic"
    # Last resort: heuristic on the first non-initial word.
    return _heuristic_gender(candidates[0]), "heuristic"


# ── Photo fetching ──
# nat=nl (Netherlands) — large, exclusively white/European face pool.
RANDOMUSER_URL = "https://randomuser.me/api/?gender={gender}&nat=nl"


def fetch_photo(gender: str) -> bytes | None:
    """Fetch a single face photo from randomuser.me. Returns raw bytes."""
    url = RANDOMUSER_URL.format(gender=gender)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "talent-script/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except Exception as exc:
        print(f"    API error: {exc}")
        return None

    try:
        picture_url = data["results"][0]["picture"]["large"]
    except (KeyError, IndexError):
        print("    Unexpected API response format")
        return None

    try:
        req = urllib.request.Request(
            picture_url, headers={"User-Agent": "talent-script/1.0"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read()
    except Exception as exc:
        print(f"    Failed to download photo from {picture_url}: {exc}")
        return None


# ── Main ──
def main(dry_run: bool = False, limit: int | None = None):
    session = db_helper.sync_session_factory()

    # 1. All employees
    all_emps = session.execute(select(Employee.id, Employee.name)).fetchall()
    all_ids = {row[0]: row[1] for row in all_emps}

    # 2. Employees that already have a photo
    existing = session.execute(select(EmployeePhoto.employee_id)).fetchall()
    has_photo = {row[0] for row in existing}

    # 3. Employees without photos
    missing_ids = sorted(set(all_ids.keys()) - has_photo)
    print(f"Total employees: {len(all_ids)}")
    print(f"With photo:      {len(has_photo)}")
    print(f"Without photo:   {len(missing_ids)}")

    if not missing_ids:
        print("All employees have photos. Nothing to do.")
        session.close()
        return

    # 4. Fetch personal_data for gender
    pd_rows = session.execute(
        select(EmployeePersonalData.employee_id, EmployeePersonalData.sex).where(
            EmployeePersonalData.employee_id.in_(missing_ids)
        )
    ).fetchall()
    sex_map = {row[0]: row[1] for row in pd_rows}

    if limit:
        missing_ids = missing_ids[:limit]
        print(f"Limited to {limit} employees.")

    print()

    processed = 0
    skipped = 0
    errors = 0

    for eid in missing_ids:
        name = all_ids[eid]
        pd_sex = sex_map.get(eid)
        gender = pd_sex if pd_sex in ("male", "female") else None

        if gender:
            source = "personal_data"
        else:
            gender, source = detect_gender_from_name(name)

        print(f"Employee id={eid:>4}  name={name}  gender={gender}  ({source})")

        if not gender:
            print("  SKIP — could not determine gender")
            skipped += 1
            continue

        if dry_run:
            print(f"  [DRY RUN] Would fetch {gender} photo")
            processed += 1
            continue

        # Fetch photo
        raw = fetch_photo(gender)
        if raw is None:
            print("  FAILED to fetch photo")
            errors += 1
            continue

        # Process it
        try:
            data, content_type = process_image(raw)
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            print(f"  FAILED to process image: {exc}")
            errors += 1
            continue

        # Upsert — check if one snuck in between our initial query and now
        existing_photo = session.execute(
            select(EmployeePhoto).where(EmployeePhoto.employee_id == eid)
        ).scalar_one_or_none()

        if existing_photo is None:
            photo = EmployeePhoto(
                employee_id=eid,
                content_type=content_type,
                data=data,
                size=len(data),
            )
            session.add(photo)
        else:
            existing_photo.content_type = content_type
            existing_photo.data = data
            existing_photo.size = len(data)

        session.commit()
        print(f"  OK  {len(data)} bytes  {content_type}")
        processed += 1

        # Be polite to the API
        time.sleep(0.6)

    session.close()

    print(f"\nDone. Processed: {processed}  Skipped: {skipped}  Errors: {errors}")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    limit = None
    for i, arg in enumerate(sys.argv):
        if arg == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
    main(dry_run=dry_run, limit=limit)
