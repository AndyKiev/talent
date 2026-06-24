from typing import TypeVar, Generic, Optional
from pydantic import BaseModel

DataT = TypeVar("DataT")


class MutationResponse(BaseModel, Generic[DataT]):
    """
    Wrapper returned by all mutating endpoints (POST, PATCH).

    Shape:
        {
            "detail": "Employee status 'Active' successfully created",
            "data": { ...schema fields... }
        }

    The `detail` key is intentionally aligned with how FastAPI surfaces
    HTTPException messages, so the existing Axios response interceptor
    (which reads `error.response?.data?.detail`) works without changes.
    """

    detail: str
    data: DataT
