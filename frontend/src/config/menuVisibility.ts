// src/config/menuVisibility.ts
export const MENU_ACCESS: Record<string, string[] | null> = {
    employees: null,                          // everyone (with at least one group)
    peopleReview: null,                       // everyone (page scopes itself)
    training: null,                           // everyone (with at least one group)
    planning: ["dev", "admin", "hrs"],
    admin: ["dev", "admin"],
    developer: ["dev"],
};

// A "regular user" (no groups at all) works in 'only me' mode: the only tab
// they get is People Review — the entry page redirects them to their own row
// in the active session. Their API permissions come from the seeded 'regular'
// baseline group (permission-matrix column), inherited implicitly.
const REGULAR_USER_MENUS = ["peopleReview"];

export const canSeeMenu = (
    menuKey: string,
    userGroups: string[] = []
): boolean => {
    if (userGroups.length === 0) return REGULAR_USER_MENUS.includes(menuKey);
    const allowed = MENU_ACCESS[menuKey];
    if (!allowed) return true;                 // public menu
    const lower = userGroups.map((g) => g.toLowerCase());
    return allowed.some((g) => lower.includes(g.toLowerCase()));
};
