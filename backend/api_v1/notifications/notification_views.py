import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status

from backend.api_v1.notifications import notification_store as store
from backend.utils.heavy_process import run_heavy_process

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
async def get_notifications(user_code: str = "UKR7101004"):
    return store.get_all(user_code)


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, user_code: str = "UKR7101004"):
    if not store.mark_read(user_code, notification_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"ok": True}


@router.patch("/read-all/all")
async def mark_all_read(user_code: str = "UKR7101004"):
    count = store.mark_all_read(user_code)
    return {"marked": count}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, user_code: str = "UKR7101004"):
    if not store.delete_one(user_code, notification_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"ok": True}


@router.delete("")
async def delete_all_notifications(user_code: str = "UKR7101004"):
    count = store.delete_all(user_code)
    return {"deleted": count}


@router.post("/trigger-process")
async def trigger_process(user_code: str = "UKR7101004"):
    asyncio.create_task(run_heavy_process())
    return {"status": "started", "message": "Heavy process started, you will be notified when it finishes."}


@router.websocket("/ws/{user_code}")
async def notification_ws(websocket: WebSocket, user_code: str):
    await websocket.accept()
    store.register_ws(user_code, websocket)
    try:
        # Send current notifications on connect
        await websocket.send_json({"type": "init", "notifications": store.get_all(user_code)})
        # Keep connection alive — client messages are ignored
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        store.unregister_ws(user_code, websocket)
