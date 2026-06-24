import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status

from backend.api_v1.notifications import notification_store as store
from backend.utils.heavy_process import run_heavy_process

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# ── Read-acknowledgement email config ─────────────────────────────────────────
SEND_READ_EMAIL: bool = True  # set False to disable entirely
READ_EMAIL_RECIPIENT: str = "andrey.bakulin@gmail.com"
# ──────────────────────────────────────────────────────────────────────────────


async def _send_read_email(notification_message: str, user_code: str) -> None:
    """Fire-and-forget email: notifies that a notification was read/deleted."""
    if not SEND_READ_EMAIL:
        return
    try:
        from backend.utils.send_mail import send_email
        from backend.config import settings

        body = (
            f"Your notification '{notification_message}' "
            f"has been read by {user_code} - person notified."
        )
        await send_email(
            sender=settings.loader_error_mail.sender,
            receivers=READ_EMAIL_RECIPIENT,
            subject="Notification acknowledged",
            body=body,
        )
        logger.info("Read-acknowledgement email sent for user %s", user_code)
    except Exception as exc:
        logger.warning("Read-acknowledgement email failed (non-fatal): %s", exc)


@router.get("")
async def get_notifications(user_code: str = "UKR7101004"):
    return store.get_all(user_code)


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, user_code: str = "UKR7101004"):
    notification = store.mark_read(user_code, notification_id)
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )
    asyncio.create_task(_send_read_email(notification.message, user_code))
    return {"ok": True}


@router.patch("/read_all/all")
async def mark_all_read(user_code: str = "UKR7101004"):
    count = store.mark_all_read(user_code)
    return {"marked": count}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, user_code: str = "UKR7101004"):
    notification = store.delete_one(user_code, notification_id)
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )
    asyncio.create_task(_send_read_email(notification.message, user_code))
    return {"ok": True}


@router.delete("")
async def delete_all_notifications(user_code: str = "UKR7101004"):
    count = store.delete_all(user_code)
    return {"deleted": count}


@router.post("/trigger_process")
async def trigger_process(user_code: str = "UKR7101004"):
    asyncio.create_task(run_heavy_process())
    return {
        "status": "started",
        "message": "Heavy process started, you will be notified when it finishes.",
    }


@router.websocket("/ws/{user_code}")
async def notification_ws(websocket: WebSocket, user_code: str):
    await websocket.accept()
    store.register_ws(user_code, websocket)
    try:
        # Send current notifications on connect
        await websocket.send_json(
            {"type": "init", "notifications": store.get_all(user_code)}
        )
        # Keep connection alive — client messages are ignored
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        store.unregister_ws(user_code, websocket)
