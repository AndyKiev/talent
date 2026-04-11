from pydantic import BaseModel


class ApiPrefix(BaseModel):
    doc_types: str = "/doc_types"
    settings: str = "/settings"
    supplier_edi: str = "/supplier_edi"