from datetime import date

from pydantic import BaseModel, ConfigDict


class EvaluationInRSE(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dimension_id: int
    score: int | None = None
    facts: str | None = None
    improvement: str | None = None


class RseDimensionItem(BaseModel):
    """One dimension singled out for this employee, on one side.

    Deliberately a FLAT item carrying its side as `review_session_employee_dimension_type_id` —
    there are no `strong:` / `develop:` fields anywhere in this API. If the sides
    are a lookup table, baking two of them into schema field names would defeat
    the table. Consumers group by the type id; the list arrives ordered by
    (type sort_order, item sort_order).

    `dimension_name` / `dimension_color` are RESOLVED server-side in the caller's
    language, using the same rule the frontend applies to the competence tabs
    (message key `competence` + PascalCase dimension key, falling back to the
    review_dimensions row), so the two can never disagree.
    """

    review_session_employee_dimension_type_id: int
    review_session_employee_dimension_type_key: str
    dimension_id: int
    dimension_key: str
    dimension_name: str
    dimension_color: str
    sort_order: int = 0
    comments: list[str] = []


class RseDimensionInput(BaseModel):
    """Write-side item: ids and content only — name/colour are derived and are
    never accepted from the client."""

    review_session_employee_dimension_type_id: int
    dimension_id: int
    comments: list[str] = []


class RseDimensionsUpdate(BaseModel):
    """Full desired state of one review's singled-out dimensions. `sort_order`
    is each item's index WITHIN ITS TYPE, taken from the payload order."""

    items: list[RseDimensionInput] = []


class RseResultItem(BaseModel):
    """One result / achievement of this review, in display order.

    The UI numbers these ("1.", "2." …); that number is `sort_order`, never part
    of `text`. The old column serialized the numbering INTO the text, so every
    insert or delete meant re-parsing and renumbering the whole blob.
    """

    id: int
    text: str
    sort_order: int = 0


class RseResultInput(BaseModel):
    """Write-side item — just the text; position comes from the payload order."""

    text: str


class RseResultsUpdate(BaseModel):
    """Full desired state of one review's results list."""

    items: list[RseResultInput] = []


class RseFeedbackItem(BaseModel):
    """One voice's feedback on this review.

    Flat and type-driven, like the dimensions: the voice travels as
    `review_session_employee_feedback_type_id`, so there are no
    `employee_feedback:` / `manager_feedback:` fields anywhere in this API and a
    third voice would need no schema change. A voice with nothing written has NO
    item — absence is the empty state.
    """

    review_session_employee_feedback_type_id: int
    review_session_employee_feedback_type_key: str
    text: str


class RseFeedbackInput(BaseModel):
    """Write-side item. An empty/blank `text` DELETES that voice's row rather
    than storing an empty string."""

    review_session_employee_feedback_type_id: int
    text: str = ""


class RseFeedbacksUpdate(BaseModel):
    """Full desired state of one review's feedback."""

    items: list[RseFeedbackInput] = []


class ReviewSessionEmployeeBase(BaseModel):
    session_id: int
    employee_id: int


class ReviewSessionEmployeeCreate(ReviewSessionEmployeeBase):
    pass


class ReviewSessionEmployeeUpdate(BaseModel):
    status: str | None = None


class ReviewSessionEmployeeFieldsUpdate(BaseModel):
    """Employee-filled free-text fields for a review (feedback + results)."""

    # NOTE: no `employee_feedback` / `manager_feedback` here any more — both
    # became rows, saved through PUT /{rse_id}/feedbacks.
    # NOTE: no `results_achievements` / `trainings` here any more — both became
    # rows. Results are saved through PUT /{rse_id}/results; recommended
    # trainings live on their own employee-scoped endpoints.
    # NOTE: no `dimensions` here any more. It moved to its own
    # PUT /{rse_id}/dimensions, because it is a set of rows
    # (review_session_employee_dimensions) rather than a text field on this record.
    summary_full_competence_list: bool | None = None


class ReviewSessionEmployee(ReviewSessionEmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    # Both, mirroring ReviewSession: the id is what the DB stores, the key is
    # what every rule and the frontend status machine speak.
    review_session_employee_status_id: int
    status: str
    employee_name: str = ""
    employee_code: str = ""
    session_name: str = ""
    session_status: str = "open"
    # Employee-header facts, folded in here so the people-review page never has
    # to hit the admin-guarded GET /employees/{id}. Populated in _to_schema from
    # the (people-review-scoped) reviewee employee record.
    current_level_id: int | None = None
    birth_date: date | None = None
    hire_date: date | None = None
    job_assigned_date: date | None = None
    sex: str | None = None
    marital_status: str | None = None
    job_name: str | None = None
    main_department_name: str | None = None
    # Assembled from review_session_employee_feedbacks by the async callers.
    feedbacks: list[RseFeedbackItem] = []
    # Assembled from review_session_employee_results by the async callers.
    results: list[RseResultItem] = []
    # NOTE: no `trainings` here. Recommended trainings are EMPLOYEE-scoped now and
    # are read from /employee_recommended_trainings, not off the review record.
    # Assembled from review_session_employee_dimensions by the async callers — the
    # relationship is lazy="noload" so the roster path never pays for it.
    dimensions: list[RseDimensionItem] = []
    summary_full_competence_list: bool = False
    evaluations: list[EvaluationInRSE] = []


class ReviewSessionEmployeeList(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    session_id: int
    employee_id: int
    review_session_employee_status_id: int
    status: str
    employee_name: str = ""
    employee_code: str = ""
    scored_count: int = 0
    facts_count: int = 0
    total_dimensions: int = 0
    queue_position: int | None = None


class ReviewSessionEmployeeReorder(BaseModel):
    """Bulk presentation-queue reorder: the RSE ids in their new top-to-bottom
    presentation order. Positions are reassigned server-side as 10, 20, 30 …"""

    session_id: int
    ordered_ids: list[int]
