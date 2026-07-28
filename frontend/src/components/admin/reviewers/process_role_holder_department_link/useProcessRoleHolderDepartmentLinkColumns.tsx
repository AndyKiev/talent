// src/components/admin/reviewers/process_role_holder_department_link/useProcessRoleHolderDepartmentLinkColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Typography } from '@mui/material';

import type { ProcessRoleHolderDepartmentLink } from './processRoleHolderDepartmentLinkApi.ts';
import cfl from '../../../../utils/capitalizeFirstLetter.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import { formatToUkrDate } from '../../../../utils/dateFormatter.ts';
import { deleteActionCol } from '../../../../utils/columnBuilders';

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
        deleteActionCol<ProcessRoleHolderDepartmentLink>({ getString, onDeleteClick, deleteIsPending }),
    ];
}
