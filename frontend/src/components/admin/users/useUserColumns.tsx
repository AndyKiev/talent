// src/components/admin/users/useUserColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import type { EmployeeWithGroups, GroupOfType } from './employeeUserGroupApi';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';

export interface TypeColumn {
    typeId: number;
    typeName: string;
}

interface Params {
    getString: GetStringFn;
    // Distinct user_group_types discovered across all rows → one column each
    typeColumns: TypeColumn[];
    onManageClick: (row: EmployeeWithGroups, typeId: number, typeName: string) => void;
}

export function useUserColumns({
    getString,
    typeColumns,
    onManageClick,
}: Params): GridColDef<EmployeeWithGroups>[] {
    const base: GridColDef<EmployeeWithGroups>[] = [
        {
            field: 'code',
            headerName: cfl(getString('employeeCode')) || 'Code',
            width: 110,
        },
        {
            field: 'name',
            headerName: cfl(getString('employeeName')) || 'Name',
            flex: 1,
            minWidth: 160,
        },
        {
            field: 'job_name',
            headerName: cfl(getString('job')) || 'Job',
            width: 160,
            renderCell: (p: GridRenderCellParams<EmployeeWithGroups>) =>
                p.row.job_name || '—',
        },
        {
            field: 'email',
            headerName: cfl(getString('email')) || 'Email',
            width: 220,
            renderCell: (p: GridRenderCellParams<EmployeeWithGroups>) =>
                p.row.email ? (
                    p.row.email
                ) : (
                    <Tooltip title={getString('emailRequiredForGroups') || 'Email required to assign groups'}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'warning.main' }}>
                            <WarningAmberIcon fontSize="small" />
                            {getString('noEmail') || 'no email'}
                        </Box>
                    </Tooltip>
                ),
        },
    ];

    // One column per user_group_type, showing that type's groups + a manage button.
    const typeCols: GridColDef<EmployeeWithGroups>[] = typeColumns.map(({ typeId, typeName }) => ({
        field: `type_${typeId}`,
        headerName: cfl(typeName),
        flex: 1,
        minWidth: 200,
        sortable: false,
        filterable: false,
        renderCell: (p: GridRenderCellParams<EmployeeWithGroups>) => {
            const groups = p.row.groups.filter((g: GroupOfType) => g.user_group_type_id === typeId);
            const hasEmail = !!p.row.email;
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
                    {groups.map((g) => (
                        <Chip key={g.link_id} label={g.group_name} size="small" />
                    ))}
                    <Tooltip
                        title={
                            hasEmail
                                ? getString('manageGroups') || 'Manage groups'
                                : getString('emailRequiredForGroups') || 'Email required to assign groups'
                        }
                    >
                        <span>
                            <IconButton
                                size="small"
                                disabled={!hasEmail}
                                onClick={() => onManageClick(p.row, typeId, typeName)}
                            >
                                <GroupAddIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            );
        },
    }));

    return [...base, ...typeCols];
}
