"""Simulated heavy background process.

Sleeps 7 seconds (imitating real computation), then:
  1. Sends an email to the hardcoded recipient.
  2. Publishes a notification message to RabbitMQ.
"""
import asyncio
import logging

from backend.utils.rabbitmq import publish_notification

logger = logging.getLogger(__name__)

RECIPIENT_EMAIL = "andrey.bakulin@gmail.com"
RECIPIENT_CODE = "UKR7101004"


async def run_heavy_process() -> None:
    logger.info("Heavy process started, will take ~7 seconds...")
    await asyncio.sleep(7)
    logger.info("Heavy process finished computation.")

    # 1. Send email (best-effort — don't crash if SMTP unavailable)
    try:
        from backend.utils.send_mail import send_email
        from backend.config import settings

        await send_email(
            sender=settings.loader_error_mail.sender,
            receivers=RECIPIENT_EMAIL,
            subject="Process finished",
            body="The heavy background process has successfully finished its calculation.",
        )
        logger.info("Email sent to %s", RECIPIENT_EMAIL)
    except Exception as exc:
        logger.warning("Email sending failed (non-fatal): %s", exc)

    # 2. Publish notification to RabbitMQ
    await publish_notification(
        user_code=RECIPIENT_CODE,
        message="process successfully finished calculation",
    )
    logger.info("Notification published to RabbitMQ.")
