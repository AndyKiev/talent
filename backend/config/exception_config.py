from pydantic import BaseModel

from backend.config.exception_descriptions import (
    ClientExceptionDescription,
    GeneralExceptionDescription,
    ServerExceptionDescription,
)


class ExceptionDescription(BaseModel):
    general: GeneralExceptionDescription = GeneralExceptionDescription()
    server: ServerExceptionDescription = ServerExceptionDescription()
    client: ClientExceptionDescription = ClientExceptionDescription()
