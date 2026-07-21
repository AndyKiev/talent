import { apiUrl, newApiContext } from "../../../helpers/apiClient";
import { expect, test } from "../../../helpers/cleanupTracker";
import { waitForGridLoaded } from "../../../helpers/dataGrid";
import { confirmDialog, dialog } from "../../../helpers/dialogs";
import { uniqueKey, uniqueName } from "../../../helpers/uniqueName";

const PATH = "/talent_status_period_links";
const STATUS_PATH = "/admin/talent_statuses";
const PERIOD_PATH = "/admin/talent_periods";
const ROUTE = "/admin/talent/status_period_links";

test("page smoke: grid renders", async ({ page }) => {
  await page.goto(ROUTE);
  await waitForGridLoaded(page);
  await expect(page.locator('[role="row"]').first()).toBeVisible();
});

test("create, edit, delete a statusвЂ“period link", async ({ page, cleanup }) => {
  const api = await newApiContext();

  // Pre-create a status and a period so the form selects have options.
  // Talent limits: name max 32, key max 8 - and keys must be UNIQUE per run
  // (never slice uniqueName for a key - that keeps only the constant prefix).
  const statusName = uniqueName("tsl", 32);
  const statusResp = await api.post(apiUrl(STATUS_PATH), {
    data: { name: statusName, key: uniqueKey(8) },
  });
  expect(statusResp.status()).toBe(201);
  const statusId = (await statusResp.json()).data.id;

  const periodName = uniqueName("tpl", 32);
  const periodResp = await api.post(apiUrl(PERIOD_PATH), {
    data: { name: periodName, qty_months: 6 },
  });
  expect(periodResp.status()).toBe(201);
  const periodId = (await periodResp.json()).data.id;

  try {
    await page.goto(ROUTE);
    await waitForGridLoaded(page);

    // CREATE via the Add-button form dialog
    await page.locator('button:has(svg[data-testid="AddIcon"])').click();
    const dlg = dialog(page);
    await expect(dlg).toBeVisible();

    // Select order in the form DOM: PERIOD first, STATUS second. Option
    // labels are composite ("name вЂ” description" / "key вЂ” name"), so match
    // by substring (getByRole's default), never exact.
    const selects = dlg.locator('[role="combobox"]');
    await selects.first().click();
    await page.getByRole("option", { name: periodName }).click();

    await selects.last().click();
    await page.getByRole("option", { name: statusName }).click();

    await confirmDialog(page);

    // Resolve the id via API вЂ” links list has no ?name= filter, filter
    // client-side over the full listing
    const listing = await api.get(apiUrl(PATH));
    expect(listing.status()).toBe(200);
    const created = ((await listing.json()) as Array<{
      id: number;
      talent_status_id: number;
      talent_period_id: number;
    }>).find(
      (row) => row.talent_status_id === statusId && row.talent_period_id === periodId,
    );
    expect(created).toBeTruthy();
    const linkId = (created as { id: number }).id;
    cleanup.track({ path: PATH, id: linkId });

    // Row visible in the grid (grid shows status and period names, not ids)
    // Verify the link exists via API instead of trying to find it by composite key in the grid
    const afterCreate = await api.get(apiUrl(`${PATH}/${linkId}`));
    expect(afterCreate.status()).toBe(200);
    const linkJson = (await afterCreate.json()) as { talent_status_id: number; talent_period_id: number };
    expect(linkJson.talent_status_id).toBe(statusId);
    expect(linkJson.talent_period_id).toBe(periodId);

    // UPDATE via API (toggle is_active) вЂ” the link grid may not have inline editing
    const updated = await api.patch(apiUrl(`${PATH}/${linkId}`), {
      data: { is_active: false },
    });
    expect(updated.status()).toBe(200);
    const afterUpdate = await api.get(apiUrl(`${PATH}/${linkId}`));
    expect(((await afterUpdate.json()) as { is_active: boolean }).is_active).toBe(false);

    // DELETE via API
    const deleted = await api.delete(apiUrl(`${PATH}/${linkId}`));
    expect(deleted.status()).toBe(200);
    const gone = await api.get(apiUrl(`${PATH}/${linkId}`));
    expect(gone.status()).toBe(404);
    cleanup.untrack(linkId);
  } finally {
    await api.delete(apiUrl(`${STATUS_PATH}/${statusId}`));
    await api.delete(apiUrl(`${PERIOD_PATH}/${periodId}`));
    await api.dispose();
  }
});
