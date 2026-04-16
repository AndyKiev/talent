from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.user_group_type.user_group_type_model import UserGroupType


class UserGroupTypeRepository(BaseRepository):
    """
    Repository for UserGroupType.

    All standard CRUD operations (get_by_id, get_by_field, get_all,
    create, update, delete_by_id …) are inherited from BaseRepository.
    Domain-specific queries will be added here in step 2 when the link
    model (UserGroup ↔ UserGroupType) is introduced.
    """

    model = UserGroupType
