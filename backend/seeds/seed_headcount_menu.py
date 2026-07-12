"""
Seed the headcount-plan sub-menu: two children under the existing 'employees'
menu item. With children present, 'employees' renders as a dropdown (parents
with children never navigate in AppShell), so the employees LIST page moves to
its own child row:

  employees
  ├── employees_list  /employees                 (all groups — mirrors parent)
  └── headcount_plan  /employees/headcount_plan  (dev / admin / HRS / HRM only)

When the headcount_plan_enabled setting is OFF, MenuService.get_my_menus drops
BOTH children and 'employees' behaves exactly as before. Idempotent.
"""

from pathlib import Path
import sys

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import asyncio

from sqlalchemy import func, select

from backend.database.db_helper import db_helper
from backend.api_v1.menu.menu_model import Menu
from backend.api_v1.table_relationship_links.menu_user_group_link_model import (
    MenuUserGroupLink,
)
from backend.api_v1.user_group.user_group_model import UserGroup

HEADCOUNT_GROUP_NAMES = ("dev", "admin", "hrs", "hrm")

CHILD_MENUS = [
    {
        "key": "employees_list",
        "label_key": "employeesList",
        "path": "/employees",
        "icon": "people",
        "sort_order": 10,
        "visible_to_all_groups": True,
        "group_names": None,
    },
    {
        "key": "headcount_plan",
        "label_key": "headcountPlan",
        "path": "/employees/headcount_plan",
        "icon": "insights",
        "sort_order": 20,
        "visible_to_all_groups": False,
        "group_names": HEADCOUNT_GROUP_NAMES,
    },
]


async def seed_headcount_menu():
    async with db_helper.session_factory() as session:
        parent = await session.scalar(select(Menu).where(Menu.key == "employees"))
        if parent is None:
            print("Menu 'employees' not found — run the menus seed first. Aborting.")
            return

        group_id_by_name = {
            name: gid
            for name, gid in (
                await session.execute(
                    select(func.lower(UserGroup.name), UserGroup.id).where(
                        func.lower(UserGroup.name).in_(HEADCOUNT_GROUP_NAMES)
                    )
                )
            ).all()
        }

        for item in CHILD_MENUS:
            menu = await session.scalar(select(Menu).where(Menu.key == item["key"]))
            if menu is None:
                menu = Menu(
                    key=item["key"],
                    label_key=item["label_key"],
                    path=item["path"],
                    icon=item["icon"],
                    parent_id=parent.id,
                    sort_order=item["sort_order"],
                    is_active=True,
                    visible_to_all_groups=item["visible_to_all_groups"],
                    visible_to_regular=False,
                )
                session.add(menu)
                await session.flush()
                print(f"Seeded menu: {item['key']}")
            else:
                print(f"Menu '{item['key']}' already seeded, skipping.")

            if not item["group_names"]:
                continue
            existing_group_ids = {
                row
                for row in (
                    await session.execute(
                        select(MenuUserGroupLink.user_group_id).where(
                            MenuUserGroupLink.menu_id == menu.id
                        )
                    )
                ).scalars()
            }
            for name in item["group_names"]:
                gid = group_id_by_name.get(name)
                if gid is None:
                    print(f"User group '{name}' not found — skipped for {item['key']}.")
                    continue
                if gid in existing_group_ids:
                    continue
                session.add(MenuUserGroupLink(menu_id=menu.id, user_group_id=gid))
                print(f"Linked menu '{item['key']}' -> group '{name}' (id={gid})")

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed_headcount_menu())
