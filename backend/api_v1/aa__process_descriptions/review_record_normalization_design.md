# Review record (RSE) normalization — design & status reference

Everything a review record used to hold as free text, a JSON blob or a bare
varchar is now a table. This document covers the four moves that stayed
**review-scoped**; the fifth (recommended trainings) left the review record
entirely and has its own doc:
`employee_recommended_trainings_design.md`.

## 1. Big picture

`review_session_employees` began as a wide row with everything inline. Five
columns went, in this order:

| was (column) | is now | scope |
|---|---|---|
| `development_plan` (JSON) | `employee_missions*` | employee — see `employee_missions_design.md` |
| `competence_summary` (JSON) | `review_session_employee_dimensions` + `_dimension_comments` + `_dimension_types` | review |
| `results_achievements` (numbered text) | `review_session_employee_results` | review |
| `trainings` (numbered text) | `employee_recommended_trainings*` | **employee** |
| `employee_feedback` + `manager_feedback` (2 nullable texts) | `review_session_employee_feedbacks` + `_feedback_types` | review |
| `status` (varchar) | `review_session_employee_status_id` → `review_session_employee_statuses` | review |

What survives on the row: `session_id`, `employee_id`,
`review_session_employee_status_id`, `queue_position`,
`summary_full_competence_list`. Everything else is rows.

Three rules were applied to every move, and they are the reason the shapes look
alike:

- **No nullable columns.** Absence of a row is the empty state.
- **Ids, not keys, in the database** — but the *key* still travels on the wire
  where the frontend already reasons in keys.
- **Order is a column**, never baked into the text.

## 2. Entities (tables)

| table | purpose | key columns / rules |
|---|---|---|
| `review_session_employee_statuses` | lookup | `key` (unique: open/reviewed/closed), `name`, `description`, `sort_order` |
| `review_session_employee_dimension_types` | lookup | `key` (unique: strong/develop), `name`, `description`, `sort_order` |
| `review_session_employee_dimensions` | one dimension singled out for one employee in one review | `review_session_employee_id` CASCADE, `review_session_employee_dimension_type_id` RESTRICT, `dimension_id` **RESTRICT**, `sort_order`; UNIQUE on the **triple** |
| `review_session_employee_dimension_comments` | notes under a singled-out dimension | `review_session_employee_dimension_id` CASCADE, `text`, `sort_order` |
| `review_session_employee_results` | one result / achievement | `review_session_employee_id` CASCADE, `text`, `sort_order` |
| `review_session_employee_feedback_types` | lookup | `key` (unique: employee/manager), `name`, `description`, `sort_order` |
| `review_session_employee_feedbacks` | one voice's feedback | `review_session_employee_id` CASCADE, `review_session_employee_feedback_type_id`, `text`; UNIQUE on (review, type) |

### Why uniqueness on the TRIPLE, not the pair

`review_session_employee_dimensions` is unique on
(review, type, dimension) — **not** (review, dimension). The candidate filters
only exclude dimensions already picked on the *same* side, so one dimension may
legitimately appear as both a strength and something to develop. A pair-unique
constraint would reject a live case.

### Why `dimension_id` is RESTRICT

These rows record what a reviewer said about a person. Deleting a competence to
tidy the catalogue must not silently erase that. Retiring a competence is done
by **deactivating** it (`is_active`), which keeps every historical review
intact. The FK does the blocking; `delete_review_dimension` already routes
through `delete_by_id(..., delete_error_exc=ReviewDimensionDeleteError)`, so the
`IntegrityError` becomes a domain error — reworded to name deactivation as the
way out.

> Deliberate divergence from `employee_mission_dimension_links`, which CASCADEs.
> That link is an optional *pointer*; this is *content*. A competence used only
> by missions would still delete and quietly strip the links — worth aligning
> one day, but out of scope for this pass.

### The neighbour that is easy to confuse

