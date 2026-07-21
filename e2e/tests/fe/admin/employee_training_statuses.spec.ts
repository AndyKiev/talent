import { apiUrl, newApiContext } from "../../../helpers/apiClient";
import { expect, test } from "../../../helpers/cleanupTracker";
import {
  clickRowDelete,
  findRowAcrossPages,
  startCellEdit,
  submitCellEdit,
  waitForGridLoaded,
} from "../../../helpers/dataGrid";
import { confirmDialog, dialog, fillFormDialog } from "../../../helpers/dialogs";
import { uniqueKey } from "../../../helpers/uniqueName";

const PATH = "/employee_training_statuses";
const ROUTE = "/admin/training/statuses";

test("page smoke: grid renders", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForGridLoaded(page);
  await expect(page.locator('[role="row"]').first()).toBeVisible();
});

test("create, edit, delete an employee training status", async ({ page, cleanup }) => {
  const key = uniqueKey(32);
  const api = await newApiContext();
  try {
    await page.goto(ROUTE);
    await waitForGridLoaded(page);

    await page.locator('button:has(svg[data-testid="AddIcon"])').click();
    await expect(dialog(page)).toBeVisible();
    // Form has: key + description fields (react-hook-form with register)
    await fillFormDialog(page, { key, description: "E2E pilot record" });
    await confirmDialog(page);

    // No ?name= filter вЂ” filter client-side by key
    const listing = await api.get(apiUrl(PATH));
    expect(listing.status()).toBe(200);
    const created = ((await listing.json()) as Array<{ id: number; key: string }>).find(
      (row) => row.key === key,
    );
    expect(created).toBeTruthy();
    const id = (created as { id: number }).id;
    cleanup.track({ path: PATH, id });

    const row = await findRowAcrossPages(page, "key", key);
    await expect(row).toBeVisible();

    await startCellEdit(row, "description");
    await submitCellEdit(row, "description", "E2E pilot updated");
    await confirmDialog(page);
    await expect(row.locator('[data-field="description"]')).toContainText("E2E pilot updated");

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
