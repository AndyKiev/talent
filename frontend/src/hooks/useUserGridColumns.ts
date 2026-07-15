// src/hooks/useUserGridColumns.ts
//
// Binds a <DataGrid> to the per-user column-visibility store. Usage:
//
//   const userGridColumns = useUserGridColumns(UserGridTable.JOBS, columns);
//   <DataGrid columns={columns} {...userGridColumns} ... />
//
// The user hides/shows columns via the grid's own column menu ("Manage
// columns"); every change is written to localStorage. The grid also publishes
// its CURRENT columns (field + translated header) into the store, so the
// settings panel always lists exactly the columns the grid has — add a column
// and it appears there automatically, never lost.
import { useCallback, useEffect, useMemo } from 'react';
import type { GridColDef, GridColumnVisibilityModel } from '@mui/x-data-grid';
import { useUserGridColumnsStore } from '../store/userGridColumnsStore';
import type { UserGridTable } from '../utils/userGridTables';

interface UserGridColumnsBinding {
    columnVisibilityModel: GridColumnVisibilityModel;
    onColumnVisibilityModelChange: (model: GridColumnVisibilityModel) => void;
}

export function useUserGridColumns(
    table: UserGridTable,
    columns: GridColDef[],
): UserGridColumnsBinding {
    // Undefined until the user first customizes this table — stable reference,
    // so uninitialized tables never re-render the grid.
    const tableColumns = useUserGridColumnsStore((s) => s.tables[table]);
    const applyVisibilityModel = useUserGridColumnsStore((s) => s.applyVisibilityModel);
    const syncKnownColumns = useUserGridColumnsStore((s) => s.syncKnownColumns);

    // Publish the grid's current columns (field + header label) to the store so
    // the settings panel renders from the live column set. Keyed on a signature
    // so it only fires when the columns actually change; the store no-ops on
    // equal input, so this can't loop.
    const knownColumns = useMemo(
        () => columns.map((c) => ({ field: c.field, headerName: String(c.headerName ?? '') })),
        [columns],
    );
    const signature = useMemo(
        () => knownColumns.map((c) => `${c.field}:${c.headerName}`).join('|'),
        [knownColumns],
    );
    useEffect(() => {
        syncKnownColumns(table, knownColumns);
        // knownColumns is derived from `signature`; depending on the signature
        // keeps this effect from firing on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table, signature, syncKnownColumns]);

    const columnVisibilityModel = useMemo<GridColumnVisibilityModel>(() => {
        if (!tableColumns) return {};
        const model: GridColumnVisibilityModel = {};
        for (const [field, cfg] of Object.entries(tableColumns)) {
            model[field] = cfg.visible;
        }
        return model;
    }, [tableColumns]);

    const fields = useMemo(() => columns.map((c) => c.field), [columns]);

    const onColumnVisibilityModelChange = useCallback(
        (model: GridColumnVisibilityModel) => {
            applyVisibilityModel(table, model, fields);
        },
        [table, fields, applyVisibilityModel],
    );

    return { columnVisibilityModel, onColumnVisibilityModelChange };
}
