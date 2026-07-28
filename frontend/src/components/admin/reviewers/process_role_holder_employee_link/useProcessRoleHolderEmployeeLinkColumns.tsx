// src/components/admin/reviewers/process_role_holder_employee_link/useProcessRoleHolderEmployeeLinkColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Typography } from '@mui/material';

import type { ProcessRoleHolderEmployeeLink } from './processRoleHolderEmployeeLinkApi.ts';
import cfl from '../../../../utils/capitalizeFirstLetter.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import { formatToUkrDate } from '../../../../utils/dateFormatter.ts';
import { deleteActionCol } from '../../../../utils/columnBuilders';

interface Params {
    getString: GetStringFn;
    onDeleteClick: (row: ProcessRoleHolderEmployeeLink) => void;
    deleteIsPending: boolean;
}

export function useProcessRoleHolderEmployeeLinkColumns({
    getString,
    onDeleteClick,
    deleteIsPending,
}: Params): GridColDef[] {

    function textCol(
        field: keyof ProcessRoleHolderEmployeeLink,
        headerKey: string,
        width: number,
        flex?: number,
    ): GridColDef {
        return {
            field: field as string,
            headerName: cfl(getString(headerKey)) || headerKey,
            width: flex ? undefined : width,
            flex,
            renderCell: (params: GridRenderCellParams<ProcessRoleHolderEmployeeLink>) => (
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    {String(params.row[field] ?? '—')}
                </Typography>
            ),
        };
    }

    return [
        textCol('employee_code', 'employeeCode', 140, 0.6),
        textCol('employee_name', 'employee', 220, 1),
        {
            field: 'created_at',
            headerName: getString('createdAt'),
            width: 160,
            renderCell: (params: GridRenderCellParams<ProcessRoleHolderEmployeeLink>) =>
                formatToUkrDate(params.row.created_at),
        },
        deleteActionCol<ProcessRoleHolderEmployeeLink>({ getString, onDeleteClick, deleteIsPending }),
    ];
}
