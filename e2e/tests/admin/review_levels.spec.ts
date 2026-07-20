import { apiUrl, newApiContext } from "../../helpers/apiClient";
import { expect, test } from "../../helpers/cleanupTracker";
import { rowByCellText, waitForGridLoaded } from "../../helpers/dataGrid";
import { confirmDialog, dialog, fillFormDialog } from "../../helpers/dialogs";
import { uniqueName } from "../../helpers/uniqueName";

const PATH = "/review_levels";
const ROUTE = "/admin/people_review/review_setup/levels/list";

test("page smoke: grid renders", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForGridLoaded(page);
  await expect(page.locator('[role="row"]').first()).toBeVisible();
});

test("create, edit, delete a review level", async ({ page, cleanup }) => {
  const nameEng = uniqueName("rlvl_en", 64);
  const nameUkr = uniqueName("rlvl_uk", 64);
  const api = await newApiContext();
  try {
    await page.goto(ROUTE);
    await waitForGridLoaded(page);

    // CREATE via the Add-button form dialog
    await page.locator('button:has(svg[data-testid="AddIcon"])').click();
    await expect(dialog(page)).toBeVisible();
    // ReviewLevelForm requires nameEng + nameUkr (name_key is auto-derived)
    await fillFormDialog(page, { nameEng, nameUkr });
    await confirmDialog(page);

    // Resolve via API — review_levels list has no ?name= filter, filter client-side.
    // name_key = slugifyKey("reviewLevelName_", nameEng): lowercased, split on
    // non-alphanumerics, camelCased — underscores DISAPPEAR. Compare the
    // NORMALIZED (alnum-only lowercase) forms instead of raw substrings.
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const listing = await api.get(apiUrl(PATH));
    expect(listing.status()).toBe(200);
    const allRows = (await listing.json()) as Array<{ id: number; name_key: string }>;
    const created = allRows.find((row) =>
      normalize(row.name_key).includes(normalize(nameEng)),
    );
    expect(created).toBeTruthy();
    const id = (created as { id: number }).id;
    const nameKey = (created as { name_key: string }).name_key;
    cleanup.track({ path: PATH, id });

    // Row visible in the grid: the name_key cell renders the raw key as
    // secondary text (an id hasText match would be a substring trap: id 7
    // also matches 17, 71, ...).
    const row = rowByCellText(page, "name_key", nameKey);
    await expect(row).toBeVisible();

    // EDIT via API (this grid uses a shared form dialog, not inline editing)
    const updated = await api.patch(apiUrl(`${PATH}/${id}`), {
      data: { description_key: uniqueName("rlvl_upd", 128) },
    });
    expect(updated.status()).toBe(200);
    const afterEdit = await api.get(apiUrl(`${PATH}/${id}`));
    const afterJson = (await afterEdit.json()) as { description_key: string };
    expect(afterJson.description_key).toBeTruthy();

    // DELETE via UI — DeleteIcon in the actions column
    await row.locator('button:has(svg[data-testid="DeleteIcon"])').click();
    await confirmDialog(page);
    await expect(row).toBeHidden();
    const afterDelete = await api.get(apiUrl(`${PATH}/${id}`));
    expect(afterDelete.status()).toBe(404);
    cleanup.untrack(id);
  } finally {
    await api.dispose();
  }
});
