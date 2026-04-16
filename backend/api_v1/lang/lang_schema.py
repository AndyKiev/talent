from pydantic import BaseModel, ConfigDict, Field

class LangBase(BaseModel):
    name: str = Field(None, examples=["str"])
    short_name: str = Field(None, examples=["str"])

class LangRead(LangBase):
    model_config = ConfigDict(from_attributes=True)
    id: int = Field(..., examples=["int"])

class LangCreate(LangBase):
    pass