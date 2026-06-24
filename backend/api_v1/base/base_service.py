import json
from typing import Any, Sequence, Optional, List, Dict
from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import Row, RowMapping, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.base.base_repository import ModelType, SortSpec
from backend.utils.enums import MoveDirection
from typing import TypeVar, Generic

from backend.api_v1.employee.employee_schema import EmployeeSchema

from backend.api_v1.msg_key.msg_key_model import MsgKey
from backend.api_v1.msg_pg.msg_model import Msg

from backend.api_v1.base.errors import (
    NotFoundError,
    AlreadyExistsError,
    DomainError,
    DeleteError,
)
from backend.api_v1.base.success import DeleteSuccess

RepositoryType = TypeVar("RepositoryType", bound=BaseRepository)


class BaseService(Generic[RepositoryType]):
    def __init__(
        self,
        repository: RepositoryType,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ) -> None:
        self.repository: RepositoryType = repository
        self.user = user
        self.session = session

    def _camel_to_snake(self, camel_str: str) -> str:
        import re

        snake_str = re.sub(r"(?<!^)(?=[A-Z])", "_", camel_str).lower()
        return snake_str

    async def _translate(
        self,
        message_key: str,
        variables: Optional[Dict[str, Any]] = None,
        fallback: str = "",
    ) -> str:
        """
        Resolve a message key for the current employee's language.
        Interpolates ${variable} placeholders with the supplied variables dict.
        Returns fallback when the session/employee is unavailable or key not found.
        """
        if not self.session or not self.user:
            return fallback
        try:
            stmt = (
                select(Msg.value)
                .join(MsgKey)
                .where(MsgKey.name == message_key, Msg.lang_id == self.user.lang_id)
            )
            result = await self.session.execute(stmt)
            message_template = result.scalar_one_or_none()

            if not message_template:
                return fallback

            if variables:
                for key, value in variables.items():
                    placeholder = f"${{{key}}}"
                    message_template = message_template.replace(placeholder, str(value))

            return message_template

        except Exception:
            return fallback

    async def _raise_error(
        self,
        message_key: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        variables: Optional[Dict[str, Any]] = None,
        fallback: str = "",
    ):
        """Raise HTTPException with a translated error message."""
        message = await self._translate(message_key, variables, fallback)
        raise HTTPException(status_code=status_code, detail=message)

    async def _raise_success(
        self,
        message_key: str,
        status_code: int = status.HTTP_200_OK,
        variables: Optional[Dict[str, Any]] = None,
        fallback: str = "Success",
    ):
        """Raise HTTPException with a translated success message."""
        message = await self._translate(message_key, variables, fallback)
        raise HTTPException(status_code=status_code, detail=message)

    async def _resolve_domain_error(self, exc: DomainError) -> DomainError:
        """
        Translate a domain error's message in-place and return it.

        Reads message_key and template_vars from the exception (set by the
        concrete error class in job_errors.py) and stores the result on
        exc.resolved_message so the global exception handler can use it
        without needing a DB session.

        Usage in a service method:
            except SomeDomainError as exc:
                raise await self._resolve_domain_error(exc)
        """
        message_key = getattr(exc, "message_key", None)
        template_vars = getattr(exc, "template_vars", None)
        fallback = getattr(exc, "fallback", str(exc))

        if message_key:
            exc.resolved_message = await self._translate(
                message_key, template_vars, fallback
            )
        else:
            exc.resolved_message = fallback

        return exc

    # ------------------------------------------------------------------
    # All existing methods below are unchanged
    # ------------------------------------------------------------------

    async def create(self, model: BaseModel) -> ModelType:
        model = self.repository.model(**model.model_dump())
        return await self.repository.create(instance=model)

    async def create_from_dict(self, data: dict) -> ModelType:
        return await self.repository.create_from_dict(data)

    async def create_instance(self, model: BaseModel) -> ModelType:
        model = self.repository.model(**model.model_dump())
        try:
            new_inst = await self.repository.create(instance=model)
            return new_inst
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

    async def get_by_name(
        self,
        name: str,
        not_found_exc: type[NotFoundError] | None = None,
        case_insensitive: bool = False,
        is_unique: bool = True,
    ) -> ModelType | List[ModelType]:
        result = await self.repository.get_by_field(
            "name",
            name,
            case_insensitive=case_insensitive,
            is_unique=is_unique,
        )
        if not result:
            if not_found_exc is not None:
                exc = not_found_exc(name)
            else:
                exc = NotFoundError(self.repository.model.__name__, "name", name)
                exc.message_key = "essenceNotFoundByName"
                exc.template_vars = {
                    "essence": self.repository.model.__name__,
                    "name": name,
                }
                exc.fallback = (
                    f"{self.repository.model.__name__} with name '{name}' not found"
                )
            raise await self._resolve_domain_error(exc)
        return result

    async def get_by_code(
        self,
        code: str,
        not_found_exc: type[NotFoundError] | None = None,
        case_insensitive: bool = False,
        is_unique: bool = True,
    ) -> ModelType | List[ModelType]:
        result = await self.repository.get_by_field(
            "code",
            code,
            case_insensitive=case_insensitive,
            is_unique=is_unique,
        )
        if not result:
            if not_found_exc is not None:
                exc = not_found_exc(code)
            else:
                exc = NotFoundError(self.repository.model.__name__, "code", code)
                exc.message_key = "essenceNotFoundByCode"
                exc.template_vars = {
                    "essence": self.repository.model.__name__,
                    "code": code,
                }
                exc.fallback = (
                    f"{self.repository.model.__name__} with code '{code}' not found"
                )
            raise await self._resolve_domain_error(exc)
        return result

    async def exists_by_name(
        self,
        name: str,
        already_exists_exc: type[AlreadyExistsError] | None = None,
    ) -> None:
        result = await self.repository.get_by_field("name", name)
        if result:
            if already_exists_exc is not None:
                exc = already_exists_exc(name)
            else:
                exc = AlreadyExistsError(self.repository.model.__name__, "name", name)
                exc.message_key = "essenceAlreadyExists"
                exc.template_vars = {
                    "essence": self.repository.model.__name__,
                    "name": name,
                }
                exc.fallback = f"{self.repository.model.__name__} with name '{name}' already exists"
            raise await self._resolve_domain_error(exc)

    async def exists_by_field_excluding(
        self,
        field_name: str,
        value: Any,
        exclude_ids: List[int],
        already_exists_exc: type[AlreadyExistsError] | None = None,
    ) -> None:
        """
        Raise AlreadyExistsError if a record with field_name=value exists,
        ignoring rows whose id is in exclude_ids.
        Useful for update uniqueness checks (exclude the record being updated).
        """
        result = await self.repository.get_by_field_excluding(
            field_name=field_name,
            value=value,
            exclude_ids=exclude_ids,
        )
        if result:
            if already_exists_exc is not None:
                exc = already_exists_exc(value)
            else:
                exc = AlreadyExistsError(
                    self.repository.model.__name__, field_name, value
                )
                exc.message_key = "essenceAlreadyExists"
                exc.template_vars = {
                    "essence": self.repository.model.__name__,
                    "name": value,
                }
                exc.fallback = f"{self.repository.model.__name__} with {field_name} '{value}' already exists"
            raise await self._resolve_domain_error(exc)

    async def exists_by_name_excluding(
        self,
        name: str,
        exclude_ids: List[int],
        already_exists_exc: type[AlreadyExistsError] | None = None,
    ) -> None:
        await self.exists_by_field_excluding(
            field_name="name",
            value=name,
            exclude_ids=exclude_ids,
            already_exists_exc=already_exists_exc,
        )

    async def get_by_field(
        self,
        field_name: str,
        value: Any,
        case_insensitive: bool = False,
        is_unique: bool = True,
    ) -> Optional[ModelType]:
        return await self.repository.get_by_field(
            field_name=field_name,
            value=value,
            case_insensitive=case_insensitive,
            is_unique=is_unique,
        )

    async def mass_create(self, model: list) -> list:
        return await self.repository.mass_create(instances=model)

    async def update(
        self,
        model: ModelType,
        model_update: BaseModel,
        partial: bool = True,
    ) -> ModelType:
        return await self.repository.update(
            instance=model,
            instance_update=model_update.model_dump(exclude_unset=partial),
        )

    async def update_by_id(
        self,
        id: int,
        model_update: BaseModel,
        partial: bool = True,
    ) -> ModelType:
        try:
            inst_update = await self.get_by_id(id)
            if not inst_update:
                raise ValueError(
                    f"{self.repository.model.__name__} with ID {id} not found"
                )
            return await self.repository.update(
                instance=inst_update,
                instance_update=model_update.model_dump(exclude_unset=partial),
            )
        except ValueError as e:
            if "not found" in str(e).lower():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
                )

    async def mass_update(
        self,
        model: list[ModelType],
        model_update: BaseModel,
        partial: bool = True,
    ) -> list[ModelType]:
        return await self.repository.mass_update(
            instances=model,
            instance_update=model_update.model_dump(exclude_unset=partial),
        )

    async def delete(self, model: ModelType) -> None:
        await self.repository.delete(instance=model)

    # async def delete_by_id(self, id_: int) -> None:
    #     return await self.repository.delete_by_id(id_=id_)

    async def delete_by_id(
        self,
        id_: int,
        name: str = "",  # needed to build the message
        delete_error_exc: type[DeleteError] | None = None,
        delete_success_exc: type[DeleteSuccess] | None = None,
    ) -> None:
        model_name = self.repository.model.__name__
        try:
            await self.repository.delete_by_id(id_=id_)
        except IntegrityError:
            if delete_error_exc is not None:
                exc = delete_error_exc(name)
            else:
                exc = DeleteError(model_name, name)
            raise await self._resolve_domain_error(exc)

        # signal success
        if delete_success_exc is not None:
            success = delete_success_exc(name)
        else:
            success = DeleteSuccess(model_name, name)

        await self._raise_success(
            message_key=success.message_key,
            variables=success.template_vars,
            fallback=success.fallback,
        )

    # async def get_by_name(
    #     self, name_value: str, case_insensitive: bool = False, is_unique: bool = True
    # ) -> ModelType | List[ModelType]:
    #     inst = await self.repository.get_by_field(
    #         field_name="name",
    #         value=name_value,
    #         case_insensitive=case_insensitive,
    #         is_unique=is_unique,
    #     )
    #     if not inst:
    #         raise HTTPException(
    #             status_code=status.HTTP_404_NOT_FOUND,
    #             detail=f"{self.repository.model.__name__} with name '{name_value}' not found",
    #         )
    #     return inst

    async def get_by_key(
        self, key_value: str, case_insensitive: bool = False, is_unique: bool = True
    ) -> ModelType | List[ModelType]:
        inst = await self.repository.get_by_field(
            field_name="key",
            value=key_value,
            case_insensitive=case_insensitive,
            is_unique=is_unique,
        )
        if not inst:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{self.repository.model.__name__} with key '{key_value}' not found",
            )
        return inst

    async def get_single(self, id: int) -> ModelType:
        return await self.repository.get_by_id(id=id)

    # async def get_by_id(self, id: int) -> ModelType:
    #     result = await self.repository.get_by_id(id)
    #     if not result:
    #         raise NotFoundError(self.repository.model.__name__, "ID", id)
    #     return result

    async def get_by_id(self, id: int) -> ModelType:
        result = await self.repository.get_by_id(id)
        if not result:
            exc = NotFoundError(self.repository.model.__name__, "ID", id)
            exc.message_key = "essenceNotFoundById"
            exc.template_vars = {
                "essence": self.repository.model.__name__,
                "id": id,
            }
            exc.fallback = f"{self.repository.model.__name__} with ID {id} not found"
            raise await self._resolve_domain_error(exc)
        return result

    @staticmethod
    def parse_sort_json(sort_json: Optional[str]) -> Optional[SortSpec]:
        if not sort_json:
            return None
        try:
            sort_data = json.loads(sort_json)
            if not (isinstance(sort_data, (dict, list, str))):
                raise ValueError("Sort must be dict, list, or string")
            if isinstance(sort_data, dict):
                for key, value in sort_data.items():
                    if not isinstance(key, str):
                        raise ValueError(
                            f"Sort field name must be string, got {type(key)}"
                        )
                    if value not in ["asc", "desc"]:
                        raise ValueError(
                            f"Sort direction must be 'asc' or 'desc', got '{value}'"
                        )
            elif isinstance(sort_data, list):
                for item in sort_data:
                    if isinstance(item, dict):
                        for key, value in item.items():
                            if value not in ["asc", "desc"]:
                                raise ValueError(
                                    f"Sort direction must be 'asc' or 'desc', got '{value}'"
                                )
                    elif not isinstance(item, str):
                        raise ValueError(
                            f"List items must be strings or dicts, got {type(item)}"
                        )
            return sort_data
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid JSON format: {str(e)}"
            )
        except ValueError as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid sort specification: {str(e)}"
            )

    async def get_by_ids(self, ids: list[int]) -> Sequence[Row[Any] | RowMapping | Any]:
        if not ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"At least one ID of {self.repository.model.__name__} must be provided",
            )
        return await self.repository.get_by_ids(ids=ids)

    async def get_all(
        self,
        params: dict | None = None,
        sort: SortSpec = None,
        sort_json: str | None = None,
    ) -> Sequence[Row[Any] | RowMapping | Any]:
        if sort_json and sort is None:
            sort = self.parse_sort_json(sort_json)
        return await self.repository.get_all(filters=params, sort=sort)

    async def get_sort_all(
        self, params: dict | None = None
    ) -> Sequence[Row[Any] | RowMapping | Any]:
        return await self.repository.get_sort_all(params)

    async def get_all_excel(
        self, params: dict | None = None
    ) -> Sequence[Row[Any] | RowMapping | Any]:
        return await self.repository.get_all_excel(params)

    async def create_or_update(self, model_create: list, model_update: list):
        return await self.repository.create_or_update(
            create_instances=model_create, update_instances=model_update
        )

    async def reorder_sequence(
        self, sort_field: str = "priority", step: int = 10, start_from: int = 10
    ) -> None:
        items = await self.repository.get_all(sort={sort_field: "asc"})
        if not items:
            return
        updates = []
        current_value = start_from
        for item in items:
            updates.append({"id": item.id, sort_field: current_value})
            current_value += step
        await self.repository.mass_update_by_ids(updates, sort_field)

    async def move_item(
        self,
        item_id: int,
        direction: MoveDirection,
        sort_field: str = "priority",
        step: int = 10,
        start_from: int = 10,
    ) -> None:
        items = list(await self.repository.get_all(sort={sort_field: "asc"}))
        if len(items) <= 1:
            raise ValueError(f"Cannot move item: only one item in the list")
        item_index = None
        for i, item in enumerate(items):
            if item.id == item_id:
                item_index = i
                break
        if item_index is None:
            raise ValueError(f"Item with ID {item_id} not found")
        if direction == MoveDirection.UP and item_index == 0:
            raise ValueError("Cannot move up: item is already at the top")
        elif direction == MoveDirection.DOWN and item_index == len(items) - 1:
            raise ValueError("Cannot move down: item is already at the bottom")
        if direction == MoveDirection.UP:
            items[item_index], items[item_index - 1] = (
                items[item_index - 1],
                items[item_index],
            )
        elif direction == MoveDirection.DOWN:
            items[item_index], items[item_index + 1] = (
                items[item_index + 1],
                items[item_index],
            )
        elif direction == MoveDirection.TOP:
            items.insert(0, items.pop(item_index))
        elif direction == MoveDirection.BOTTOM:
            items.append(items.pop(item_index))
        updates = []
        current_value = start_from
        for item in items:
            updates.append({"id": item.id, sort_field: current_value})
            current_value += step
        await self.repository.mass_update_by_ids(updates, sort_field)

    async def move_item_with_errors(
        self,
        item_id: int,
        direction: MoveDirection,
        sort_field: str = "priority",
        step: int = 10,
        start_from: int = 10,
        move_error_exc: type[DomainError] | None = None,
    ) -> None:
        """
        Move an item in a sorted sequence with domain error support.

        Args:
            item_id: ID of the item to move
            direction: Direction to move (UP, DOWN, TOP, BOTTOM)
            sort_field: Field name used for sorting
            step: Increment step between items
            start_from: Starting value for the first item
            move_error_exc: Domain error class to raise on failure
        """
        try:
            await self.move_item(
                item_id=item_id,
                direction=direction,
                sort_field=sort_field,
                step=step,
                start_from=start_from,
            )
        except ValueError as e:
            if move_error_exc is not None:
                # Extract operation and reason from the error message
                error_msg = str(e)
                operation = self._extract_operation(direction)
                exc = move_error_exc(operation, error_msg, item_id)
                raise await self._resolve_domain_error(exc)
            else:
                # Fallback to generic error
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
                )

    def _extract_operation(self, direction: MoveDirection) -> str:
        """Extract human-readable operation name from direction."""
        operation_map = {
            MoveDirection.UP: "up",
            MoveDirection.DOWN: "down",
            MoveDirection.TOP: "to top",
            MoveDirection.BOTTOM: "to bottom",
        }
        return operation_map.get(direction, "unknown")

    async def move_to_top_with_errors(
        self,
        item_id: int,
        sort_field: str = "priority",
        step: int = 10,
        start_from: int = 10,
        move_error_exc: type[DomainError] | None = None,
    ) -> None:
        """Move item to top with domain error support."""
        await self.move_item_with_errors(
            item_id=item_id,
            direction=MoveDirection.TOP,
            sort_field=sort_field,
            step=step,
            start_from=start_from,
            move_error_exc=move_error_exc,
        )

    async def move_to_bottom_with_errors(
        self,
        item_id: int,
        sort_field: str = "priority",
        step: int = 10,
        start_from: int = 10,
        move_error_exc: type[DomainError] | None = None,
    ) -> None:
        """Move item to bottom with domain error support."""
        await self.move_item_with_errors(
            item_id=item_id,
            direction=MoveDirection.BOTTOM,
            sort_field=sort_field,
            step=step,
            start_from=start_from,
            move_error_exc=move_error_exc,
        )

    async def get_max_sort_value(self, sort_field: str = "priority") -> int:
        items = await self.repository.get_all(sort={sort_field: "desc"})
        if not items:
            return 0
        return getattr(items[0], sort_field)

    async def _resolve_domain_success(self, success) -> str:
        """
        Translate a domain success object and return the resolved message string.

        Unlike _resolve_domain_error (which returns the exception so the caller
        can `raise` it), this returns a plain string — because on create/update
        we need to return BOTH the message AND the data, not raise an exception.

        Usage in a service method:
            record = await self.create(status_in)
            schema = EmployeeStatusSchema.model_validate(record)
            detail = await self._resolve_domain_success(
                EmployeeStatusCreateSuccess(schema.name)
            )
            return MutationResponse(detail=detail, data=schema)
        """
        message_key = getattr(success, "message_key", None)
        template_vars = getattr(success, "template_vars", None)
        fallback = getattr(success, "fallback", str(success))

        if message_key:
            return await self._translate(message_key, template_vars, fallback)
        return fallback
