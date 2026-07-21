# backend/seeds/seed_admin_guards.py
#
# Idempotent grant seeder for the admin-CRUD endpoint-guarding pass.
#
# For each essence in SPEC it ensures the full grant chain exists and is held
# by the target user group (default 'admin'):
#
#   essences row
#     -> essence_sets (fingerprint = str(essence_id))  + essence_set_members
#       -> operation_essence_set_links (one per verb)
#         -> user_group_operation_essence_set_links (grant to the group)
#
# Re-runnable: every step is get-or-create, so running twice adds nothing.
#
import asyncio

from sqlalchemy import select
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

# essence name -> verbs to grant
SPEC: dict[str, list[str]] = {
    "setting_value_type": ["view", "create", "modify", "delete"],
    "process": ["view", "create", "modify", "delete"],
    "process_role": ["view", "create", "modify", "delete"],
    "process_role_holder": ["view", "create", "modify", "delete", "link"],
    "app_setting": ["create", "modify", "delete"],
    "language_level": ["create", "modify", "delete"],
    "review_dimension": ["create", "modify", "delete"],
    "review_dimension_criterion": ["create", "modify", "delete"],
    "review_level": ["create", "modify", "delete"],
    "review_level_requirement": ["create", "modify", "delete"],
    # Employee development missions. Admin holds full CRUD so a mistake made by an
    # oversight manager can be fixed; every admin write is still change_log'd.
    "employee_mission": ["view", "create", "modify", "delete"],
    "employee_mission_kpi": ["view", "create", "modify", "delete"],
    "employee_mission_dimension_link": ["view", "create", "modify", "delete", "link"],
    "employee_mission_comment": ["view", "create", "modify", "delete"],
    "employee_development_vision": ["view", "create", "modify", "delete"],
    "employee_mission_history": ["view"],
}

TARGET_GROUP = "admin"


async def _get_or_create_essence(s, name: str) -> Essence:
    e = (
        await s.execute(select(Essence).where(Essence.name == name))
    ).scalar_one_or_none()
    if not e:
        e = Essence(name=name, description=name)
        s.add(e)
        await s.flush()
        print(f"  + essence {name} (id={e.id})")
    return e


async def _get_or_create_single_set(s, essence: Essence) -> EssenceSet:
    fp = str(essence.id)
    es = (
        await s.execute(select(EssenceSet).where(EssenceSet.fingerprint == fp))
    ).scalar_one_or_none()
    if not es:
        es = EssenceSet(fingerprint=fp)
        s.add(es)
        await s.flush()
        s.add(EssenceSetMember(essence_set_id=es.id, essence_id=essence.id))
        await s.flush()
        print(f"  + essence_set {fp} for {essence.name}")
    return es


async def _get_or_create_oesl(
    s, op: Operation, es: EssenceSet
) -> OperationEssenceSetLink:
    oesl = (
        await s.execute(
            select(OperationEssenceSetLink).where(
                OperationEssenceSetLink.operation_id == op.id,
                OperationEssenceSetLink.essence_set_id == es.id,
            )
        )
    ).scalar_one_or_none()
    if not oesl:
        oesl = OperationEssenceSetLink(operation_id=op.id, essence_set_id=es.id)
        s.add(oesl)
        await s.flush()
    return oesl


async def main():
    async with db_helper.session_factory() as s:
        group = (
            await s.execute(select(UserGroup).where(UserGroup.name == TARGET_GROUP))
        ).scalar_one_or_none()
        if not group:
            raise SystemExit(f"user group {TARGET_GROUP!r} not found")

        ops = {o.name: o for o in (await s.execute(select(Operation))).scalars().all()}

        granted = 0
        for essence_name, verbs in SPEC.items():
            essence = await _get_or_create_essence(s, essence_name)
            es = await _get_or_create_single_set(s, essence)
            for verb in verbs:
                op = ops.get(verb)
                if not op:
                    raise SystemExit(
                        f"operation {verb!r} missing from operations table"
                    )
                oesl = await _get_or_create_oesl(s, op, es)
                existing = (
                    await s.execute(
                        select(UserGroupOperationEssenceSetLink).where(
                            UserGroupOperationEssenceSetLink.user_group_id == group.id,
                            UserGroupOperationEssenceSetLink.operation_essence_set_link_id
                            == oesl.id,
                        )
                    )
                ).scalar_one_or_none()
                if not existing:
                    s.add(
                        UserGroupOperationEssenceSetLink(
                            user_group_id=group.id,
                            operation_essence_set_link_id=oesl.id,
                        )
                    )
                    granted += 1
                    print(f"  grant {TARGET_GROUP}: ({verb}, {{{essence_name}}})")
        await s.commit()
        print(f"done. new grants added: {granted}")


if __name__ == "__main__":
    asyncio.run(main())
