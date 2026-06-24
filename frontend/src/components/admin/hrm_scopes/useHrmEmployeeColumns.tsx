// src/components/admin/hrm_scopes/useHrmEmployeeColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip } from '@mui/material';

import type { HrmEmployeeRow } from './hrmScopeApi';
import type { GetStringFn } from '../../../types/getStringFn';
import cfl from '../../../utils/helpers.ts';

interface Params {
    getString: GetStringFn;
}

export function useHrmEmployeeColumns({ getString }: Params): GridColDef<HrmEmployeeRow>[] {
    return [
        { field: 'code', headerName: cfl(getString('employeeCode')) || 'Code', width: 100 },
        { field: 'name', headerName: cfl(getString('employeeName')) || 'Name', flex: 1, minWidth: 160 },
        {
            field: 'job_name',
            headerName: cfl(getString('job')) || 'Job',
            width: 150,
            renderCell: (p: GridRenderCellParams<HrmEmployeeRow>) => p.row.job_name || '—',
        },
        {
            field: 'active_scope_count',
            headerName: cfl(getString('activeScopes')) || 'Active',
            width: 130,
            renderCell: (p: GridRenderCellParams<HrmEmployeeRow>) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                        size="small"
                        label={`${p.row.active_scope_count} / ${p.row.scope_count}`}
                        color={p.row.active_scope_count > 0 ? 'success' : 'default'}
                        variant={p.row.active_scope_count > 0 ? 'filled' : 'outlined'}
                    />
                </Box>
            ),
        },
    ];
}
