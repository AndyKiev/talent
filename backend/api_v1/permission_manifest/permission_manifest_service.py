# backend/api_v1/permission_manifest/permission_manifest_service.py
#
# Read-only introspection service. NOT a CRUD essence, so it deliberately does
# NOT extend BaseService — it only needs a session to read the operations /
# essences tables for the seed diff. Everything else is computed by walking the
# live FastAPI route table and reading the metadata that has_access_set stamps
# onto every guard dependency (_is_access_guard / _access_operation /
# _access_essences). Nothing here writes to the database.
#
from typing import Iterable

from fastapi.routing import APIRoute
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.operation.operation_model import Operation
from backend.api_v1.essence.essence_model import Essence


# ── Pure route-walking helpers ────────────────────────────────────────────────


def _iter_dependants(dependant):
    """Depth-first walk over a route's dependant tree (signature + decorator deps)."""
    yield dependant
    for sub in dependant.dependencies:
        yield from _iter_dependants(sub)


def _route_guards(route: APIRoute) -> list[tuple[str, tuple[str, ...]]]:
    """
    Every access guard on a route, as (operation, (essence, ...)) tuples.

    A guard is any dependency callable carrying the `_is_access_guard` stamp set
    inside has_access_set(). This catches all three call styles —
        Guard(...) in dependencies=[],
        Depends(has_access_set(...)) in the signature,
        legacy has_access(...) shim
    — because every one of them routes through has_access_set and is stamped there.
    """
    found: list[tuple[str, tuple[str, ...]]] = []
    for dep in _iter_dependants(route.dependant):
        call = dep.call
        if getattr(call, "_is_access_guard", False):
            guard = (call._access_operation, tuple(call._access_essences))
            if guard not in found:
                found.append(guard)
    return found


def _collect_endpoints(
    routes: Iterable,
) -> tuple[list[dict], set[str], set[str], int]:
    endpoints: list[dict] = []
    referenced_ops: set[str] = set()
    referenced_essences: set[str] = set()
    unguarded = 0

    for route in routes:
        if not isinstance(route, APIRoute):
            continue

        guards = _route_guards(route)
        if not guards:
            unguarded += 1
            continue

        perms: list[dict] = []
        for op, essences in guards:
            referenced_ops.add(op)
            referenced_essences.update(essences)
            perms.append({"operation": op, "essences": list(essences)})

        methods = sorted(
            m for m in (route.methods or set()) if m not in {"HEAD", "OPTIONS"}
        )
        for method in methods:
            endpoints.append(
                {
                    "method": method,
                    "path": route.path,
                    "name": route.name,
                    "summary": (route.summary or route.name or ""),
                    "permissions": perms,
                }
            )

    endpoints.sort(key=lambda e: (e["path"], e["method"]))
    return endpoints, referenced_ops, referenced_essences, unguarded


def _distinct_permissions(endpoints: list[dict]) -> list[dict]:
    """Collapse endpoints down to the unique (operation, essence-set) permissions."""
    bucket: dict[str, dict] = {}
    for ep in endpoints:
        for p in ep["permissions"]:
            essences = sorted(p["essences"])
            key = f'{p["operation"]}::{"+".join(essences)}'
            entry = bucket.setdefault(
                key,
                {
                    "key": key,
                    "operation": p["operation"],
                    "essences": essences,
                    "endpoints": [],
                },
            )
            ref = f'{ep["method"]} {ep["path"]}'
            if ref not in entry["endpoints"]:
                entry["endpoints"].append(ref)

    permissions = list(bucket.values())
    for entry in permissions:
        entry["endpoint_count"] = len(entry["endpoints"])
    permissions.sort(key=lambda e: (e["operation"], e["essences"]))
    return permissions


# ── Service ───────────────────────────────────────────────────────────────────


class PermissionManifestService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _db_catalog(self) -> tuple[set[str], set[str]]:
        ops = set((await self.session.execute(select(Operation.name))).scalars().all())
        essences = set(
            (await self.session.execute(select(Essence.name))).scalars().all()
        )
        return ops, essences

    async def build(self, app) -> dict:
        endpoints, ref_ops, ref_essences, unguarded = _collect_endpoints(app.routes)
        permissions = _distinct_permissions(endpoints)
        db_ops, db_essences = await self._db_catalog()

        return {
            "summary": {
                "guarded_endpoints": len(endpoints),
                "unguarded_endpoints": unguarded,
                "distinct_permissions": len(permissions),
            },
            "seed": {
                "missing_operations": sorted(ref_ops - db_ops),
                "missing_essences": sorted(ref_essences - db_essences),
            },
            "permissions": permissions,
            "endpoints": endpoints,
        }
