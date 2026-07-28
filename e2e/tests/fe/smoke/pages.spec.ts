import { expect, test } from "@playwright/test";

// Broad page-load sweep. Every route below renders a page-level breadcrumb
// trail, so this is what catches a shared layout/breadcrumb primitive breaking
// a page that has no CRUD spec of its own: a render crash leaves the AppShell
// banner up but kills the <nav> underneath it.
//
// Static routes only — anything with a $param needs seeded data and belongs in
// a module spec.
// (`/admin` itself is excluded: it is the root of the trail and renders no
// breadcrumb. `tests/fe/smoke/app_shell.spec.ts` covers the hub.)
const ROUTES = [
  "/admin/department_categories",
  "/admin/departments_group/department_types/list",
  "/admin/departments_group/structure",
  "/admin/employee_events/employee_event_direction_types",
  "/admin/employee_events/employee_event_statuses",
  "/admin/employee_events/employee_event_types",
  "/admin/jobs_group/jobs",
  "/admin/jobs_group/job_groups",
  "/admin/jobs_group/job_group_types",
  "/admin/people_review/review_setup/dimensions/list",
  "/admin/people_review/review_setup/levels/list",
  "/admin/people_review/reviewers/holders",
  "/admin/persons",
  "/admin/planning_setup/plan_category_defaults",
  "/admin/planning_setup/plan_scope_defaults",
  "/admin/planning_setup/plan_session_status",
  "/admin/recruitment/dimensions",
  "/admin/recruitment/sources",
  "/admin/talent/periods",
  "/admin/talent/statuses",
  "/admin/talent/status_period_links",
  "/admin/training/categories",
  "/admin/training/statuses",
  "/admin/user_groups_group/hrm_scopes",
  "/admin/user_groups_group/user_group_types",
  "/admin/user_groups_group/user_groups",
  "/candidates",
  "/developer/audit_log",
  "/developer/catalog/essences",
  "/developer/catalog/operations",
  "/developer/event_apply",
  "/developer/process_roles/process_role",
  "/developer/security/menus",
  "/developer/security/oesl",
  "/developer/settings",
  "/developer/translations",
  "/employees",
  "/employees/headcount_plan",
  "/interviews",
  "/people_review",
  "/people_review/my",
  "/planning",
  "/recruitment",
  "/recruitment_board",
  "/settings",
  "/training",
];

for (const route of ROUTES) {
  test(`page renders: ${route}`, async ({ page }) => {
    const crashes: string[] = [];
    page.on("pageerror", (err) => crashes.push(err.message));

    await page.goto(route);

    // Never bounced to the login page.
    await expect(page).not.toHaveURL(/\/auth\//);
    // Cold Vite compiles the route on first hit, hence the generous gate.
    await expect(page.getByRole("banner")).toBeVisible({ timeout: 30000 });
    // The breadcrumb trail is a <nav>; a render crash inside the page body
    // removes it while leaving the shell banner standing.
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 30000 });

    expect(crashes, `uncaught error on ${route}`).toEqual([]);
  });
}
