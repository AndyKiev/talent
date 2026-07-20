import { apiUrl, newApiContext } from "../../helpers/apiClient";
import { expect, test } from "../../helpers/cleanupTracker";
import { waitForGridLoaded } from "../../helpers/dataGrid";
import { confirmDialog, dialog } from "../../helpers/dialogs";
import { uniqueName } from "../../helpers/uniqueName";

const PATH = "/admin/plan_category_defaults";
const CAT_PATH = "/admin/department_categories";
const ROUTE = "/admin/planning_setup/plan_category_defaults";

test("page smoke: grid renders", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForGridLoaded(page);
  await expect(page.locator('[role="row"]').first()).toBeVisible();
});

test("create and delete a plan category default", async ({ page, cleanup }) => {
  const api = await newApiContext();

  // Pre-create a department_category so the select has an option
  const catName = uniqueName("pcd_cat");
  const catResp = await api.post(apiUrl(CAT_PATH), {
    data: { name: catName, description: "E2E temp" },
  });
  expect(catResp.status()).toBe(201);
  const catId = (await catResp.json()).data.id;

  try {
    await page.goto(ROUTE);
    await waitForGridLoaded(page);

    await page.locator('button:has(svg[data-testid="AddIcon"])').click();
    const dlg = dialog(page);
    await expect(dlg).toBeVisible();

    // Pick the department category from the select
    await dlg.locator('[role="combobox"]').click();
    await page.getByRole("option", { name: catName }).click();

    await confirmDialog(page);

    // Resolve via API — filter client-side by department_category_id
    const listing = await api.get(apiUrl(PATH));
    expect(listing.status()).toBe(200);
    const created = ((await listing.json()) as Array<{ id: number; department_category_id: number }>).find(
      (row) => row.department_category_id === catId,
    );
    expect(created).toBeTruthy();
    const id = (created as { id: number }).id;
    cleanup.track({ path: PATH, id });

    // This essence has NO GET /{id} route (list + POST + DELETE only, a GET
    // on /{id} answers 405) - verify presence/absence via the LIST.
    const inList = async (): Promise<boolean> => {
      const rows = (await (await api.get(apiUrl(PATH))).json()) as Array<{
        id: number;
      }>;
      return rows.some((row) => row.id === id);
    };
    expect(await inList()).toBe(true);

    // DELETE via API (no edit on this essence)
    const deleted = await api.delete(apiUrl(`${PATH}/${id}`));
    expect(deleted.status()).toBe(200);
    expect(await inList()).toBe(false);
    cleanup.untrack(id);
  } finally {
    await api.delete(apiUrl(`${CAT_PATH}/${catId}`));
    await api.dispose();
  }
});
