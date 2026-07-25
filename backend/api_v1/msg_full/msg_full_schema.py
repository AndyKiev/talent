
from pydantic import BaseModel, ConfigDict, Field


class LangRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    short_name: str


class MsgItem(BaseModel):
    """Single translation entry in a FullMsg create/update payload — no msg_key_id needed, it comes from the parent."""

    value: str = Field(..., examples=["Translation text"])
    lang_id: int = Field(..., examples=[1])


class MsgItemRead(BaseModel):
    value: str
    lang_data: LangRead | None = None


class FullMsgCreate(BaseModel):
    name: str = Field(..., examples=["someMessageKey"])
    msg: list[MsgItem] | None = None


class FullMsgUpdate(BaseModel):
    name: str | None = Field(None, examples=["someMessageKey"])
    msg: list[MsgItem] | None = None


class FullMsgRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    msg: list[MsgItemRead] | None = None
