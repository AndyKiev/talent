// src/components/user_grid_columns/UserGridColumnsPanel.tsx
//
// Settings tool for the user-grid-columns system: pick a registered table,
// toggle its columns (live-synced with the grid via the shared zustand store),
// or reset the table to its default columns. Rendered on the GENERAL group of
// both the developer settings page and the user settings page. The config is
// per-browser (localStorage), so there is nothing to save server-side.
//
// The column list is rendered from `knownColumns` — the columns the grid last
// published — NOT a hand-maintained list. Add a column to the grid and it
// appears here automatically; a column absent from the user's overrides counts
// as visible.
import { useState } from 'react';
import {
    Box,
    Button,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Typography,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import useString from '../../hooks/useString';
import cfl, { snakeToCamel } from '../../utils/helpers.ts';
import { USER_GRID_TABLES } from '../../utils/userGridTables';
import { useUserGridColumnsStore } from '../../store/userGridColumnsStore';

export function UserGridColumnsPanel() {
    const getString = useString();
    const [tableKey, setTableKey] = useState<string>(USER_GRID_TABLES[0]?.key ?? '');

    const overrides = useUserGridColumnsStore((s) => s.tables[tableKey]);
    const knownColumns = useUserGridColumnsStore((s) => s.knownColumns[tableKey]);
    const setColumnVisible = useUserGridColumnsStore((s) => s.setColumnVisible);
    const resetTable = useUserGridColumnsStore((s) => s.resetTable);

    const columns = knownColumns ?? [];

    // A field is visible unless the user's overrides say otherwise.
    const isVisible = (field: string) => overrides?.[field]?.visible !== false;

    // The grid already resolved each header via getString; fall back to the
    // field name (used by the actions column, whose header is empty).
    const columnLabel = (field: string, headerName: string) =>
        headerName ||
        cfl(getString(snakeToCamel(field.replace(/^_/, '')))) ||
        field;

    return (
        <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
            <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
                <ViewColumnIcon fontSize="small" color="action" />
                <Typography fontWeight={600}>
                    {cfl(getString('userGridColumns')) || 'Table columns'}
                </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
                {getString('userGridColumnsDesc') ||
                    'Per-user column visibility, stored in this browser.'}
            </Typography>

            <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap" mb={2}>
                <Select
                    size="small"
                    variant="outlined"
                    value={tableKey}
                    onChange={(e) => setTableKey(e.target.value)}
                    sx={{ minWidth: 220 }}
                >
                    {USER_GRID_TABLES.map((t) => (
                        <MenuItem key={t.key} value={t.key}>
                            {cfl(getString(t.labelKey)) || t.key}
                        </MenuItem>
                    ))}
                </Select>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RestartAltIcon />}
                    disabled={!overrides}
                    onClick={() => resetTable(tableKey)}
                >
                    {getString('resetToDefault') || 'Reset to default'}
                </Button>
            </Stack>

            {columns.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {getString('userGridColumnsNoOverrides') ||
                        'No saved column settings for this table — default columns are used.'}
                </Typography>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: 0.5,
                    }}
                >
                    {columns.map(({ field, headerName }) => (
                        <Stack key={field} direction="row" alignItems="center" gap={1}>
                            <Switch
                                size="small"
                                checked={isVisible(field)}
                                onChange={(e) => setColumnVisible(tableKey, field, e.target.checked)}
                            />
                            <Typography variant="body2">
                                {columnLabel(field, headerName)}
                            </Typography>
                        </Stack>
                    ))}
                </Box>
            )}
        </Paper>
    );
}
