# backend/seeds/seed_group_access.py
#
# Idempotent group-access seeder driven by the live guard manifest.
#
#   * admin  -> FULL access: granted every distinct (operation, essence-set)
#               permission that any endpoint guards on.
#   * HRM/HRS -> granted the review-setup + language essences (their people-
#               review / employee domain) with full CRUD. Developer-tier
#               essences (app_setting, setting_value_type, process*) stay
#               admin-only and are NOT granted here.
#
# Re-runnable: every step is get-or-create, running twice adds nothing.
#
import asyncio

from sqlalchemy import select
from backend.main import app
from backend.database.db_helper import db_helper
from backend.api_v1.essence.essence_model import Essence
from backend.api_v1.essence_set.essence_set_model import EssenceSet
from backend.api_v1.essence_set.essence_set_member_model import EssenceSetMember
from backend.api_v1.operation.operation_model import Operation
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_model import (
    OperationEssenceSetLink,
)
from backend.api_v1.table_relationship_links.user_group_operation_essence_set_link_model import (
    UserGroupOperationEssenceSetLink,
)
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.api_v1.permission_manifest.permission_manifest_service import (
    PermissionManifestService,
)

# HRM/HRS get these essences (single-essence sets) with full CRUD.
HR_ESSENCES = [
    "review_dimension",
    "review_dimension_criterion",
    "review_level",
    "review_level_requirement",
    "language_level",
]
HR_VERBS = ["view", "create", "modify", "delete"]
HR_GROUPS = ["HRM", "HRS"]


async def _essence_id(s, cache, name):
    if name in cache:
        return cache[name]
    e = (
        await s.execute(select(Essence).where(Essence.name == name))
    ).scalar_one_or_none()
    if not e:
        e = Essence(name=name, description=name)
        s.add(e)
        await s.flush()
    cache[name] = e.id
    return e.id


async def _get_or_create_set(s, essence_ids):
    ids = sorted(essence_ids)
    fp = "-".join(str(i) for i in ids)
    es = (
        await s.execute(select(EssenceSet).where(EssenceSet.fingerprint == fp))
    ).scalar_one_or_none()
    if not es:
        es = EssenceSet(fingerprint=fp)
        s.add(es)
        await s.flush()
        for eid in ids:
            s.add(EssenceSetMember(essence_set_id=es.id, essence_id=eid))
        await s.flush()
    return es


async def _get_or_create_oesl(s, op_id, set_id):
    oesl = (
        await s.execute(
            select(OperationEssenceSetLink).where(
                OperationEssenceSetLink.operation_id == op_id,
                OperationEssenceSetLink.essence_set_id == set_id,
            )
        )
    ).scalar_one_or_none()
    if not oesl:
        oesl = OperationEssenceSetLink(operation_id=op_id, essence_set_id=set_id)
        s.add(oesl)
        await s.flush()
    return oesl


async def _grant(s, group_id, oesl_id):
    existing = (
        await s.execute(
            select(UserGroupOperationEssenceSetLink).where(
                UserGroupOperationEssenceSetLink.user_group_id == group_id,
                UserGroupOperationEssenceSetLink.operation_essence_set_link_id == oesl_id,
            )
        )
    ).scalar_one_or_none()
    if not existing:
        s.add(
            UserGroupOperationEssenceSetLink(
                user_group_id=group_id,
                operation_essence_set_link_id=oesl_id,
            )
        )
        return 1
    return 0


async def main():
    async with db_helper.session_factory() as s:
        groups = {g.name: g for g in (await s.execute(select(UserGroup))).scalars().all()}
        ops = {o.name: o for o in (await s.execute(select(Operation))).scalars().all()}
        ecache: dict[str, int] = {}

        # ── admin: full access to every guarded permission ────────────────────
        manifest = await PermissionManifestService(s).build(app)
        admin = groups["admin"]
        admin_added = 0
        for perm in manifest["permissions"]:
            op = ops.get(perm["operation"])
            if not op:
                raise SystemExit(f"operation {perm['operation']!r} missing")
            eids = [await _essence_id(s, ecache, n) for n in perm["essences"]]
            es = await _get_or_create_set(s, eids)
            oesl = await _get_or_create_oesl(s, op.id, es.id)
            admin_added += await _grant(s, admin.id, oesl.id)
        print(f"admin: +{admin_added} grants (now full access, {len(manifest['permissions'])} perms)")

        # ── HRM/HRS: review-setup + language essences, full CRUD ──────────────
        for gname in HR_GROUPS:
            g = groups.get(gname)
            if not g:
                print(f"  (group {gname} not found, skipped)")
                continue
            added = 0
            for ename in HR_ESSENCES:
                eid = await _essence_id(s, ecache, ename)
                es = await _get_or_create_set(s, [eid])
                for verb in HR_VERBS:
                    oesl = await _get_or_create_oesl(s, ops[verb].id, es.id)
                    added += await _grant(s, g.id, oesl.id)
            print(f"{gname}: +{added} grants (review-setup + language, CRUD)")

        await s.commit()
        print("done.")


if __name__ == "__main__":
    asyncio.run(main())
