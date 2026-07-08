# backend/utils/system_actor.py
"""Resolve the ROBOT system actor for scheduled / unattended scripts.

Scheduled scripts must never attribute their writes (employee_events.created_by,
change_sessions.triggered_by_user_id, ...) to a random human. They act as the
robot admin employee (origin_id = ROBOT_ORIGIN_ID; the seeded 'ADMIN' account).
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.employee.employee_model import Employee
from backend.api_v1.employee.employee_repository import EmployeeRepository
from backend.api_v1.employee.employee_schema import EmployeeSchema
from backend.api_v1.employee.employee_service import EmployeeService
from backend.api_v1.employee_origin.employee_origin_model import ROBOT_ORIGIN_ID

# The seeded robot/system account (employees.code).
SYSTEM_ACTOR_CODE = "ADMIN"


async def get_system_actor(session: AsyncSession) -> EmployeeSchema:
    """The robot employee scheduled scripts act as.

    Prefers the 'ADMIN' code; falls back to any robot-origin employee. Raises
    RuntimeError when no robot account exists — a scheduled script must fail
    loudly rather than write unattributed data.
    """
    orm_employee = await session.scalar(
        select(Employee).where(Employee.code == SYSTEM_ACTOR_CODE)
    )
    if orm_employee is None:
        orm_employee = await session.scalar(
            select(Employee).where(Employee.origin_id == ROBOT_ORIGIN_ID).limit(1)
        )
    if orm_employee is None:
        raise RuntimeError(
            "No robot system actor found (employee code 'ADMIN' / origin robot). "
            "Seed it before running scheduled scripts."
        )
    service = EmployeeService(
        repository=EmployeeRepository(session=session), session=session
    )
    return await service.get_by_id(orm_employee.id)
