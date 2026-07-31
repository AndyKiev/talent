from pydantic import BaseModel, ConfigDict, Field


class EmployeeFact(BaseModel):
    """One numbered line. `review_session_employee_evaluation_id` is None while
    the fact is still in the unlinked pool — absence of a link row, not a
    nullable column on the fact itself."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    employee_fact_type_id: int
    # The KEY travels alongside the id, the way the other review lookups do, so
    # the frontend can split the two lists without hardcoding ids.
    employee_fact_type_key: str = ""
    text: str
    review_session_employee_evaluation_id: int | None = None
    sort_order: int = 0


class EmployeeFactCreate(BaseModel):
    employee_id: int
    employee_fact_type_id: int
    text: str = Field(..., min_length=1)
    # Optional: quick registration omits it (the fact lands in the pool); the
    # add-box under a competence sends it so the fact is linked on creation.
    review_session_employee_evaluation_id: int | None = None


class EmployeeFactUpdate(BaseModel):
    text: str | None = Field(None, min_length=1)
    employee_fact_type_id: int | None = None


class EmployeeFactLink(BaseModel):
    """Attach a fact to a competence. Without `sort_order` it goes to the end of
    that competence's list of the same kind."""

    review_session_employee_evaluation_id: int
    sort_order: int | None = None


class EmployeeFactReorder(BaseModel):
    """The desired order of ONE competence's list of ONE kind. The array index
    becomes `sort_order`, so the stored order is what the reader sees."""

    review_session_employee_evaluation_id: int
    employee_fact_type_id: int
    employee_fact_ids: list[int]
