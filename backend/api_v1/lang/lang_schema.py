from pydantic import BaseModel, ConfigDict, Field
# from datetime import datetime


class LangBase(BaseModel):
    name: str = Field(..., max_length=100)
    short_name: str = Field(..., max_length=16)  # Validation pattern


class LangCreate(LangBase):
    pass


class LangUpdate(LangBase):
    pass


class Lang(LangBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

