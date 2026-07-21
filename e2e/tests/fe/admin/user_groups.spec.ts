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

const PATH = "/admin/user_groups";
const TYPE_PATH = "/admin/user_group_types";
const ROUTE = "/admin/user_groups_group/user_groups";

test("page smoke: grid renders", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForGridLoaded(page);
  await expect(page.locator('[role="row"]').first()).toBeVisible();
});

test("create, edit, delete a user group", async ({ page, cleanup }) => {
  const name = uniqueName("user_group");
  const api = await newApiContext();

  // Pre-create a user_group_type so the Select has an option
  const typeName = uniqueName("ugt_for_group");
  const typeResp = await api.post(apiUrl(TYPE_PATH), {
    data: { name: typeName },
  });
  expect(typeResp.status()).toBe(201);
  const typeId = (await typeResp.json()).data.id;

  try {
    await page.goto(ROUTE);
    await waitForGridLoaded(page);

    await page.locator('button:has(svg[data-testid="AddIcon"])').click();
    const dlg = dialog(page);
    await expect(dlg).toBeVisible();

    await fillFormDialog(page, { name, description: "E2E pilot record" });

    // Pick the pre-created type from the MUI Select
    await dlg.locator('[role="combobox"]').click();
    await page.getByRole("option", { name: typeName }).click();

    await confirmDialog(page);

    // user_groups list has no ?name= filter вЂ” filter client-side
    const listing = await api.get(apiUrl(PATH));
    expect(listing.status()).toBe(200);
    const created = ((await listing.json()) as Array<{ id: number; name: string }>).find(
      (row) => row.name === name,
    );
    expect(created).toBeTruthy();
    const id = (created as { id: number }).id;
    cleanup.track({ path: PATH, id });

    const row = rowByCellText(page, "name", name);
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
    await api.delete(apiUrl(`${TYPE_PATH}/${typeId}`));
    await api.dispose();
  }
});
