from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.review_session_employee_feedback_type.review_session_employee_feedback_type_model import (
    ReviewSessionEmployeeFeedbackType,
)
from backend.database.db_helper import db_helper

router = APIRouter(
    prefix="/review_session_employee_feedback_types",
    tags=["Review Session Employee Feedback Types"],
    dependencies=[Depends(HTTPBearer(auto_error=False))],
)


class ReviewSessionEmployeeFeedbackTypeSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    name: str
    description: str = ""
    sort_order: int = 0


@router.get("", response_model=list[ReviewSessionEmployeeFeedbackTypeSchema])
async def list_rows(
    session: Annotated[AsyncSession, Depends(db_helper.session_getter)],
):
    """Read-only: the seeded rows in display order.

    Open to any authenticated user — the people-review page needs these ids and
    labels, and neither the reviewee nor their manager is necessarily an admin.
    There is deliberately no create/update/delete: the KEYS are a code contract
    (they drive the transition table / the two feedback boxes), so an editable
    row could silently break the rules that resolve by key.
    """
    rows = (
        await session.execute(
            select(ReviewSessionEmployeeFeedbackType).order_by(
                ReviewSessionEmployeeFeedbackType.sort_order,
                ReviewSessionEmployeeFeedbackType.id,
            )
        )
    ).scalars()
    return list(rows)