`review_session_employee_evaluations` is **also** (review × dimension). It holds
the SCORE for **every** dimension. `review_session_employee_dimensions` holds
only the few the reviewer highlighted, plus which side and the notes.

## 3. The wire format — flat and type-driven

There are **no** `strong:` / `develop:` or `employee_feedback:` /
`manager_feedback:` fields anywhere in the API. If the sides and voices are
lookup tables, baking two of them into schema field names defeats the table: a
third row would need a backend schema change, a frontend type change and a
migration of the wire format.

Instead every item is flat and carries its own type id:

```jsonc
// GET /review_session_employees/{id}
{
  "review_session_employee_status_id": 1,
  "status": "open",                       // the KEY — see §4
  "dimensions": [
    { "review_session_employee_dimension_type_id": 1,
      "review_session_employee_dimension_type_key": "strong",
      "dimension_id": 13, "dimension_key": "mobilization_empowerment",
      "dimension_name": "…", "dimension_color": "#EF6C00",
      "sort_order": 0, "comments": ["…"] }
  ],
  "results":   [ { "id": 1, "text": "…", "sort_order": 0 } ],
  "feedbacks": [ { "review_session_employee_feedback_type_id": 1,
                   "review_session_employee_feedback_type_key": "employee",
                   "text": "…" } ]
}
```

`dimension_name` / `dimension_color` are **resolved server-side** in the
caller's language, using the same rule the frontend applies to the competence
tabs (message key `competence` + PascalCase dimension key, falling back to the
`review_dimensions` row) — so the summary heading and the tab heading below it
can never disagree.

The lookups themselves are read-only endpoints, so the frontend gets its ids
from data rather than literals:

```
GET /review_session_employee_statuses
GET /review_session_employee_dimension_types
GET /review_session_employee_feedback_types
```

> None of the three has create/update/delete. Their **keys are a code contract**
> — they drive the transition table, the asc/desc ranking per side and the two
> feedback boxes — so an editable row could rename a key and silently break
> rules that resolve by key. Only the display name is meant to vary, and that is
> a translation. Same reasoning as `employee_mission_statuses`.

## 4. `status` — a FK that reads like a string

The column became `review_session_employee_status_id`, but the model keeps a
**read-only property**:

```python
@property
def status(self) -> str:
    return self.status_rel.key if self.status_rel else ""
```

That one property is why the move was small: all ~39 read sites
(`record.status != "open"`, `RSE_VALID_TRANSITIONS`, filters, the API field) are
untouched, and only the **3 write sites** changed to
`record.review_session_employee_status_id = await self._status_id(key)`.

There is deliberately **no setter**: a stray `record.status = "open"` must fail
loudly rather than silently write nothing.

`_status_id()` resolves BY KEY and raises `ReviewSessionEmployeeStatusKeyNotFound`
on an unknown one — a typo is now a hard failure at the write instead of an
unreadable row, which the old varchar happily accepted.

The API exposes **both** `review_session_employee_status_id` and `status`,
mirroring `ReviewSession` — so `rseStatus.ts` and the whole frontend status
machine needed no change at all.

## 5. Write paths

Each row-backed group has its own endpoint, because each is a set of rows rather
than a field on the record:

| endpoint | shape | strategy |
|---|---|---|
| `PATCH /{rse_id}/fields` | the remaining scalars | plain setattr |
| `PUT /{rse_id}/dimensions` | `{items:[…]}` full desired state | delete-then-insert, one transaction |
| `PUT /{rse_id}/results` | `{items:[{text}]}` | delete-then-insert; `sort_order` = payload index |
| `PUT /{rse_id}/feedbacks` | `{items:[{type_id,text}]}` | **upsert** per voice; blank text DELETES that row |

**Why delete-then-insert for dimensions/results but upsert for feedback.**
Nothing keys on dimension/result row ids (the frontend keys on `dimension_key`),
and neither has an audit trail, so there is no consumer for row identity. Feedback
is upserted because the pair (review, voice) is UNIQUE and a blank box must leave
*no* row — that is how "cleared" is represented without a nullable column.

