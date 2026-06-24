// src/config/menuVisibility.ts
export const MENU_ACCESS: Record<string, string[] | null> = {
    employees: null,                          // everyone
    peopleReview: null,                       // everyone (page scopes itself)
    planning: ["dev", "admin", "hrs"],
    admin: ["dev", "admin"],
    developer: ["dev"],
};

export const canSeeMenu = (
    menuKey: string,
    userGroups: string[] = []
): boolean => {
    const allowed = MENU_ACCESS[menuKey];
    if (!allowed) return true;                 // public menu
    const lower = userGroups.map((g) => g.toLowerCase());
    return allowed.some((g) => lower.includes(g.toLowerCase()));
};