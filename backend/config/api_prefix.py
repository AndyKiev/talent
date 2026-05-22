from pydantic import BaseModel


class ApiPrefix(BaseModel):
    books: str = "/books"
    doc_types: str = "/doc_types"
    settings: str = "/settings"
    supplier_edi: str = "/supplier_edi"
    # auth: str = "/auth"
    # rosters: str = "/settings"
    # catalogs: str = "/catalogs"
    # internal_referent: str = "/internal_referent"
    # external_referent: str = "/external_referent"
    # archives: str = "/archives"
    # margins: str = "/margins"
    # calculations: str = "/calculations"
    # dev_articles: str = "/developments"