All four go through **`_assert_rse_writable(rse_id)`**, which is two separate
checks and neither has an `{employee_id}` in the path for a route guard to scope
on:

- **visibility** — an out-of-scope record must not be writable by walking
  sequential ids, and it raises NotFound (not 403) so the reply does not confirm
  the record exists;
- **editability** — a reviewed/closed record, or one in a closed session, is
  frozen. Raises `EvaluationNotEditable`, the same message the evaluation write
  path uses, since to the user it is one editable surface.

### `flip_competence`

Re-rating a competence so it moves to the opposite side stays **atomic**: in one
transaction the descriptor score is set, the leaving side's dimension column is
cleared (`facts` for strong, `improvement` for develop) and the row on the
leaving side is DELETED (its comments cascade). `leaving_side` (a
`Literal["strong","develop"]`) became **`leaving_type_id: int`**, consistent with
dropping side literals from the wire; the type's *key* still decides which
column is cleared, because that part genuinely is code.

## 6. Reads and the N+1 rule

`rse_dimensions`, `results` and `feedbacks` are all **`lazy="noload"`**. The
session roster loads many RSE rows at once, and selectin-loading each row's
lists (and each dimension's comments, and each comment's dimension) would
reintroduce the documented people-review N+1.

`status_rel` is the exception — **`selectin`** — because the `status` property
reads it on every record including the roster. Three seeded rows, so it costs
one extra query for the whole page, not one per row.

`_to_schema` is **synchronous** and called from seven places, so it can never
await a noload relationship. The pattern:

- `_to_schema(record, dimensions=None, results=None, feedbacks=None)` never
  queries;
- `_detail_schema(record, rse_id)` loads all three and calls it — every path
  returning a populated `RSESchema` goes through this one method, so a new
  row-backed list is added in one place instead of at eight call sites.

`ReviewSessionEmployeeList` (the roster) deliberately carries none of them.

## 7. TEMPO album — the seam

Every album artifact (`tempo_html`, `tempo_pdf`, `tempo_pptx`, PNG, session
presentation) reads a flat dict built by `_tempo_data`. **The dict keys and
their value shapes were kept identical** through all five moves, so none of the
renderers were touched:

| dict key | now derived from |
|---|---|
| `strengths_items` / `development_items` | `_load_rse_dimensions` → `[{name,color,comments}]` |
| `strengths` / `development_directions` | `_rse_dimensions_text()` → `"• line\n• line"` |
| `results_achievements` | `_rse_results_text()` → `"1. x\n2. y"` (numbering derived from position) |
| `training_done` | assigned trainings + `_tempo_recommended_training_lines()` |
| `employee_feedback` / `manager_feedback` | the feedback rows, looked up by type key |

> **Lesson recorded on purpose.** Two separate 500s reached the user because a
> scripted edit to `_tempo_data` silently did not apply, and the verification
> exercised the new *helper* directly instead of building an album. `_tempo_data`
> is the single choke point for all five artifacts — after touching anything it
> reads, build an actual album, and confirm edits by grepping for the absence of
> the OLD text, not the presence of the new.

## 8. Migration history

Each move is three steps, never two, so a database still holding data always has
somewhere to move it to. Had one revision both created the tables and dropped the
column, every existing value would have been destroyed on upgrade.

| revision | what |
|---|---|
| `734db0819941` | create the three competence-summary tables |
| *(script)* | `migrate_competence_summaries.py` — 74 reviews → **295** rows, **973** comments, 0 unresolved |
| `c30e360e7d76` | drop `competence_summary` |
| `d2aa0d84c8c9` | **rename** the three tables + 2 FK columns (see §9) |
| `6ddd436a5232` | create results + recommended-training tables |
| *(script)* | `migrate_results_and_trainings.py` — **294** results, **147** recommendations |
| `9fc8d31b01a0` | drop `results_achievements`, `trainings` |
| `92272f5c7c50` | create status/feedback tables + **nullable** `status_id` |
| *(script)* | `migrate_status_and_feedback.py` — 74 backfilled (0 unrecognised), **147** feedback rows |
| `9976b2934c34` | tighten `status_id` to NOT NULL + drop `status`, both feedback columns |

