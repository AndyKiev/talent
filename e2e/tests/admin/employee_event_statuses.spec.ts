import { apiUrl, newApiContext } from "../../helpers/apiClient";
import { expect, test } from "../../helpers/cleanupTracker";
import {
  clickRowDelete,
  findRowAcrossPages,
  startCellEdit,
  submitCellEdit,
  waitForGridLoaded,
} from "../../helpers/dataGrid";
import { confirmDialog, dialog, fillFormDialog } from "../../helpers/dialogs";
import { uniqueName } from "../../helpers/uniqueName";

const PATH = "/admin/employee_events/employee_event_statuses";
const ROUTE = "/admin/employee_events/employee_event_statuses";

test("page smoke: grid renders", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForGridLoaded(page);
  await expect(page.locator('[role="row"]').first()).toBeVisible();
});

test("create, edit, delete an employee event status", async ({ page, cleanup }) => {
  const name = uniqueName("ees", 32); // max 32 chars
  const api = await newApiContext();
  try {
    await page.goto(ROUTE);
    await waitForGridLoaded(page);

    await page.locator('button:has(svg[data-testid="AddIcon"])').click();
    await expect(dialog(page)).toBeVisible();
    await fillFormDialog(page, { name, description: "E2E pilot record" });
    await confirmDialog(page);

    const listing = await api.get(apiUrl(PATH), { params: { name } });
    expect(listing.status()).toBe(200);
    const created = ((await listing.json()) as Array<{ id: number; name: string }>).find(
      (row) => row.name === name,
    );
    expect(created).toBeTruthy();
    const id = (created as { id: number }).id;
    cleanup.track({ path: PATH, id });

    const row = await findRowAcrossPages(page, "name", name);
    await expect(row).toBeVisible();

    await startCellEdit(row, "description");
    await submitCellEdit(row, "description", "E2E pilot updated");
    await confirmDialog(page);
    await expect(row.locator('[data-field="description"]')).toContainText("E2E pilot updated");
    const afterEdit = await api.get(apiUrl(`${PATH}/${id}`));
    expect(((await afterEdit.json()) as { description: string }).description).toBe("E2E pilot updated");

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
