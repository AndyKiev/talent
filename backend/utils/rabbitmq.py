"""RabbitMQ connection helper + publish/consume utilities."""
import asyncio
import json
import logging
from typing import Callable, Awaitable

import aio_pika

logger = logging.getLogger(__name__)

RABBITMQ_URL = "amqp://admin:admin12345@localhost:5672/"
QUEUE_NAME = "notifications"


async def _get_connection() -> aio_pika.abc.AbstractRobustConnection:
    return await aio_pika.connect_robust(RABBITMQ_URL)


async def publish_notification(user_code: str, message: str) -> None:
    """Publish a notification message to the notifications queue."""
    connection = await _get_connection()
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue(QUEUE_NAME, durable=True)
        payload = json.dumps({"user_code": user_code, "message": message})
        await channel.default_exchange.publish(
            aio_pika.Message(
                body=payload.encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=queue.name,
        )


async def start_consumer(on_message: Callable[[dict], Awaitable[None]]) -> None:
    """
    Long-running consumer. Calls on_message(payload_dict) for each message.
    Intended to run as a background asyncio task for the lifetime of the app.
    """
    while True:
        try:
            connection = await aio_pika.connect_robust(RABBITMQ_URL)
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=10)
                queue = await channel.declare_queue(QUEUE_NAME, durable=True)

                async with queue.iterator() as queue_iter:
                    async for msg in queue_iter:
                        async with msg.process():
                            try:
                                payload = json.loads(msg.body.decode())
                                await on_message(payload)
                            except Exception as exc:
                                logger.error("Error processing notification: %s", exc)
        except Exception as exc:
            logger.warning("RabbitMQ consumer disconnected (%s), retrying in 5s...", exc)
            await asyncio.sleep(5)
