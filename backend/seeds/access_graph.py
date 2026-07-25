# backend/seeds/access_graph.py
#
# Shared get-or-create helper for the access-grant seeders.
#
# Why this exists: the seeders used to do a per-item `select(Entity)` for every
# lookup. Those entity selects are ruinously expensive here — EssenceSet,
# OperationEssenceSetLink, UserGroupOperationEssenceSetLink and UserGroup form a
# *cycle* of `lazy="selectin"` relationships, so loading a single row drags in
# its whole grant neighbourhood, including admin's entire grant list and every
# subgraph hanging off it. That cost ~4 seconds per permission (~20 minutes per
# run) even when the run added nothing.
#
# Column selects never fire relationship loaders, so the four queries in load()
# replace ~800 exploding ones and every later lookup is pure memory. Writes
# still go through the ORM — flushing a pending INSERT triggers no loaders —
# and each newly created row is written back into the dicts immediately, so
# lookups later in the same run see it (several permissions legitimately share
# one essence_set).
#
from sqlalchemy import select

from backend.api_v1.essence.essence_model import Essence
from backend.api_v1.essence_set.essence_set_member_model import EssenceSetMember
from backend.api_v1.essence_set.essence_set_model import EssenceSet
from backend.api_v1.operation_essence_set_link.operation_essence_set_link_model import (
    OperationEssenceSetLink,
)
from backend.api_v1.table_relationship_links.user_group_operation_essence_set_link_model import (
    UserGroupOperationEssenceSetLink,
)


class AccessGraph:
    """The whole access graph, preloaded into plain dicts."""

    def __init__(self, s):
        self.s = s
        self.essences: dict[str, int] = {}  # name         -> essence id
        self.sets: dict[str, int] = {}  # fingerprint  -> essence_set id
        self.oesls: dict[tuple[int, int], int] = {}  # (op, set)    -> oesl id
        self.grants: set[tuple[int, int]] = set()  # (group, oesl)

    async def load(self) -> None:
        s = self.s
        self.essences = {
            n: i for n, i in (await s.execute(select(Essence.name, Essence.id)))
        }
        self.sets = {
            f: i
            for f, i in (await s.execute(select(EssenceSet.fingerprint, EssenceSet.id)))
        }
        self.oesls = {
            (op, es): i
            for op, es, i in (
                await s.execute(
                    select(
                        OperationEssenceSetLink.operation_id,
                        OperationEssenceSetLink.essence_set_id,
                        OperationEssenceSetLink.id,
                    )
                )
            )
        }
        self.grants = {
            (g, o)
            for g, o in (
                await s.execute(
                    select(
                        UserGroupOperationEssenceSetLink.user_group_id,
                        UserGroupOperationEssenceSetLink.operation_essence_set_link_id,
                    )
                )
            )
        }

    async def essence_id(self, name: str) -> int:
        if name not in self.essences:
            e = Essence(name=name, description=name)
            self.s.add(e)
            await self.s.flush()
            self.essences[name] = e.id
        return self.essences[name]

    async def set_id(self, essence_ids) -> int:
        ids = sorted(essence_ids)
        fp = "-".join(str(i) for i in ids)
        if fp not in self.sets:
            es = EssenceSet(fingerprint=fp)
            self.s.add(es)
            await self.s.flush()
            for eid in ids:
                self.s.add(EssenceSetMember(essence_set_id=es.id, essence_id=eid))
            await self.s.flush()
            self.sets[fp] = es.id
        return self.sets[fp]

    async def oesl_id(self, op_id: int, set_id: int) -> int:
        key = (op_id, set_id)
        if key not in self.oesls:
            oesl = OperationEssenceSetLink(operation_id=op_id, essence_set_id=set_id)
            self.s.add(oesl)
            await self.s.flush()
            self.oesls[key] = oesl.id
        return self.oesls[key]

    def grant(self, group_id: int, oesl_id: int) -> int:
        """Add the grant if the group does not hold it yet. Returns 1 if added."""
        key = (group_id, oesl_id)
        if key in self.grants:
            return 0
        self.s.add(
            UserGroupOperationEssenceSetLink(
                user_group_id=group_id,
                operation_essence_set_link_id=oesl_id,
            )
        )
        self.grants.add(key)
        return 1
