import asyncio
import json
from pathlib import Path

from sqlalchemy import select, text

from backend.database.db_helper import db_helper
from backend.api_v1.msg_key.msg_key_model import MsgKey

# NOTE: use Msg from msg_pg, NOT from message.message_model — the latter also defines a
# duplicate MsgKey class that conflicts with msg_key.msg_key_model.MsgKey at MetaData level.
from backend.api_v1.msg_pg.msg_model import Msg

JSON_PATH = (
    Path(__file__).resolve().parent.parent / "utils" / "table_data" / "table_data.json"
)

BATCH_SIZE = 500


async def seed_msg_keys(session, data: list[dict]) -> int:
    """Insert msg_keys — skip if id OR name already exists."""
    result = await session.execute(select(MsgKey.id))
    existing_ids = set(result.scalars().all())
    result = await session.execute(select(MsgKey.name))
    existing_names = set(result.scalars().all())

    skipped_name_conflict = 0
    missing = []
    for row in data:
        if row["id"] in existing_ids:
            continue
        if row["name"] in existing_names:
            skipped_name_conflict += 1
            continue
        missing.append(row)

    if skipped_name_conflict:
        print(
            f"  msg_keys: {skipped_name_conflict} rows skipped (name already exists with different ID)"
        )

    if not missing:
        print("  msg_keys: all already present, nothing to insert")
        return 0

    inserted = 0
    for i in range(0, len(missing), BATCH_SIZE):
        batch = missing[i : i + BATCH_SIZE]
        for row in batch:
            session.add(MsgKey(id=row["id"], name=row["name"]))
        await session.commit()
        inserted += len(batch)
        print(
            f"  msg_keys: {min(i + BATCH_SIZE, len(missing))}/{len(missing)} committed"
        )
    print(f"  msg_keys done — {inserted} new records inserted")
    return inserted


async def seed_msgs(session, data: list[dict]) -> int:
    """Insert msgs — skip if id exists, pair exists, or msg_key_id doesn't exist in DB."""
    result = await session.execute(select(Msg.id, Msg.msg_key_id, Msg.lang_id))
    rows = result.all()
    existing_ids = {r[0] for r in rows}
    existing_pairs = {(r[1], r[2]) for r in rows}

    # Also get valid msg_key_ids from DB
    result = await session.execute(select(MsgKey.id))
    valid_key_ids = set(result.scalars().all())

    skipped_no_key = 0
    skipped_pair_conflict = 0
    missing = []
    for row in data:
        if row["id"] in existing_ids:
            continue
        if (row["msg_key_id"], row["lang_id"]) in existing_pairs:
            skipped_pair_conflict += 1
            continue
        if row["msg_key_id"] not in valid_key_ids:
            skipped_no_key += 1
            continue
        missing.append(row)

    if skipped_no_key:
        print(f"  msgs: {skipped_no_key} rows skipped (msg_key_id not in DB)")
    if skipped_pair_conflict:
        print(
            f"  msgs: {skipped_pair_conflict} rows skipped (msg_key_id+lang_id already exists)"
        )

    if not missing:
        print("  msgs: all already present, nothing to insert")
        return 0

    inserted = 0
    for i in range(0, len(missing), BATCH_SIZE):
        batch = missing[i : i + BATCH_SIZE]
        for row in batch:
            session.add(
                Msg(
                    id=row["id"],
                    value=row["value"],
                    msg_key_id=row["msg_key_id"],
                    lang_id=row["lang_id"],
                )
            )
        await session.commit()
        inserted += len(batch)
        print(f"  msgs: {min(i + BATCH_SIZE, len(missing))}/{len(missing)} committed")
    print(f"  msgs done — {inserted} new records inserted")
    return inserted


async def reset_sequence(table_name: str, col: str = "id") -> None:
    """Reset the auto-increment sequence to the max id + 1."""
    async with db_helper.session_factory() as session:
        await session.execute(
            text(
                f"SELECT setval('{table_name}_id_seq', "
                f"(SELECT COALESCE(MAX({col}), 0) FROM {table_name}))"
            )
        )
        await session.commit()
        print(f"  Sequence {table_name}_id_seq reset to max({col})")


async def seed_messages():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        table_data = json.load(f)

    msg_keys_data: list[dict] = table_data["tables"]["msg_keys"]["rows"]
    msgs_data: list[dict] = table_data["tables"]["msgs"]["rows"]

    print(f"Loaded {len(msg_keys_data)} msg_keys and {len(msgs_data)} msgs from JSON")

    async with db_helper.session_factory() as session:
        print("Seeding msg_keys...")
        await seed_msg_keys(session, msg_keys_data)

        print("Seeding msgs...")
        await seed_msgs(session, msgs_data)

    print("Resetting sequences...")
    await reset_sequence("msg_keys")
    await reset_sequence("msgs")

    print("Seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed_messages())
