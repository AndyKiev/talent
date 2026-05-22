# from pydantic import BaseModel, Field
from pydantic import BaseModel, ConfigDict, Field
class MsgKeyBase(BaseModel):
    name: str = Field(None, examples=["str"])

class MsgKeyCreate(MsgKeyBase):
    pass

class MsgKeyUpdate(MsgKeyBase):
    pass

class MsgKey(MsgKeyBase):
    # id: int = Field(..., examples=["int"])
    model_config = ConfigDict(from_attributes=True)
    id: int
