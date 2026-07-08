// src/components/developer/security/menus/menuVisibility.ts
// Maps between the three model flags and the friendly 3-mode selector.
import type { MenuAdmin, MenuVisibilityMode } from './menuAdminApi';

export function deriveMode(menu: {
    visible_to_all_groups: boolean;
    visible_to_regular: boolean;
}): MenuVisibilityMode {
    if (menu.visible_to_all_groups) {
        return menu.visible_to_regular ? 'all_employees' : 'all_groups';
    }
    return 'specific';
}

export function modeToFlags(mode: MenuVisibilityMode): {
    visible_to_all_groups: boolean;
    visible_to_regular: boolean;
} {
    switch (mode) {
        case 'all_employees':
            return { visible_to_all_groups: true, visible_to_regular: true };
        case 'all_groups':
            return { visible_to_all_groups: true, visible_to_regular: false };
        case 'specific':
        default:
            return { visible_to_all_groups: false, visible_to_regular: false };
    }
}

/** Translation key for each mode's label. */
export const MODE_LABEL_KEY: Record<MenuVisibilityMode, string> = {
    all_employees: 'menuVisAllEmployees',
    all_groups: 'menuVisEveryoneInGroup',
    specific: 'menuVisSpecificGroups',
};

/** Human summary for the grid (group names resolved by the caller). */
export function describeVisibility(
    menu: MenuAdmin,
    groupNamesById: Map<number, string>,
    getString: (key: string) => string,
): string {
    const mode = deriveMode(menu);
    if (mode === 'all_employees') return getString('menuVisAllEmployees') || 'All employees';
    if (mode === 'all_groups') return getString('menuVisEveryoneInGroup') || 'Everyone in a group';
    const names = menu.group_ids
        .map((id) => groupNamesById.get(id) ?? `#${id}`)
        .join(', ');
    return names || (getString('menuVisNoGroups') || 'No groups selected');
}
