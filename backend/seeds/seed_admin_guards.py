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
# Lookups go through AccessGraph (see backend/seeds/access_graph.py), which
# preloads the whole graph with column-only selects. Entity selects here are
# pathological: the access tables form a cycle of lazy="selectin" relationships,
# so loading one row drags in admin's entire grant neighbourhood.
#
import asyncio

from sqlalchemy import select

from backend.database.db_helper import db_helper
from backend.api_v1.operation.operation_model import Operation
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.seeds.access_graph import AccessGraph

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


async def main():
    async with db_helper.session_factory() as s:
        # Column selects, not entity selects — see AccessGraph.
        group_id = (
            await s.execute(select(UserGroup.id).where(UserGroup.name == TARGET_GROUP))
        ).scalar_one_or_none()
        if not group_id:
            raise SystemExit(f"user group {TARGET_GROUP!r} not found")

        ops = {n: i for n, i in (await s.execute(select(Operation.name, Operation.id)))}
        acc = AccessGraph(s)
        await acc.load()

        granted = 0
        for essence_name, verbs in SPEC.items():
            essence_id = await acc.essence_id(essence_name)
            set_id = await acc.set_id([essence_id])
            for verb in verbs:
                op_id = ops.get(verb)
                if not op_id:
                    raise SystemExit(
                        f"operation {verb!r} missing from operations table"
                    )
                oesl_id = await acc.oesl_id(op_id, set_id)
                if acc.grant(group_id, oesl_id):
                    granted += 1
                    print(f"  grant {TARGET_GROUP}: ({verb}, {{{essence_name}}})")
        await s.commit()
        print(f"done. new grants added: {granted}")


if __name__ == "__main__":
    asyncio.run(main())
