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

const PATH = "/jobs";
const ROUTE = "/admin/jobs_group/jobs";

// The jobs page is the heaviest admin grid (~30s to interactive: three
// sequential list queries over 180+ rows) - larger budgets than the default.
test("page smoke: grid renders", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(ROUTE);
  await waitForGridLoaded(page, 60000);
  await expect(page.locator('[role="row"]').first()).toBeVisible();
});

// Every mutation on this page awaits a ~20s in-browser jobs refetch before
// its dialog closes - hence the 60s dialog waits and the 240s test budget.
// When the /jobs endpoint perf issue is fixed, lower these back to defaults.
test("create, edit, delete a job", async ({ page, cleanup }) => {
  test.setTimeout(240000);
  const name = uniqueName("job");
  const api = await newApiContext();
  try {
    await page.goto(ROUTE);
    await waitForGridLoaded(page, 60000);

    // CREATE via the Add-button form dialog
    await page.locator('button:has(svg[data-testid="AddIcon"])').click();
    await expect(dialog(page)).toBeVisible();
    await fillFormDialog(page, { name, description: "E2E pilot record" });
    await confirmDialog(page, 60000);

    // Resolve the id via API (source of truth) and register for cleanup
    const listing = await api.get(apiUrl(PATH), { params: { name } });
    expect(listing.status()).toBe(200);
    const created = ((await listing.json()) as Array<{ id: number; name: string }>).find(
      (row) => row.name === name,
    );
    expect(created).toBeTruthy();
    const id = (created as { id: number }).id;
    cleanup.track({ path: PATH, id });

    // The jobs table holds hundreds of rows - narrow it with the page's own
    // name filter: the first TEXT input above the grid (the two Autocomplete
    // filters carry role="combobox"; the edit-mode Switch is type="checkbox").
    await page
      .locator('input[type="text"]:not([role="combobox"])')
      .first()
      .fill(name);
    const row = rowByCellText(page, "name", name);
    await expect(row).toBeVisible();

    // The jobs grid is read-only until the edit-mode switch (the first
    // switch on the page, above the grid) is turned ON - it gates the
    // inline-edit pencils and the row delete button.
    await page.locator('input[role="switch"]').first().check();

    // EDIT the description inline. NOTE: JobCrud has
    // REQUIRE_EDIT_CONFIRMATION = false - the check click saves IMMEDIATELY,
    // there is NO FieldEditConfirmDialog on this grid.
    await startCellEdit(row, "description");
    await submitCellEdit(row, "description", "E2E pilot updated");
    await expect(row.locator('[data-field="description"]')).toContainText(
      "E2E pilot updated",
      { timeout: 60000 },
    );
    const afterEdit = await api.get(apiUrl(`${PATH}/${id}`));
    expect(((await afterEdit.json()) as { description: string }).description).toBe(
      "E2E pilot updated",
    );

    // DELETE via the row's actions column + confirm dialog
    await clickRowDelete(row);
    await confirmDialog(page, 60000);
    await expect(row).toBeHidden();
    const afterDelete = await api.get(apiUrl(`${PATH}/${id}`));
    expect(afterDelete.status()).toBe(404);
    cleanup.untrack(id);
  } finally {
    await api.dispose();
  }
});
