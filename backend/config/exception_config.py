from pydantic import BaseModel

from backend.config.exception_descriptions import (
    GeneralExceptionDescription,
    ServerExceptionDescription,
    ClientExceptionDescription,
)


class ExceptionDescription(BaseModel):
    general: GeneralExceptionDescription = GeneralExceptionDescription()
    server: ServerExceptionDescription = ServerExceptionDescription()
    client: ClientExceptionDescription = ClientExceptionDescription()
