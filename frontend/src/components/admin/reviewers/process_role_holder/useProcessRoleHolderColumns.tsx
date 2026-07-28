// src/components/admin/reviewers/process_role_holder/useProcessRoleHolderColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Typography } from '@mui/material';

import type { ProcessRoleHolder } from './processRoleHolderApi.ts';
import cfl from '../../../../utils/capitalizeFirstLetter.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import { formatToUkrDate } from '../../../../utils/dateFormatter.ts';
import { deleteActionCol } from '../../../../utils/columnBuilders';

interface Params {
    getString: GetStringFn;
    onDeleteClick: (row: ProcessRoleHolder) => void;
    deleteIsPending: boolean;
}

export function useProcessRoleHolderColumns({
    getString,
    onDeleteClick,
    deleteIsPending,
}: Params): GridColDef[] {

    function textCol(
        field: keyof ProcessRoleHolder,
        headerKey: string,
        width: number,
        flex?: number,
    ): GridColDef {
        return {
            field: field as string,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: flex ? undefined : width,
            flex,
            renderCell: (params: GridRenderCellParams<ProcessRoleHolder>) => (
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    {String(params.row[field] ?? '—')}
                </Typography>
            ),
        };
    }

    return [
        textCol('role_name', 'role', 160, 0.7),
        textCol('holder_code', 'employeeCode', 140, 0.6),
        textCol('holder_name', 'reviewer', 200, 1),
        textCol('assigner_name', 'assignedBy', 180, 0.8),
        {
            field: 'created_at',
            headerName: getString('createdAt'),
            width: 160,
            renderCell: (params: GridRenderCellParams<ProcessRoleHolder>) =>
                formatToUkrDate(params.row.created_at),
        },
        deleteActionCol<ProcessRoleHolder>({ getString, onDeleteClick, deleteIsPending }),
    ];
}
