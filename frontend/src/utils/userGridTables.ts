// src/utils/userGridTables.ts
//
// Opt-in registry for the user-grid-columns system (per-user column
// visibility, see store/userGridColumnsStore.ts + hooks/useUserGridColumns.ts).
//
// NOT every DataGrid participates: a grid is covered if and only if it is
// listed in this enum AND wires useUserGridColumns(<enum value>, columns) into
// its <DataGrid>. The settings panel (UserGridColumnsPanel) offers exactly the
// tables registered here. Adding a table = add an enum member + a
// USER_GRID_TABLES entry + wire the hook in the grid component
// (full how-to: .claude/skills/user-grid-columns/SKILL.md).

// Const-object "enum" (a real `enum` is banned by erasableSyntaxOnly).
export const UserGridTable = {
    JOBS: 'jobs',
} as const;

export type UserGridTable = (typeof UserGridTable)[keyof typeof UserGridTable];

export interface UserGridTableConfig {
    key: UserGridTable;
    /** Translation key for the table's display name in the settings panel. */
    labelKey: string;
}

// The per-column labels shown in the settings panel are taken LIVE from each
// grid column's (already translated) headerName — no per-field list to keep.
export const USER_GRID_TABLES: UserGridTableConfig[] = [
    { key: UserGridTable.JOBS, labelKey: 'jobs' },
];
