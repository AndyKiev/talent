import { apiUrl, newApiContext } from "../../../helpers/apiClient";
import { expect, test } from "../../../helpers/cleanupTracker";
import {
  clickRowDelete,
  rowByCellText,
  startCellEdit,
  submitCellEdit,
  waitForGridLoaded,
} from "../../../helpers/dataGrid";
import { confirmDialog, dialog, fillFormDialog } from "../../../helpers/dialogs";
import { uniqueName } from "../../../helpers/uniqueName";

// Pilot module: the canonical admin CRUD slice. This spec is THE template
// for covering the other admin essences - copy it, swap PATH/route/fields.
const PATH = "/admin/department_categories";
const ROUTE = "/admin/department_categories";

test("page smoke: grid renders", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForGridLoaded(page);
  await expect(page.locator('[role="row"]').first()).toBeVisible();
});

test("create, edit, delete a department category", async ({ page, cleanup }) => {
  const name = uniqueName("dep_cat");
  const api = await newApiContext();
  try {
    await page.goto(ROUTE);
    await waitForGridLoaded(page);

    // CREATE via the Add-button form dialog
    await page.locator('button:has(svg[data-testid="AddIcon"])').click();
    await expect(dialog(page)).toBeVisible();
    await fillFormDialog(page, { name, description: "E2E pilot record" });
    await confirmDialog(page);

    // Resolve the id via API (source of truth) and register for cleanup
    const listing = await api.get(apiUrl(PATH), { params: { name } });
    expect(listing.status()).toBe(200);
    const created = ((await listing.json()) as Array<{ id: number; name: string }>).find(
      (row) => row.name === name,
    );
    expect(created).toBeTruthy();
    const id = (created as { id: number }).id;
    cleanup.track({ path: PATH, id });

    // Row visible in the grid
    const row = rowByCellText(page, "name", name);
    await expect(row).toBeVisible();

    // EDIT the description inline (pencil -> value -> check -> confirm dialog)
    await startCellEdit(row, "description");
    await submitCellEdit(row, "description", "E2E pilot updated");
    await confirmDialog(page);
    await expect(row.locator('[data-field="description"]')).toContainText(
      "E2E pilot updated",
    );
    const afterEdit = await api.get(apiUrl(`${PATH}/${id}`));
    expect(((await afterEdit.json()) as { description: string }).description).toBe(
      "E2E pilot updated",
    );

    // DELETE via the row's actions column + confirm dialog
    await clickRowDelete(row);
    await confirmDialog(page);
    await expect(row).toBeHidden();
    const afterDelete = await api.get(apiUrl(`${PATH}/${id}`));
    expect(afterDelete.status()).toBe(404);
    cleanup.untrack(id);
  } finally {
    await api.dispose();
  }
});
