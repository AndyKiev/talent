from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EmployeeTrainingBase(BaseModel):
    employee_id: int
    training_type_id: int
    training_status_id: int


class EmployeeTrainingCreate(EmployeeTrainingBase):
    pass


class EmployeeTrainingUpdate(BaseModel):
    training_status_id: int | None = None


class EmployeeTraining(EmployeeTrainingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    training_type_name: str | None = None
    training_status_key: str | None = None


class TrainingStateRow(BaseModel):
    """One employee "supposed to pass" a given training type, with their status.

    `status_key` is the real employee_training_status key (e.g. planned /
    in_process / passed) or the synthetic ``not_planned`` when no assignment
    row exists yet. `main_department_*` is the resolved top org unit
    (board / directorate / store) used to GROUP the stats; `direct_department_name`
    is the employee's actual main department (the leaf where they work) and
    `job_name` their current job — both shown in the grid. `department_category_*`
    / `department_type_name` are kept only to SORT the flat list.
    """

    employee_id: int
    employee_name: str
    employee_code: str
    main_department_id: int | None = None
    main_department_name: str | None = None
    # Category sort_order of the RESOLVED top unit (store/directorate/board) —
    # used to order the main-department filter Select by category.
    main_department_category_sort_order: int = 0
    direct_department_name: str | None = None
    job_name: str | None = None
    department_category_key: str | None = None
    department_category_name: str | None = None
    department_category_sort_order: int = 0
    department_type_name: str | None = None
    status_key: str
