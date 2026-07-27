```json
{
  "max_iterations": 1,
  "allow_paths": [],
  "validate": []
}
```

# Objective

RECON ONLY. Write no files. Read the source below and return a compact digest
that another engineer can work from WITHOUT opening the source.

Output plain markdown, no ```file: blocks. Be exhaustive on facts, terse on prose.
Hard limit: 120 lines. Mark anything you had to guess with "(assumed)".

Return exactly these sections:

## Endpoints
One row per route, in declaration order:
`| METHOD | full path (router prefix + route path) | query/body params | success status | response shape |`
List EVERY route. If a route does NOT exist (e.g. no GET by id), say so
explicitly under the table — a missing route is the single most important fact
for a test author.

## Schemas
Per Pydantic schema: name, then `field: type` lines. Mark validation constraints
(ge/le/max_length) explicitly.

## Rules enforced in service code
Numbered. Condition → HTTP status. Distinguish Pydantic rejections (422) from
service-raised domain errors. Use ONLY the error-to-status mapping given below;
do not infer it from convention.

## Ids a test must obtain
What is needed before a record can be created, and the least fragile way to get
it over HTTP.

## Traps
Anything that would make a naive test pass vacuously or fail for the wrong reason.

# Error-to-status mapping (authoritative — from backend/utils/create_fastapi_app.py)

- `NotFoundError` -> 404
- `AlreadyExistsError` -> **400** (NOT 409)
- `RelationshipError` -> 400
- `DomainError` -> 400
- Pydantic schema violation -> 422
- Missing/invalid token -> 401 · failed `Guard` -> 403

# Source