The data scripts were **deleted after use** — with their source columns gone they
could only fail. Recoverable from git history if another environment needs them.
Each was idempotent and `--dry-run`-first.

`9976b2934c34` carries a **guard**: it refuses to run while any row still has a
NULL `status_id`, so applying it without the data move fails loudly instead of
dropping the column the move reads from.

> Every `downgrade()` recreates its columns EMPTY. The text cannot be restored —
> the reverse conversion is not implemented and, for the feedback, not even well
> defined. `pg_dump -t review_session_employees` snapshots are in `backups/`.

## 9. The rename, and what it taught

The competence-summary tables were first called `competence_summary_types` /
`review_summary_competences` / `review_summary_competence_comments`. Three
problems, all real:

1. the essence is `dimension` everywhere else (`review_dimensions`), so
   "competence" was a second word for one concept;
2. strong / to-develop is **not a property of a dimension** — it is how *one
   employee's* dimension stands *in one review*, which the old names hid;
3. a dimension means the same thing here as in the general list, so "summary"
   added nothing.

`d2aa0d84c8c9` is a **pure rename** — hand-written, the one standing exception
to the autogenerate rule, because autogenerate cannot recognise a rename and
would have emitted drop+create, destroying all 295 rows. Constraint and index
names were renamed too (Postgres keeps the old ones through a table rename), so
a later autogenerate shows **zero drift**.

## 10. Access & essences

New essence keys, granted to admin via `seed_admin_guards.py`:
`employee_recommended_training`, `employee_recommended_training_status`.
The review-record tables need none — they are reached only through the RSE
service, which is already scoped.

## 11. Seeds

| seed | rows |
|---|---|
| `seed_review_session_employee_dimension_types.py` | strong, develop |
| `seed_rse_statuses_and_feedback_types.py` | open/reviewed/closed + employee/manager |
| `seed_recommended_training_statuses.py` | recommended (default), planned, in_process, passed |
| `seed_review_session_employee_dimension_translations.py` | UK+EN, upsert |
| `seed_recommended_training_translations.py` | UK+EN, upsert |

The translation seeds are **upserts**, not insert-only, so wording this change
owns can be corrected in place — which mattered when the keys were first seeded
under their pre-rename names.

> The dimension-type seed is a **hard prerequisite for the evaluation page to
> render**: the draft cannot be split into its two sides without those rows, so
> the page shows an explicit error card rather than a blank review.

## 12. Consequences worth knowing

- **TEMPO albums are not snapshots.** Re-exporting an album for a closed session
  renders the employee's *current* recommended trainings (and missions). That
  follows from employee-level ownership; freezing them would be a separate
  decision.
- **A third side or voice is now cheap** — a seeded row plus a translation. No
  schema change, no migration, no frontend type change. What it would NOT get
  for free is a ranking rule (strong ranks descending, develop ascending), which
  is why the keys remain a code contract.
- **Deleting a competence can now be refused.** Anyone tidying
  `review_dimensions` will hit the block; the message tells them to deactivate.

## 13. Not done

- No admin CRUD pages (`/fe-essence`) for the three lookups — see the note in §3.
  Read-only `GET`s exist; adding editable grids means accepting that a renamed
  key breaks rules resolving by key.
- `employee_mission_dimension_links.dimension_id` still CASCADEs (§2).
- Manual verification still outstanding at the time of writing: the browser
  round-trip for the feedback boxes, status chips, the results drag-reorder and
  the recommended-trainings permission branches (employee vs oversight vs
  delete), which need a user with an **active people-review mode** — the admin
  bypass user has none, so those paths 404 for it by design.
