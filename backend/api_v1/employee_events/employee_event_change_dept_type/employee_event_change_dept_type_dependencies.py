from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db_helper import db_helper
from backend.auth.jwt_auth import get_current_active_auth_user
from backend.api_v1.employee.employee_schema import EmployeeSchema as UserSchema
from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_repository import (
    EmployeeEventChangeDeptTypeRepository,
)
from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_service import (
    EmployeeEventChangeDeptTypeService,
)
from backend.api_v1.employee_events.employee_event_change_dept_type.employee_event_change_dept_type_schema import (
    EmployeeEventChangeDeptType as EmployeeEventChangeDeptTypeSchema,
)


async def get_employee_event_change_dept_type_service(
    session: AsyncSession = Depends(db_helper.session_getter),
    user: UserSchema = Depends(get_current_active_auth_user),
) -> EmployeeEventChangeDeptTypeService:
    return EmployeeEventChangeDeptTypeService(
        repository=EmployeeEventChangeDeptTypeRepository(session=session),
        user=user,
        session=session,
    )


async def employee_event_change_dept_type_by_id(
    employee_event_change_dept_type_id: int,
    service: EmployeeEventChangeDeptTypeService = Depends(
        get_employee_event_change_dept_type_service
    ),
) -> EmployeeEventChangeDeptTypeSchema:
    record = await service.get_by_id(employee_event_change_dept_type_id)
    return EmployeeEventChangeDeptTypeSchema.model_validate(record)
