# backend/api_v1/msg_bulk/msg_bulk_schema.py
from typing import List, Optional
from pydantic import BaseModel


class BulkImportResult(BaseModel):
    success_count: int
    error_count: int
    total_processed: int
    errors: Optional[List[str]] = None
