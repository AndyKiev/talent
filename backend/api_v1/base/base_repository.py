import asyncio
from collections.abc import Sequence
from enum import Enum
from typing import Annotated, Any, TypeVar, Union

from sqlalchemy import (
    Row,
    RowMapping,
    UnaryExpression,
    and_,
    asc,
    delete,
    desc,
    func,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api_v1.base.models import Base

ModelType = TypeVar("ModelType", bound=Base)


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"


# Define type for sort specification
SortSpec = Union[
    str,  # Single field name, default ascending
    dict[str, SortDirection],  # Field -> direction mapping
    list[str | dict[str, SortDirection]],  # Multiple fields
    None,
]


class BaseRepository:
    model = None

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, instance: ModelType) -> ModelType:
        self.session.add(instance)
        await self.session.commit()
        await self.session.refresh(instance)
        return instance

    async def create_from_dict(self, data: dict) -> ModelType:
        return await self.create(self.model(**data))

    async def get_by_field(
        self,
        field_name: str,
        value: Any,
        case_insensitive: bool = False,
        is_unique: bool = True,
    ) -> ModelType | None:
        """
        Get a record by field value

        Args:
            field_name: Name of the field to query
            value: Value to search for
            case_insensitive: If True, use case-insensitive exact match
            is_unique: If True, expects at most one result, returns None if multiple

        Returns:
            Single model instance or None if is_unique=True
            List of model instances if is_unique=False
        """
        if not hasattr(self.model, field_name):
            raise AttributeError(
                f"Model {self.model.__name__} has no attribute '{field_name}'"
            )

        field = getattr(self.model, field_name)

        if case_insensitive and isinstance(value, str):
            # For case-insensitive exact match, compare lowercased values
            # This works across all SQL databases
            stmt = select(self.model).where(func.lower(field) == func.lower(value))
        else:
            stmt = select(self.model).where(field == value)

        result = await self.session.execute(stmt)

        if is_unique:
            return result.scalar_one_or_none()
        else:
            return result.scalars().all()

    async def get_by_field_excluding(
        self,
        field_name: str,
        value: Any,
        exclude_ids: list[int],
        case_insensitive: bool = False,
    ) -> ModelType | None:
        """Like get_by_field, but excludes rows whose id is in exclude_ids."""
        if not hasattr(self.model, field_name):
            raise AttributeError(
                f"Model {self.model.__name__} has no attribute '{field_name}'"
            )

        field = getattr(self.model, field_name)

        if case_insensitive and isinstance(value, str):
            stmt = select(self.model).where(func.lower(field) == func.lower(value))
        else:
            stmt = select(self.model).where(field == value)

        if exclude_ids:
            stmt = stmt.where(self.model.id.not_in(exclude_ids))

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_id_by_field(
        self,
        field_name: str,
        value: Any,
        case_insensitive: bool = False,
    ) -> int | None:
        """
        Return the `id` of the single row where field_name == value, else None.

        Lightweight directory helper (e.g. resolve a status id from its stable
        key/name) — selects only the id column, expects at most one match.
        """
        if not hasattr(self.model, field_name):
            raise AttributeError(
                f"Model {self.model.__name__} has no attribute '{field_name}'"
            )

        field = getattr(self.model, field_name)

        if case_insensitive and isinstance(value, str):
            stmt = select(self.model.id).where(func.lower(field) == func.lower(value))
        else:
            stmt = select(self.model.id).where(field == value)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def mass_create(
        self,
        instances: list[ModelType],
    ) -> list[ModelType]:
        self.session.add_all(instances)
        await self.session.commit()
        return instances

    async def update(
        self,
        instance: ModelType,
        instance_update: dict,
    ) -> ModelType:
        for name, value in instance_update.items():
            setattr(instance, name, value)
        await self.session.commit()
        await self.session.refresh(instance)
        return instance

    async def mass_update(
        self,
        instances: list[ModelType],
        instance_update: dict,
    ) -> list[ModelType]:
        [
            setattr(instance, name, value)
            for name, value in instance_update.items()
            for instance in instances
        ]
        await self.session.commit()
        await asyncio.gather(
            *(self.session.refresh(instance) for instance in instances)
        )
        return instances

    async def delete(self, instance: ModelType) -> None:
        await self.session.delete(instance)
        await self.session.commit()

    async def get_by_id(self, id: int) -> Annotated[ModelType, None]:
        stmt = select(self.model).filter_by(id=id)
        result = await self.session.scalar(stmt)
        return result

    async def get_by_ids(self, ids: list[int]) -> Sequence[ModelType]:
        stmt = select(self.model).where(self.model.id.in_(ids)).order_by(self.model.id)
        result = await self.session.scalars(stmt)
        return result.all()

    async def delete_by_id(self, id_: int) -> None:
        del_obj = delete(self.model).where(self.model.id == id_)
        await self.session.execute(del_obj)
        await self.session.commit()

    def _parse_sort_spec(self, sort: SortSpec) -> list[UnaryExpression]:
        """
        Parse sort specification into SQLAlchemy order_by expressions.

        Args:
            sort: Sort specification. Can be:
                - None: default to order_by("id")
                - str: single field name, default ascending
                - Dict[str, SortDirection]: field->direction mapping
                - List: multiple fields in order

        Returns:
            List of SQLAlchemy order_by expressions
        """
        if sort is None:
            # Default: order by id ascending
            return [asc(self.model.id)]

        order_by_clauses = []

        def add_order_clause(field: str, direction: SortDirection = SortDirection.ASC):
            """Add order clause for a field with direction."""
            if direction == SortDirection.ASC:
                order_by_clauses.append(asc(getattr(self.model, field)))
            else:
                order_by_clauses.append(desc(getattr(self.model, field)))

        if isinstance(sort, str):
            # Single field name, default ascending
            add_order_clause(sort)

        elif isinstance(sort, dict):
            # Dict of field->direction
            for field, direction in sort.items():
                add_order_clause(field, direction)

        elif isinstance(sort, list):
            # List of fields or dicts
            for item in sort:
                if isinstance(item, str):
                    add_order_clause(item)
                elif isinstance(item, dict):
                    for field, direction in item.items():
                        add_order_clause(field, direction)

        return order_by_clauses

    async def get_all(
        self, filters: dict | None = None, sort: SortSpec = None
    ) -> Sequence[Row[Any] | RowMapping | Any]:
        stmt = select(self.model)
        if filters:
            conditions = []
            if all([isinstance(value, list) for value in filters.values()]):
                conditions.extend(
                    getattr(self.model, key).in_(values)
                    for key, values in filters.items()
                )
            else:
                conditions.extend(
                    getattr(self.model, key) == value for key, value in filters.items()
                )
            stmt = stmt.filter(and_(*conditions))

        # Apply sorting
        order_by_clauses = self._parse_sort_spec(sort)
        if order_by_clauses:
            stmt = stmt.order_by(*order_by_clauses)

        result = await self.session.scalars(stmt)
        return result.all()

    async def get_sort_all(
        self, filters: dict | None = None
    ) -> Sequence[Row[Any] | RowMapping | Any]:
        pass

    async def create_or_update(
        self, create_instances: list, update_instances: list
    ) -> None:
        pass

    async def get_all_excel(
        self, create_instances: list, update_instances: list
    ) -> None:
        pass

    async def mass_update_by_ids(
        self, updates: list[dict], sort_field: str = "priority"
    ) -> list[ModelType]:
        """
        Update multiple items by ID with different values for a specific field
        """
        if not updates:
            return []

        updated_instances = []

        for update_data in updates:
            item_id = update_data["id"]
            field_value = update_data[sort_field]

            # Get the instance
            stmt = select(self.model).where(self.model.id == item_id)
            result = await self.session.execute(stmt)
            instance = result.scalar_one_or_none()

            if instance:
                # Update the field
                setattr(instance, sort_field, field_value)
                updated_instances.append(instance)

        await self.session.commit()

        # Refresh all updated instances
        for instance in updated_instances:
            await self.session.refresh(instance)

        return updated_instances
