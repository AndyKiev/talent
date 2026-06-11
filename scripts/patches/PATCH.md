# Change spec → apply to TLW (talent-work)

**Target repo:** talent-work (TLW)   **Generated:** 2026-06-02 20:42:34   **Scope:** FRONTEND, 3 edits, 3 files

## ATTACH THESE FILES TO WCV (upload the LIVE TLW copies)
- frontend/src/hooks/useTranslations.ts
- frontend/src/components/developer/translations/LocaleAdminReduced.tsx
- frontend/src/components/developer/translations/useBulkTranslations.ts
+ this PATCH.md

> Instructions for WCV: "Apply the edits in this change-spec exactly. For each file find OLD and
> replace with NEW; change nothing else. For NEW files, create them with the given full content."

## EXCLUDED on purpose (do NOT bring to TLW)
- `backend/api_v1/msg_bulk/` essence — already exists in TLW.
- `main_router.py` msg_bulk registration — already in TLW.
- `msg_bulk_dependencies.py` `db_helper` import change — TL-only adaptation; TLW's `from backend.database.db_helper import db_helper` is correct there.

---

## 1. frontend/src/hooks/useTranslations.ts
**Why:** keys with no translations come back as `"msg":null` (API allows null); `.reduce` on null crashes the page.

OLD:
```ts
            acc[item.name] = item.msg.reduce((translations, msg) => {
```
NEW:
```ts
            acc[item.name] = (item.msg || []).reduce((translations, msg) => {
```

## 2. frontend/src/components/developer/translations/LocaleAdminReduced.tsx
**Why:** same null `msg` — `.forEach` on null crashes the grid build.

OLD:
```tsx
            item.msg.forEach(msg => {
                const langShortName = msg.lang_data.short_name;
                row[langShortName] = msg.value;
            });
```
NEW:
```tsx
            (item.msg || []).forEach(msg => {
                const langShortName = msg.lang_data.short_name;
                row[langShortName] = msg.value;
            });
```

## 3. frontend/src/components/developer/translations/useBulkTranslations.ts
**Why:** bulk import invalidated the wrong query key, so the grid didn't refresh after import. The grid reads key `['translations']` (see `useTranslations.ts`), not `['fullMessages']`.

OLD:
```ts
        queryClient.invalidateQueries({ queryKey: ['fullMessages'] });
```
NEW:
```ts
        queryClient.invalidateQueries({ queryKey: ['translations'] });
```

---

## Verify after applying (TLW)
1. Open `/developer/translations` — page loads (no "Cannot read properties of null").
2. Bulk-import JSON, e.g. `{ "specTest": { "eng": "Spec Test", "ukr": "Тест" } }`.
3. You get the success summary AND the new key appears in the grid **without** a manual refresh.
4. Delete the test key afterwards if you don't want it.
