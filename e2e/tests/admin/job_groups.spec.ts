import { apiUrl, newApiContext } from "../../helpers/apiClient";
import { expect, test } from "../../helpers/cleanupTracker";
import {
  clickRowDelete,
  rowByCellText,
  startCellEdit,
  submitCellEdit,
  waitForGridLoaded,
} from "../../helpers/dataGrid";
import { confirmDialog, dialog, fillFormDialog } from "../../helpers/dialogs";
import { uniqueName } from "../../helpers/uniqueName";

const PATH = "/job_groups";
const TYPE_PATH = "/job_group_types";
const ROUTE = "/admin/jobs_group/job_groups";

test("page smoke: grid renders", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForGridLoaded(page);
  await expect(page.locator('[role="row"]').first()).toBeVisible();
});

test("create, edit, delete a job group", async ({ page, cleanup }) => {
  const name = uniqueName("job_group");
  const key = uniqueName("jg_key").slice(0, 64);
  const api = await newApiContext();

  // Pre-create a job_group_type so the Select has an option
  const typeName = uniqueName("jgt_for_group");
  const typeResp = await api.post(apiUrl(TYPE_PATH), {
    data: { name: typeName, key: uniqueName("jgt_key").slice(0, 32) },
  });
  expect(typeResp.status()).toBe(201);
  const typeId = (await typeResp.json()).data.id;

  try {
    await page.goto(ROUTE);
    await waitForGridLoaded(page);

    // CREATE via the Add-button form dialog
    await page.locator('button:has(svg[data-testid="AddIcon"])').click();
    const dlg = dialog(page);
    await expect(dlg).toBeVisible();

    // Fill text fields
    await fillFormDialog(page, { name, key, description: "E2E pilot record" });

    // Pick first Group Type from the Select
    await dlg.locator('[role="combobox"]').click();
    await page.getByRole("option").first().click();

    await confirmDialog(page);

    // Resolve the id via API — job_groups list has no ?name= filter, filter
    // client-side over the full listing
    const listing = await api.get(apiUrl(PATH));
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
    await api.delete(apiUrl(`${TYPE_PATH}/${typeId}`));
    await api.dispose();
  }
});
