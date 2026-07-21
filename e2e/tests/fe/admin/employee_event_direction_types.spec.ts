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
import { uniqueKey, uniqueName } from "../../../helpers/uniqueName";

const PATH = "/admin/employee_events/employee_event_direction_types";
const ROUTE = "/admin/employee_events/employee_event_direction_types";

test("page smoke: grid renders", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForGridLoaded(page);
  await expect(page.locator('[role="row"]').first()).toBeVisible();
});

test("create, edit, delete an employee event direction type", async ({ page, cleanup }) => {
  // Slow page (~25s to interactive) + three mutation refetches - the default
  // 60s test budget is not enough.
  test.setTimeout(120000);
  const name = uniqueName("eedt", 128);
  const code = uniqueKey(64); // must match ^[A-Z0-9_]+$ вЂ” uniqueKey uses uppercase
  const api = await newApiContext();
  try {
    await page.goto(ROUTE);
    await waitForGridLoaded(page);

    await page.locator('button:has(svg[data-testid="AddIcon"])').click();
    await expect(dialog(page)).toBeVisible();
    // No description field on this essence
    await fillFormDialog(page, { code, name });
    await confirmDialog(page);

    // Resolve via ?code= (no ?name= filter on this endpoint)
    const listing = await api.get(apiUrl(PATH), { params: { code } });
    expect(listing.status()).toBe(200);
    const created = ((await listing.json()) as Array<{ id: number; code: string }>).find(
      (row) => row.code === code,
    );
    expect(created).toBeTruthy();
    const id = (created as { id: number }).id;
    cleanup.track({ path: PATH, id });

    const row = await findRowAcrossPages(page, "code", code);
    await expect(row).toBeVisible();

    // Only name is inline-editable (code column is read-only)
    const newName = uniqueName("eedt_upd", 128);
    await startCellEdit(row, "name");
    await submitCellEdit(row, "name", newName);
    await confirmDialog(page);
    await expect(row.locator('[data-field="name"]')).toContainText(newName);
    const afterEdit = await api.get(apiUrl(`${PATH}/${id}`));
    expect(((await afterEdit.json()) as { name: string }).name).toBe(newName);

    await clickRowDelete(row);
    await confirmDialog(page);
    await expect(row).toBeHidden({ timeout: 30000 });
    const afterDelete = await api.get(apiUrl(`${PATH}/${id}`));
    expect(afterDelete.status()).toBe(404);
    cleanup.untrack(id);
  } finally {
    await api.dispose();
  }
});
