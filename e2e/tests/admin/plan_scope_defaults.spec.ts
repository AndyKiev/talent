import { apiUrl, newApiContext } from "../../helpers/apiClient";
import { expect, test } from "../../helpers/cleanupTracker";
import { waitForGridLoaded } from "../../helpers/dataGrid";
import { confirmDialog, dialog } from "../../helpers/dialogs";
import { uniqueKey, uniqueName } from "../../helpers/uniqueName";

const PATH = "/admin/plan_scope_defaults";
const JG_PATH = "/job_groups";
const JGT_PATH = "/job_group_types";
const TS_PATH = "/admin/talent_statuses";
const ROUTE = "/admin/planning_setup/plan_scope_defaults";

test("page smoke: grid renders", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForGridLoaded(page);
  await expect(page.locator('[role="row"]').first()).toBeVisible();
});

test("create and delete a plan scope default", async ({ page, cleanup }) => {
  const api = await newApiContext();

  // Pre-create a job_group_type + job_group
  const jgtName = uniqueName("psd_jgt");
  const jgtResp = await api.post(apiUrl(JGT_PATH), {
    data: { name: jgtName, key: uniqueKey(32) },
  });
  expect(jgtResp.status()).toBe(201);
  const jgtId = (await jgtResp.json()).data.id;

  const jgName = uniqueName("psd_jg");
  const jgResp = await api.post(apiUrl(JG_PATH), {
    data: { name: jgName, key: uniqueKey(64), job_group_type_id: jgtId },
  });
  expect(jgResp.status()).toBe(201);
  const jgId = (await jgResp.json()).data.id;

  // Pre-create a talent_status
  const tsName = uniqueName("psd_ts", 32);
  const tsResp = await api.post(apiUrl(TS_PATH), {
    data: { name: tsName, key: uniqueKey(8) },
  });
  expect(tsResp.status()).toBe(201);
  const tsId = (await tsResp.json()).data.id;

  try {
    await page.goto(ROUTE);
    await waitForGridLoaded(page);

    await page.locator('button:has(svg[data-testid="AddIcon"])').click();
    const dlg = dialog(page);
    await expect(dlg).toBeVisible();

    // Pick job_group and talent_status from the two selects
    const selects = dlg.locator('[role="combobox"]');
    await selects.first().click();
    await page.getByRole("option", { name: jgName }).click();

    await selects.last().click();
    await page.getByRole("option", { name: tsName }).click();

    await confirmDialog(page);

    // Resolve via API
    const listing = await api.get(apiUrl(PATH));
    expect(listing.status()).toBe(200);
    const created = ((await listing.json()) as Array<{ id: number; job_group_id: number }>).find(
      (row) => row.job_group_id === jgId,
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
    await api.delete(apiUrl(`${JG_PATH}/${jgId}`));
    await api.delete(apiUrl(`${JGT_PATH}/${jgtId}`));
    await api.delete(apiUrl(`${TS_PATH}/${tsId}`));
    await api.dispose();
  }
});
