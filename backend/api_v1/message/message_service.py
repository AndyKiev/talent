from fastapi.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from backend.api_v1 import BaseService
from backend.api_v1.message.message_model import MsgKey
from backend.api_v1.message.message_model import Msg
from backend.api_v1.message.message_schema import (
    FullMsgCreate,
    MsgKeyCreate,
    FullMsgUpdate,
)
from backend.api_v1.message.message_repository import MsgKeyRepository


class MsgKeyService(BaseService):
    def __init__(
        self,
        repository: MsgKeyRepository,
        session: AsyncSession,
    ):
        self.repository = repository
        self.session = session

    async def create_custom(self, msg_data_in: list[FullMsgCreate]) -> None:
        if self.session is None:
            raise RuntimeError("MsgKeyService requires session for create operation")
        for m in msg_data_in:
            msg_key = MsgKeyCreate(key_name=m.key_name)
            try:
                msg_key_obj = await self.create(model=msg_key)
            except IntegrityError as e:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "Failed to create msg_key_obj",
                        "message": str(e.orig),
                    },
                )
            if m.msg:
                id_ = msg_key_obj.id
                try:
                    for m2 in m.msg:
                        self.session.add(
                            Msg(
                                value=m2.value,
                                lang_id=m2.lang_id,
                                msg_key_id=id_,
                            )
                        )
                    await self.session.commit()
                except Exception as e:
                    await self.delete_by_id(id_=id_)
                    await self.session.rollback()
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "error": "Rollback due to rule or filter creation failure",
                            "message": str(e),
                        },
                    )

    async def update_custom(self, msg_data_update: FullMsgUpdate, msg_key: MsgKey):
        if self.session is None:
            raise RuntimeError("MsgKeyService requires session for create operation")

        try:
            if not msg_key.msg:
                for m2 in msg_data_update.msg:
                    self.session.add(
                        Msg(value=m2.value, msg_key_id=msg_key.id, lang_id=m2.lang_id)
                    )
            else:
                for m in msg_data_update.msg:
                    for index_ in range(len(msg_key.msg)):
                        if m.lang_id == msg_key.msg[index_].lang_id:
                            if m.value == "":
                                await self.session.delete(msg_key.msg[index_])
                            else:
                                msg_key.msg[index_].value = m.value

            id_in_db = set([m2.lang_id for m2 in msg_key.msg])
            id_update = set([m.lang_id for m in msg_data_update.msg])
            diff = id_update.difference(id_in_db)

            msg_data_update_dict = {m.lang_id: m for m in msg_data_update.msg}
            for d in diff:
                self.session.add(
                    Msg(
                        value=msg_data_update_dict[d].value,
                        msg_key_id=msg_key.id,
                        lang_id=msg_data_update_dict[d].lang_id,
                    )
                )

            await self.session.commit()
        except Exception as e:
            await self.session.rollback()

        msg_key.key_name = msg_data_update.key_name
        await self.session.commit()
        await self.session.close()

        msg_key = await self.session.get(MsgKey, msg_key.id)

        return msg_key
