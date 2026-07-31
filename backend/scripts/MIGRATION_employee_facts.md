# Employee facts — the three-step migration (APPLIED 2026-07-29)

Moving the two numbered text columns off `review_session_employee_evaluations`
into rows. Three revisions, never two: with the create and the drop in one
upgrade, every existing value is destroyed before it has somewhere to go.

| # | what | result |
|---|---|---|
| 1 | `88e434a4005b` — create `employee_fact_types`, `employee_facts`, `employee_fact_evaluation_links` | applied (ids reordered first) |
| — | `seed_employee_fact_types.py` | 2 rows: `fact`, `improvement` |
| — | `seed_employee_fact_translations.py` | 13 msg_keys, 26 msgs (uk+en) |
| 2 | `backend/scripts/migrate_evaluation_facts.py` | 370 evaluations → **1947** facts + 1947 links, 0 unresolved |
| 3 | `d42987ead6ad` — drop `facts`, `improvement` | applied |
| 4 | `/refresh-translations` re-dump | snapshot knows the 3 new tables |

Head is `d42987ead6ad`; a follow-up `--autogenerate` produced an EMPTY revision,
so there is zero drift.

## Verification that was run

- **Parity before the drop**: 1947 non-empty lines in the old columns == 1947
  `employee_facts` rows. Split: 1206 `fact` + 741 `improvement`.
- **No numbering survived into the text** (`text ~ '^[0-9]+[.)]'` → 0 rows) — the
  position lives in `employee_fact_evaluation_links.sort_order`.
- **No fact carries more than one link** (the UNIQUE holds); 0 migrated facts
  landed unlinked.
- **Service round-trip against the live DB** (no HTTP server): read the
  evaluations of an open record, quick-register into the pool, link to a
  competence, edit, reorder, unlink, delete — all green, original order restored.
- **Roster aggregate**: `count_evaluations_with_facts` returns 5/5 competences
  for each of 40 records in one grouped query.

## Backups

`backups/evaluation_facts_pre_drop.json` — the 370 evaluations' original `facts`
/ `improvement` text, dumped immediately before step 3. The revision's
`downgrade()` recreates the columns EMPTY; this file is the only copy of the
text.

## Re-running this on another environment

```bash
alembic upgrade head
```
(from `backend/`, which applies steps 1 and 3 back to back — so on a database
that still holds data, stop at `88e434a4005b` first:)
```bash
alembic upgrade 88e434a4005b
```
```bash
./backend/.venv/Scripts/python.exe backend/seeds/seed_employee_fact_types.py
```
```bash
./backend/.venv/Scripts/python.exe backend/seeds/seed_employee_fact_translations.py
```
```bash
./backend/.venv/Scripts/python.exe -m backend.scripts.migrate_evaluation_facts --dry-run
```
```bash
./backend/.venv/Scripts/python.exe -m backend.scripts.migrate_evaluation_facts
```
```bash
alembic upgrade head
```

The data script is idempotent (an evaluation that already has linked facts is
skipped), so a partial failure is safe to re-run.
