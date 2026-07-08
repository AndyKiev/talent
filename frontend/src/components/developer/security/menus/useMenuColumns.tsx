// src/components/developer/security/menus/useMenuColumns.tsx
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { GridColDef } from '@mui/x-data-grid';

import type { MenuAdmin } from './menuAdminApi';
import { describeVisibility } from './menuVisibility';
import type { GetStringFn } from '../../../../types/getStringFn';

interface Params {
    getString: GetStringFn;
    groupNamesById: Map<number, string>;
    menuKeysById: Map<number, string>;
    onEdit: (row: MenuAdmin) => void;
    onDelete: (row: MenuAdmin) => void;
    deleteIsPending: boolean;
}

export function useMenuColumns({
    getString,
    groupNamesById,
    menuKeysById,
    onEdit,
    onDelete,
    deleteIsPending,
}: Params): GridColDef<MenuAdmin>[] {
    return [
        {
            field: 'key',
            headerName: getString('menuKey') || 'Key',
            flex: 1,
            minWidth: 120,
        },
        {
            field: 'label_key',
            headerName: getString('label') || 'Label',
            flex: 1,
            minWidth: 120,
            renderCell: (params) => getString(params.row.label_key) || params.row.label_key,
        },
        {
            field: 'path',
            headerName: getString('path') || 'Path',
            flex: 1,
            minWidth: 140,
        },
        {
            field: 'parent_id',
            headerName: getString('parentMenu') || 'Parent',
            flex: 0.8,
            minWidth: 110,
            renderCell: (params) =>
                params.row.parent_id != null
                    ? menuKeysById.get(params.row.parent_id) ?? `#${params.row.parent_id}`
                    : '—',
        },
        {
            field: 'visibility',
            headerName: getString('menuVisibility') || 'Visible to',
            flex: 1.3,
            minWidth: 180,
            sortable: false,
            renderCell: (params) =>
                describeVisibility(params.row, groupNamesById, getString),
        },
        {
            field: 'sort_order',
            headerName: getString('sortOrder') || 'Order',
            width: 90,
            type: 'number',
        },
        {
            field: 'is_active',
            headerName: getString('active') || 'Active',
            width: 100,
            renderCell: (params) => (
                <Chip
                    size="small"
                    label={
                        params.row.is_active
                            ? getString('yes') || 'Yes'
                            : getString('no') || 'No'
                    }
                    color={params.row.is_active ? 'success' : 'default'}
                    variant={params.row.is_active ? 'filled' : 'outlined'}
                />
            ),
        },
        {
            field: 'actions',
            headerName: getString('actions') || 'Actions',
            width: 110,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Box>
                    <Tooltip title={getString('edit') || 'Edit'}>
                        <IconButton size="small" onClick={() => onEdit(params.row)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={getString('delete') || 'Delete'}>
                        <span>
                            <IconButton
                                size="small"
                                color="error"
                                disabled={deleteIsPending}
                                onClick={() => onDelete(params.row)}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            ),
        },
    ];
}
