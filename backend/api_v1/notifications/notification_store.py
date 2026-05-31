"""In-memory notification store + WebSocket connection manager."""
import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Set
from uuid import uuid4

from fastapi import WebSocket


@dataclass
class Notification:
    id: str
    user_code: str
    message: str
    is_read: bool
    created_at: str


# user_code -> list of notifications
_store: Dict[str, List[Notification]] = {}

# user_code -> set of active WebSocket connections
_connections: Dict[str, Set[WebSocket]] = {}
_lock = asyncio.Lock()


def _notifications_for(user_code: str) -> List[Notification]:
    return _store.setdefault(user_code, [])


def get_all(user_code: str) -> List[dict]:
    return [_to_dict(n) for n in _notifications_for(user_code)]


def mark_read(user_code: str, notification_id: str) -> bool:
    for n in _notifications_for(user_code):
        if n.id == notification_id:
            n.is_read = True
            return True
    return False


def mark_all_read(user_code: str) -> int:
    count = 0
    for n in _notifications_for(user_code):
        if not n.is_read:
            n.is_read = True
            count += 1
    return count


def unread_count(user_code: str) -> int:
    return sum(1 for n in _notifications_for(user_code) if not n.is_read)


def delete_one(user_code: str, notification_id: str) -> bool:
    lst = _notifications_for(user_code)
    for i, n in enumerate(lst):
        if n.id == notification_id:
            lst.pop(i)
            return True
    return False


def delete_all(user_code: str) -> int:
    lst = _notifications_for(user_code)
    count = len(lst)
    lst.clear()
    return count


async def add_and_broadcast(user_code: str, message: str) -> Notification:
    notification = Notification(
        id=str(uuid4()),
        user_code=user_code,
        message=message,
        is_read=False,
        created_at=datetime.utcnow().isoformat(),
    )
    async with _lock:
        _notifications_for(user_code).append(notification)

    await _broadcast(user_code, _to_dict(notification))
    return notification


async def _broadcast(user_code: str, payload: dict) -> None:
    dead: Set[WebSocket] = set()
    for ws in list(_connections.get(user_code, set())):
        try:
            await ws.send_json(payload)
        except Exception:
            dead.add(ws)
    for ws in dead:
        _connections.get(user_code, set()).discard(ws)


def register_ws(user_code: str, ws: WebSocket) -> None:
    _connections.setdefault(user_code, set()).add(ws)


def unregister_ws(user_code: str, ws: WebSocket) -> None:
    _connections.get(user_code, set()).discard(ws)


def _to_dict(n: Notification) -> dict:
    return {
        "id": n.id,
        "user_code": n.user_code,
        "message": n.message,
        "is_read": n.is_read,
        "created_at": n.created_at,
    }
