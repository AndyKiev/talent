from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.region.region_model import Region


class RegionRepository(BaseRepository):
    model = Region
