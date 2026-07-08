import io
from typing import Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from PIL import Image, UnidentifiedImageError

from backend.api_v1.base.base_service import BaseService
from backend.api_v1.base.mutation_response import MutationResponse
from backend.api_v1.app_setting.app_setting_service import get_bool_setting
from backend.api_v1.employee_photo.employee_photo_repository import (
    EmployeePhotoRepository,
)
from backend.api_v1.employee_photo.employee_photo_model import EmployeePhoto
from backend.api_v1.employee_photo.employee_photo_schema import EmployeePhotoMeta
from backend.api_v1.employee_photo.employee_photo_messages import (
    EmployeePhotoNotFound,
    EmployeePhotoInvalidType,
    EmployeePhotoTooLarge,
    EmployeePhotosDisabled,
)
from backend.api_v1.employee_photo.employee_photo_messages import (
    EmployeePhotoSaveSuccess,
    EmployeePhotoDeleteSuccess,
)
from backend.api_v1.employee.employee_schema import EmployeeSchema

# Hard cap on the *raw* upload, checked before we ever decode it (a guard against
# decompression bombs). The stored blob is far smaller after downscaling.
MAX_RAW_BYTES = 8 * 1024 * 1024
# Longest edge of the stored image. The photo is never displayed larger than the
# TEMPO 96x120 box (~240px at 2x DPI); avatars are <=48px. 320px keeps headroom
# while keeping blobs small. (To re-shrink existing rows: scripts/shrink_employee_photos.py)
MAX_DIMENSION = 320
JPEG_QUALITY = 80

# Developer-settings flags for the photos feature (multi-story). The MASTER gates
# the whole feature; the five CHILD keys gate photo DISPLAY per surface and are
# "effectively on" only when they AND the master are on (see
# get_effective_bool_setting). When the master is OFF the feature is dormant: the
# frontend hides avatars and never reads, uploads are rejected here, and the TEMPO
# artifacts skip the photo. Stored blobs are preserved either way, so flipping the
# master back ON restores every existing photo. Default ON (preserve behaviour).
PHOTOS_ENABLED_SETTING_KEY = "employee_photos_enabled"  # master
PHOTOS_EMPLOYEES_MENU_KEY = "employee_photos_employees_menu"
PHOTOS_PEOPLE_REVIEW_KEY = "employee_photos_people_review"
PHOTOS_PRESENTATION_SESSION_KEY = "employee_photos_presentation_session"
PHOTOS_PRESENTATION_INDIVIDUAL_KEY = "employee_photos_presentation_individual"
PHOTOS_PRESENTATION_PPTX_KEY = "employee_photos_presentation_pptx"


class EmployeePhotoService(BaseService):
    def __init__(
        self,
        repository: EmployeePhotoRepository,
        user: Optional[EmployeeSchema] = None,
        session: Optional[AsyncSession] = None,
    ):
        super().__init__(repository, user=user, session=session)

    async def _get_by_employee(self, employee_id: int) -> Optional[EmployeePhoto]:
        return await self.repository.get_by_field("employee_id", employee_id)

    async def get_photo(self, employee_id: int) -> Optional[EmployeePhoto]:
        return await self._get_by_employee(employee_id)

    def _process_image(self, raw: bytes) -> Tuple[bytes, str]:
        """Validate + downscale an upload. Returns (bytes, content_type).

        The stored content_type is derived from what Pillow actually decoded, not
        from the (spoofable) request — transparency keeps PNG, everything else
        becomes a compressed JPEG. Raises a domain error on a non-image or oversize.
        """
        if len(raw) > MAX_RAW_BYTES:
            raise EmployeePhotoTooLarge(MAX_RAW_BYTES // (1024 * 1024))
        try:
            img = Image.open(io.BytesIO(raw))
            img.load()
        except (UnidentifiedImageError, OSError, ValueError):
            raise EmployeePhotoInvalidType()

        has_alpha = img.mode in ("RGBA", "LA") or (
            img.mode == "P" and "transparency" in img.info
        )
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION))
        out = io.BytesIO()
        if has_alpha:
            img.convert("RGBA").save(out, format="PNG", optimize=True)
            content_type = "image/png"
        else:
            img.convert("RGB").save(
                out, format="JPEG", quality=JPEG_QUALITY, optimize=True
            )
            content_type = "image/jpeg"
        return out.getvalue(), content_type

    async def upsert_photo(
        self, employee_id: int, raw: bytes
    ) -> MutationResponse[EmployeePhotoMeta]:
        if not await get_bool_setting(
            self.session, PHOTOS_ENABLED_SETTING_KEY, default=True
        ):
            raise await self._resolve_domain_error(EmployeePhotosDisabled())
        try:
            data, content_type = self._process_image(raw)
        except (EmployeePhotoInvalidType, EmployeePhotoTooLarge) as exc:
            raise await self._resolve_domain_error(exc)

        record = await self._get_by_employee(employee_id)
        if record is None:
            record = EmployeePhoto(
                employee_id=employee_id,
                content_type=content_type,
                data=data,
                size=len(data),
            )
            self.session.add(record)
        else:
            record.content_type = content_type
            record.data = data
            record.size = len(data)
        await self.session.commit()
        await self.session.refresh(record)

        detail = await self._resolve_domain_success(EmployeePhotoSaveSuccess())
        return MutationResponse(
            detail=detail, data=EmployeePhotoMeta.model_validate(record)
        )

    async def delete_photo(self, employee_id: int) -> MutationResponse[None]:
        record = await self._get_by_employee(employee_id)
        if record is None:
            raise EmployeePhotoNotFound(employee_id)
        await self.session.delete(record)
        await self.session.commit()
        detail = await self._resolve_domain_success(EmployeePhotoDeleteSuccess())
        return MutationResponse(detail=detail, data=None)
