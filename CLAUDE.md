# CLAUDE.md

FastAPI + React project.

## Quick Launch (dev)
- **Backend** — `uvicorn backend.main:app --host 127.0.0.1 --port 8004 --reload` → `http://127.0.0.1:8004`
- **Frontend** — `cd frontend && npm run dev` → `http://127.0.0.1:4004` (port set in `vite.config.ts`)
- Port 8004 busy? Kill it: `netstat -ano | findstr :8004` then `taskkill /PID <pid> /F`

## How to talk to me
- Be short. Talk caveman. Key points only.
- Ask questions if unsure — better ask than guess.
- Need a file? Ask, or find it in `backend_structure.txt` / `frontend_structure.txt`.

## Endpoints
- Use underscore `_`, never dash `-`.

## File locations
- Every time you add files, draw a tree showing where they go.

## Backend essences (per `essence_name`)
- `essence_name_repository.py` → CRUD only, no business logic. Inherits `base_repository.py`.
- `essence_name_service.py` → business logic. Inherits `base_service.py`.
- Most simple essences = tiny files. Example repository:

```python
from backend.api_v1.base.base_repository import BaseRepository
from backend.api_v1.department_category.department_category_model import DepartmentCategory

class DepartmentCategoryRepository(BaseRepository):
    model = DepartmentCategory
```

Example service:

```python
from typing import Optional
from backend.api_v1.base.base_service import BaseService
from backend.api_v1.lang.lang_repository import LangRepository
from sqlalchemy.ext.asyncio import AsyncSession

class LangService(BaseService):
    def __init__(self, repository: LangRepository, session: Optional[AsyncSession] = None):
        super().__init__(repository, session=session)
```

- Kill boilerplate that already lives in `base_service` / `base_repository`. Double check every time you write repo / service / dependencies.

## Models & schemas
- Separate files: model = SQLAlchemy, schema = Pydantic.

## Messages (backend)
- Errors/success come from backend → frontend.
- `essence_name_errors.py` and `essence_name_success.py` hold domain-specific messages.

## Views / routers
- Clean. No business logic, no message handling. Mostly return/await one function.

```python
@router.patch("/{department_category_id}", response_model=MutationResponse[DepartmentCategorySchema])
async def update_department_category(
    category_update: DepartmentCategoryUpdate,
    record: DepartmentCategorySchema = Depends(department_category_by_id),
    service: Annotated[DepartmentCategoryService, Depends(get_department_category_service)] = None,
):
    return await service.update_department_category(record.id, category_update)


@router.delete("/{department_category_id}", status_code=status.HTTP_200_OK)
async def delete_department_category(
    department_category_id: int,
    service: Annotated[DepartmentCategoryService, Depends(get_department_category_service)],
):
    await service.delete_department_category(department_category_id)
```

## Migrations (alembic)
- Make model visible to BaseModel: register it in `backend/api_v1/__init__.py`:

```python
__all__ = {"TalentStatus", ...}
from backend.api_v1.talent_status.talent_status_model import TalentStatus
```

- When adding new essence, give me the copyable import path to reuse.
- Do NOT create migrations. Propose copyable commands instead:

```
alembic revision --autogenerate -m "add is_main property to department categories"
alembic revision --autogenerate -m "make is_main property to department categories not nullable"
```

## Database
- Postgres.

## Translations / messages json
- New translations (except ones already in downloaded files) → add to uploadable JSON, Ukrainian + English.
- Variables use `${}` with dollar sign.
- Keep it uploadable (DB-loadable).

```json
{
  "serviceNotAvailable": {
    "ukr": "сервіс недоступний",
    "eng": "service not available"
  },
  "welcomeMessage": {
    "ukr": "привіт ${name}",
    "eng": "hello ${name}"
  },
  "devArticleResetWarning": {
    "ukr": "ви впевнені, що хочете повернути артикул в статус '${val1}'?",
    "eng": "are you sure you want to reset the article to '${val1}'?"
  }
}
```

## Frontend
- TanStack Query: `essenceNameApi.ts` using `axiosInstance` (`frontend/src/api/axiosInstance.ts`).
- MUI `<DataGrid/>` to show essences as table with editable cells → `EssenceNameCrud.tsx`.
- React Hook Form → `EssenceNameForm.tsx` to add items.
- Columns → `useEssenceNameColumns.tsx`.
- Mutations → `useEssenceMutations.ts`.
- Dialogs → `EssenceNameEditDialog.tsx`, `EssenceNameDeleteDialog.tsx`, etc.

### TanStack routes
- Do NOT keep components inside route `index.tsx` or other route files.
- Make standalone component, put it in `components` folder, mirroring the routes logic/structure.

### Frontend messages
- Use `useString.ts` hook (`frontend/src/hooks/useString.ts`) to get DB messages in user language.
- Import and use: `const getString = useString({ str });` or pass `getString` as callback.
- Examples:

```tsx
<Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
  {getString('jobs') || 'Jobs'}
</Typography>
```

```tsx
showNotification(getString('uploadFailedSummary', { failure: failureCount }), 'error');
```

With variables in the message:

```json
{
  "uploadFailedSummary": {
    "eng": "Failed to upload ${failure} document(s)",
    "ukr": "Не вдалося завантажити ${failure} документ(ів)"
  }
}
```

## Structure files
- When I upload `backend_structure.txt` / `frontend_structure.txt`, replace the old ones — newest = up to date.

## General
- Keep files uploadable.
- Keep this MD updated each iteration — track relationships between essences, business logic, patterns.
- Propose reusable code (e.g. get-by-id) to clean services; propose new `base_repository.py` / `base_service.py` functions for DRY.
- Keep recommendations atomic (one essence at a time), max once per 5 chat exchanges.
