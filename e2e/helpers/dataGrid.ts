import { expect, type Locator, type Page } from "@playwright/test";

// MUI DataGrid selector rules (translation-proof - UI labels come from the
// DB, so NEVER select by header/label text):
// - every cell carries data-field="<api field name>"
// - rows are [role="row"], the grid is [role="grid"]
// - the delete IconButton lives in the _actions column

// First gate after page.goto. Deliberately generous default: cold Vite
// route compiles, slow list queries (jobs ~20s in-browser), and concurrent
// load on the dev stack all land here - green runs never pay for the slack.
export async function waitForGridLoaded(
  page: Page,
  timeout = 60000,
): Promise<void> {
  await expect(page.locator('[role="grid"]')).toBeVisible({ timeout });
}

/** The grid row whose `field` cell contains `text` (use unique E2E_ names).
 *  Only sees the CURRENT page - for grids that can exceed one page (10 rows)
 *  use findRowAcrossPages instead. */
export function rowByCellText(
  page: Page,
  field: string,
  text: string,
): Locator {
  return page.locator('[role="row"]', {
    has: page.locator(`[data-field="${field}"]`, { hasText: text }),
  });
}

/** Locate a row in a PAGINATED grid: checks the current page, then keeps
 *  clicking the footer's next-page arrow until the row shows up or pages run
 *  out. Use for any grid whose table can hold more than one page (jobs,
 *  department types, ...) - a freshly created row usually lands on the LAST
 *  page. Returns the row locator, already visible. */
export async function findRowAcrossPages(
  page: Page,
  field: string,
  text: string,
): Promise<Locator> {
  const row = rowByCellText(page, field, text);
  const nextButton = page
    .locator(".MuiTablePagination-actions button")
    .last();
  // First page can still be (re)loading right after a mutation.
  await page.locator('[role="grid"]').waitFor({ timeout: 30000 });
  for (;;) {
    if (await row.isVisible()) return row;
    if (!(await nextButton.isEnabled())) break;
    await nextButton.click();
    await page.waitForTimeout(150);
  }
  // One last assertion for a proper error message with the trace.
  await expect(row).toBeVisible({ timeout: 5000 });
  return row;
}

export function cellInRow(row: Locator, field: string): Locator {
  return row.locator(`[data-field="${field}"]`);
}

/** Start inline edit of a text cell (hover reveals the pencil IconButton). */
export async function startCellEdit(row: Locator, field: string): Promise<void> {
  const cell = cellInRow(row, field);
  await cell.hover();
  await cell.locator('button:has(svg[data-testid="EditIcon"])').click();
}

/** Type a new value into the active inline-edit cell and accept (check icon).
 *  The FieldEditConfirmDialog opens next - confirm it via dialogs.confirm. */
export async function submitCellEdit(
  row: Locator,
  field: string,
  newValue: string,
): Promise<void> {
  const cell = cellInRow(row, field);
  await cell.locator("input").fill(newValue);
  await cell.locator('button:has(svg[data-testid="CheckIcon"])').click();
}

// Target the DeleteIcon button explicitly - some grids (jobs) stack several
// IconButtons in the _actions cell.
export async function clickRowDelete(row: Locator): Promise<void> {
  await cellInRow(row, "_actions")
    .locator('button:has(svg[data-testid="DeleteIcon"])')
    .click();
}
