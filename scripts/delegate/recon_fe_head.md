```json
{
  "max_iterations": 1,
  "allow_paths": [],
  "validate": []
}
```

# Objective

RECON ONLY. Write no files. Read the React/TypeScript source below and return a
compact digest another engineer can work from WITHOUT opening the source.

Output plain markdown, no ```file: blocks. Exhaustive on facts, terse on prose.
Hard limit: 130 lines. Mark anything you had to guess with "(assumed)".

Return exactly these sections:

## Components
Per file: exported symbols, prop interface (`name: type` lines, mark optional),
and one sentence on what it renders.

## Value-type handling
For the settings editors: EXACTLY which `value_type_key` values are handled and
what widget each renders. State explicitly which types fall through to nothing
(a type with no editor is the single most important fact here).

## optionsBySource
How option sets are registered and keyed, with the exact literal keys present.

## ReorderableList contract
Its full prop list, what it emits on drop/arrow actions (indices? new array?
ids?), whether order state is local or controlled, and whether it fires one
callback per move or a whole-list callback.

## Query keys / mutations
Which query keys are read and invalidated, and the api functions called.

## Traps
Anything that would make a naive reuse of these components break.

# Source

