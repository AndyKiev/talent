from pydantic import BaseModel, Field


class EmployeeMissionCommentCreate(BaseModel):
    """POST /employee_mission_comments/mission/{mission_id}.

    The author is never supplied by the client — it is the authenticated user, so
    a comment cannot be attributed to somebody else.
    """

    text: str = Field(..., min_length=1)


class EmployeeMissionCommentUpdate(BaseModel):
    text: str = Field(..., min_length=1)
