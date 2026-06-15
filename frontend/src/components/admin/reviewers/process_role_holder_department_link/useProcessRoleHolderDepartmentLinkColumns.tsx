// src/components/admin/reviewers/process_role_holder_department_link/useProcessRoleHolderDepartmentLinkColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import type { ProcessRoleHolderDepartmentLink } from './processRoleHolderDepartmentLinkApi.ts';
import cfl from '../../../../utils/capitalizeFirstLetter.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import { formatToUkrDate } from '../../../../utils/dateFormatter.ts';

interface Params {
    getString: GetStringFn;
    onDeleteClick: (row: ProcessRoleHolderDepartmentLink) => void;
    deleteIsPending: boolean;
}

export function useProcessRoleHolderDepartmentLinkColumns({
    getString,
    onDeleteClick,
    deleteIsPending,
}: Params): GridColDef[] {
    return [
        {
            field: 'department_name',
            headerName: cfl(getString('department')) || 'Department',
            flex: 1,
            minWidth: 220,
            renderCell: (params: GridRenderCellParams<ProcessRoleHolderDepartmentLink>) => (
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    {params.row.department_name ?? `#${params.row.department_id}`}
                </Typography>
            ),
        },
        {
            field: 'created_at',
            headerName: getString('createdAt'),
            width: 160,
            renderCell: (params: GridRenderCellParams<ProcessRoleHolderDepartmentLink>) =>
                formatToUkrDate(params.row.created_at),
        },
        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<ProcessRoleHolderDepartmentLink>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Tooltip title={getString('delete') || 'Delete'}>
                        <span>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => { e.stopPropagation(); onDeleteClick(params.row); }}
                                disabled={deleteIsPending}
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
