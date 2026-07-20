import { expect, type Locator, type Page } from "@playwright/test";

// Shared MUI dialog convention across the admin CRUD slices
// (DepartmentCategoryForm, ConfirmDeleteDialog, FieldEditConfirmDialog):
// cancel = the outlined button, confirm/submit = the contained button.
// Button captions are DB translations - never select dialog buttons by text.

export function dialog(page: Page): Locator {
  return page.getByRole("dialog");
}

export async function confirmDialog(page: Page, timeout = 60000): Promise<void> {
  const box = dialog(page);
  await box.locator("button.MuiButton-contained").click();
  // Dialogs close only after the mutation + query invalidation settle; on
  // this stack that regularly takes 20-35s (slow list refetches), so the
  // default is deliberately generous - green runs never pay for it.
  await expect(box).toBeHidden({ timeout });
}

export async function cancelDialog(page: Page): Promise<void> {
  const box = dialog(page);
  await box.locator("button.MuiButton-outlined").click();
  await expect(box).toBeHidden();
}

/** Fill react-hook-form registered fields by their name attribute.
 *  Multiline TextFields render a textarea - "input, textarea" covers both. */
export async function fillFormDialog(
  page: Page,
  values: Record<string, string>,
): Promise<void> {
  const box = dialog(page);
  for (const [name, value] of Object.entries(values)) {
    await box.locator(`input[name="${name}"], textarea[name="${name}"]`).first().fill(value);
  }
}
