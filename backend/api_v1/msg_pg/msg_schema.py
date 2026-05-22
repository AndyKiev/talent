from pydantic import BaseModel, ConfigDict, Field


class MsgBase(BaseModel):
    value: str = Field(..., examples=["Translation text"])
    msg_key_id: int = Field(..., examples=[1])
    lang_id: int = Field(..., examples=[1])


class MsgCreate(MsgBase):
    pass


class MsgUpdate(MsgBase):
    pass


class Msg(MsgBase):
    model_config = ConfigDict(from_attributes=True)
    id: int