from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field
from backend.api_v1.lang.lang_schema import LangRead


class MsgBase(BaseModel):
    value: str = Field(..., examples=["str"])
    msg_key_id: int = Field(None, examples=["int"])
    lang_id: int = Field(None, examples=["int"])


class MsgCreate(MsgBase):
    pass


class MsgRead(MsgBase):
    id: int = Field(..., examples=["int"])


class MsgFullMsg(BaseModel):
    value: str = Field(..., examples=["str"])
    lang_data: Optional["LangRead"] = None


class MsgCreate1(BaseModel):
    value: str = Field(..., examples=["str"])
    lang_id: int = Field(..., examples=["int"])


class FullMsgRead(BaseModel):
    id: int = Field(..., examples=["int"])
    key_name: str = Field(None, examples=["str"])
    msg: Optional[List[MsgFullMsg]] = None


class FullMsgCreate(BaseModel):
    key_name: str = Field(None, examples=["str"])
    msg: Optional[List[MsgCreate1]] = None


class FullMsgUpdate(FullMsgCreate):
    pass





class MsgKeyBase(BaseModel):
    key_name: str = Field(None, examples=["str"])


class MsgKeyRead(MsgKeyBase):
    id: int = Field(..., examples=["int"])


class MsgKeyCreate(MsgKeyBase):
    pass


class MsgKeyUpdate(MsgKeyBase):
    pass
