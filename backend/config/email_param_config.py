from pydantic import BaseModel, EmailStr, Field


class LocalSmtpConfig(BaseModel):
    hostname: str
    port: int


class SenderMailConfig(BaseModel):
    talent_reminder_sender: str = "talent_reminder@auchan.ua"


class LogMailConfig(BaseModel):
    recipient: EmailStr


class LoaderErrorMailConfig(BaseModel):
    sender: EmailStr
    receiver: str