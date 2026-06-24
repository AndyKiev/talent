from __future__ import annotations

from typing import Optional
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Top-level org-unit resolution.
#
# An employee's "main department" (for display) is derived by walking UP the
# department tree from their actual department until we reach the first node —
# the node itself included — whose category key is one of these. So:
#   - someone deep in office_departments  -> their directorate
#   - someone deep in store_departments   -> their store
#   - someone sitting AT a directorate    -> that directorate
#   - someone sitting AT a store          -> that store
#   - someone sitting AT the board        -> the board
# ---------------------------------------------------------------------------

TOP_ORG_UNIT_KEYS: frozenset[str] = frozenset({"board", "directorate", "store"})


class TopOrgUnit(BaseModel):
    """Slim resolved top-level org unit (board / directorate / store)."""
    id: int
    name: str


# `index` maps department id -> (parent_id, name, category_key) for every
# department, so the walk never touches a lazy relationship.
DepartmentIndex = dict[int, tuple[Optional[int], str, str]]


def resolve_top_org_unit(
    department_id: int,
    index: DepartmentIndex,
) -> Optional[TopOrgUnit]:
    """
    Walk up the parent chain from `department_id` until a department whose
    category key is in TOP_ORG_UNIT_KEYS is found (the starting node counts).
    Returns it as (id, name), or None if the chain ends — or a cycle is hit —
    without a match.
    """
    seen: set[int] = set()
    current: Optional[int] = department_id
    while current is not None and current in index and current not in seen:
        seen.add(current)
        parent_id, name, key = index[current]
        if key in TOP_ORG_UNIT_KEYS:
            return TopOrgUnit(id=current, name=name)
        current = parent_id
    return None
