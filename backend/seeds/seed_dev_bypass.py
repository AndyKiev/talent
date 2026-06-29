"""
Ensure the admin employee (UKR7101004) belongs to a "dev" group of type
"authorisation" so they bypass all set-grain permission checks.

Run from anywhere:

    python backend/seeds/seed_dev_bypass.py

Safe to run repeatedly (idempotent).
"""
import sys
from pathlib import Path

# Make `backend` importable regardless of cwd (repo root must be on path)
_repo_root = Path(__file__).resolve().parent.parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

import asyncio

from sqlalchemy import select

from backend.database.db_helper import db_helper
from backend.api_v1.user_group_type.user_group_type_model import UserGroupType
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.table_relationship_links.employee_user_group_link_model import (
    EmployeeUserGroupLink,
)


async def seed_dev_bypass():
    async with db_helper.session_factory() as session:
        # 1) Ensure "authorisation" user-group type exists
        stmt = select(UserGroupType).where(UserGroupType.name == "authorisation")
        result = await session.execute(stmt)
        ugt = result.scalar_one_or_none()
        if not ugt:
            ugt = UserGroupType(name="authorisation", description="Permission groups")
            session.add(ugt)
            await session.flush()
            print("Created UserGroupType: authorisation")
        else:
            print("UserGroupType 'authorisation' already exists")

        # 2) Ensure "dev" user group exists under "authorisation"
        stmt = select(UserGroup).where(UserGroup.name == "dev")
        result = await session.execute(stmt)
        dev_group = result.scalar_one_or_none()
        if not dev_group:
            dev_group = UserGroup(
                name="dev",
                description="Developer bypass group — skips all permission checks",
                user_group_type_id=ugt.id,
                is_protected=True,
            )
            session.add(dev_group)
            await session.flush()
            print("Created UserGroup: dev (authorisation)")
        else:
            if dev_group.user_group_type_id != ugt.id:
                dev_group.user_group_type_id = ugt.id
                session.add(dev_group)
                print("Fixed UserGroup 'dev' → type 'authorisation'")
            else:
                print("UserGroup 'dev' already exists (type: authorisation)")

        # 3) Ensure admin employee (UKR7101004) is linked to the dev group
        stmt = select(Employee).where(Employee.code == "UKR7101004")
        result = await session.execute(stmt)
        admin = result.scalar_one_or_none()
        if not admin:
            print("Admin employee UKR7101004 not found — skip link")
            return

        stmt = select(EmployeeUserGroupLink).where(
            EmployeeUserGroupLink.employee_id == admin.id,
            EmployeeUserGroupLink.user_group_id == dev_group.id,
        )
        result = await session.execute(stmt)
        link = result.scalar_one_or_none()
        if not link:
            link = EmployeeUserGroupLink(employee_id=admin.id, user_group_id=dev_group.id)
            session.add(link)
            await session.commit()
            print(f"Linked admin (UKR7101004, id={admin.id}) → dev group (id={dev_group.id})")
        else:
            print("Admin already linked to dev group")

        await session.commit()
        print("Done.")


if __name__ == "__main__":
    asyncio.run(seed_dev_bypass())
