from typing import Union, IO, TYPE_CHECKING
import asyncio
from email.message import EmailMessage
import mimetypes
from pathlib import Path

import aiosmtplib
from pydantic import EmailStr

from backend.config import settings


async def send_email(
    sender: EmailStr,
    receivers: str,
    subject: str,
    body: str,
    attachment: Union[bytes, str, Path, IO[bytes], None] = None,
    filename: str = None,
    mime_type: str = None,
    msg_id: str = None,
    first_send: bool = False,
    queue=False,
):
    message = EmailMessage()
    message["From"] = sender
    message["To"] = receivers
    message["Subject"] = subject
    message.set_content(body)

    if queue and msg_id:
        message["Message-ID"] = msg_id
        if not first_send:
            message["In-Reply-To"] = msg_id
            message["References"] = msg_id

    if attachment:
        if isinstance(attachment, Path):
            data = attachment.read_bytes()
            filename = filename or attachment.name
            mime_type = mime_type or mimetypes.guess_type(attachment)[0]
        elif isinstance(attachment, str):
            path = Path(attachment)
            data = path.read_bytes()
            filename = filename or path.name
            mime_type = mime_type or mimetypes.guess_type(path)[0]
        elif hasattr(attachment, "read"):  # file-like
            data = attachment.read()
            filename = filename or getattr(attachment, "name", "attachment.bin")
            mime_type = mime_type or mimetypes.guess_type(filename)[0]
        elif isinstance(attachment, bytes):
            data = attachment
            filename = filename or "attachment.bin"
            mime_type = mime_type or mimetypes.guess_type(filename)[0]
        else:
            raise TypeError("Unsupported attachment type")

        maintype, subtype = (
            mime_type.split("/") if mime_type else ("application", "octet-stream")
        )

        message.add_attachment(
            data,
            maintype=maintype,
            subtype=subtype,
            filename=filename,
        )

    await aiosmtplib.send(
        message,
        hostname=settings.local_smtp.hostname,
        port=settings.local_smtp.port,
        start_tls=False,
    )


if __name__ == "__main__":
    asyncio.run(
        send_email(
            sender=settings.loader_error_mail.sender,
            receivers=settings.loader_error_mail.receiver,
            subject="TEST2",
            body="TEST2",
        )
    )
