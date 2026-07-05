// src/components/training/state/useTrainingStateColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Chip } from '@mui/material';

import type { TrainingStateRow } from './trainingStateApi.ts';
import { trainingStatusLabel, statusColor } from './trainingStatusMeta.ts';
import cfl from '../../../utils/helpers.ts';
import type { GetStringFn } from '../../../types/getStringFn.ts';

export function useTrainingStateColumns({ getString }: { getString: GetStringFn }): GridColDef<TrainingStateRow>[] {
    return [
        {
            field: 'employee_name',
            headerName: cfl(getString('employee')) || 'Employee',
            flex: 1,
            minWidth: 200,
        },
        {
            field: 'employee_code',
            headerName: cfl(getString('code')) || 'Code',
            width: 120,
        },
        {
            field: 'main_department_name',
            headerName: cfl(getString('mainDepartment')) || 'Main department',
            flex: 1,
            minWidth: 180,
            valueGetter: (_v, row) => row.main_department_name || '—',
        },
        {
            // The actual main department (leaf where the employee works).
            field: 'direct_department_name',
            headerName: cfl(getString('department')) || 'Department',
            flex: 1,
            minWidth: 180,
            valueGetter: (_v, row) => row.direct_department_name || '—',
        },
        {
            field: 'job_name',
            headerName: cfl(getString('job')) || 'Job',
            flex: 1,
            minWidth: 160,
            valueGetter: (_v, row) => row.job_name || '—',
        },
        {
            field: 'status_key',
            headerName: cfl(getString('status')) || 'Status',
            width: 160,
            renderCell: (params: GridRenderCellParams<TrainingStateRow>) => (
                <Chip
                    size="small"
                    label={trainingStatusLabel(getString, params.row.status_key)}
                    sx={{
                        bgcolor: statusColor(params.row.status_key),
                        color: '#fff',
                        fontWeight: 500,
                    }}
                />
            ),
        },
    ];
}
