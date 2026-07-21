import { apiUrl, newApiContext } from "../../../helpers/apiClient";
import { expect, test } from "../../../helpers/cleanupTracker";
import {
  findRowAcrossPages,
  waitForGridLoaded,
} from "../../../helpers/dataGrid";
import { confirmDialog, dialog, fillFormDialog } from "../../../helpers/dialogs";
import { uniqueKey, uniqueName } from "../../../helpers/uniqueName";

const PATH = "/review_dimensions";
const ROUTE = "/admin/people_review/review_setup/dimensions/list";

test("page smoke: grid renders", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForGridLoaded(page);
  await expect(page.locator('[role="row"]').first()).toBeVisible();
});

test("create, edit, delete a review dimension", async ({ page, cleanup }) => {
  const name = uniqueName("rdim", 128);
  const key = uniqueKey(64);
  const api = await newApiContext();
  try {
    await page.goto(ROUTE);
    await waitForGridLoaded(page);

    // CREATE via the Add-button form dialog
    await page.locator('button:has(svg[data-testid="AddIcon"])').click();
    await expect(dialog(page)).toBeVisible();
    await fillFormDialog(page, { name, key, description: "E2E pilot record" });
    await confirmDialog(page);

    // Resolve via API
    const listing = await api.get(apiUrl(PATH), { params: { name } });
    expect(listing.status()).toBe(200);
    const created = ((await listing.json()) as Array<{ id: number; name: string }>).find(
      (row) => row.name === name,
    );
    expect(created).toBeTruthy();
    const id = (created as { id: number }).id;
    cleanup.track({ path: PATH, id });

    // Row visible in the grid
    const row = await findRowAcrossPages(page, "name", name);
    await expect(row).toBeVisible();

    // EDIT via API (this grid uses a shared form dialog, not inline editing)
    const updated = await api.patch(apiUrl(`${PATH}/${id}`), {
      data: { description: "E2E pilot updated" },
    });
    expect(updated.status()).toBe(200);
    const afterEdit = await api.get(apiUrl(`${PATH}/${id}`));
    expect(((await afterEdit.json()) as { description: string }).description).toBe("E2E pilot updated");

    // DELETE via UI вЂ” DeleteIcon in the actions column
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
