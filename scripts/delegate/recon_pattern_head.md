```json
{
  "max_iterations": 1,
  "allow_paths": [],
  "validate": []
}
```

# Objective

RECON ONLY. Write no files. Below are the complete sources of several small
standalone Python example projects, each demonstrating ONE design pattern.
Return a compact digest another engineer can work from WITHOUT opening the source.

Output plain markdown, no ```file: blocks. Be exhaustive on facts, terse on prose.
Mark anything you had to guess with "(assumed)".

# Context

The reader maintains a FastAPI + async SQLAlchemy (asyncpg/Postgres) + Alembic
backend. Domain logic lives in per-entity vertical slices: `_model.py` (SQLAlchemy),
`_schema.py` (Pydantic), `_repository.py` (CRUD, inherits a BaseRepository),
`_service.py` (logic, inherits a BaseService), `_dependencies.py` (FastAPI Depends
providers), `_views.py` (router). They want to know which of these patterns is
worth adopting there, and what the code actually looks like.

# Output format

For EACH example directory, one section:

## <dirname> — <the pattern's real name>

**Problem** — 2-3 lines: the pain the "before"/"messy" file exhibits. Quote the
specific smell (e.g. "a 6-branch if/elif on a string type field").

**Mechanism** — 4-8 lines: how the refactored version works. Name the Python
features it leans on (Protocol, dataclass, Enum, `functools.singledispatch`,
generics/PEP 695 `type` aliases, `__init_subclass__`, descriptors, closures...).

**Code** — the SMALLEST set of excerpts that makes the mechanism reproducible:
- the core abstraction (the Protocol / base class / registry / generic helper) — near-verbatim
- ONE representative consumer showing the call site
Trim imports, docstrings, printing and `main()` demo scaffolding. Keep type
annotations exactly as written. Total 25-50 lines of code per pattern, in
```python fences.

**Before → after** — one line each on what shrank and what got harder.

**Fit for a FastAPI/SQLAlchemy backend** — 3-5 lines. Where it would attach
(service? repository? dependency provider? Pydantic schema?), and the honest
verdict: adopt / adopt narrowly / skip. Say plainly if the example only works
for in-memory objects and would fight an async ORM or a DB round-trip.

**Traps** — anything that breaks when states/keys are `str` rather than `Enum`,
when the code must be `async`, when instances come from a DB row rather than a
constructor, or that silently depends on module import order.

Then ONE final section:

## Cross-cutting

Where these patterns overlap or conflict with each other. Max 10 lines.

# Sources

