// src/components/planning/usePlanReportColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip } from '@mui/material';

import type { PlanReportRow } from './planningApi.ts';
import cfl from '../../utils/helpers.ts';
import type { GetStringFn } from '../../types/getStringFn.ts';

interface Params {
    getString: GetStringFn;
}

export function usePlanReportColumns({ getString }: Params): GridColDef[] {
    return [
        {
            field: 'department',
            headerName: cfl(getString('department')) || 'Department',
            flex: 1,
            minWidth: 180,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanReportRow>) =>
                params.row.department?.name ?? `#${params.row.department_id}`,
        },
        {
            field: 'job_group',
            headerName: cfl(getString('jobGroup')) || 'Job group',
            flex: 1,
            minWidth: 160,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanReportRow>) =>
                params.row.job_group?.name ?? `#${params.row.job_group_id}`,
        },
        {
            field: 'talent_status',
            headerName: cfl(getString('talentStatus')) || 'Talent status',
            width: 150,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanReportRow>) => {
                const ts = params.row.talent_status;
                if (!ts) {
                    return (
                        <Chip
                            label={getString('allTalentStatuses') || 'All (combined)'}
                            size="small"
                            variant="outlined"
                        />
                    );
                }
                return <Chip label={ts.key} size="small" color="info" variant="outlined" />;
            },
        },
        {
            field: 'plan',
            headerName: cfl(getString('planValue')) || 'Plan',
            width: 100,
            sortable: false,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params: GridRenderCellParams<PlanReportRow>) => params.row.plan,
        },
        {
            field: 'fact',
            headerName: cfl(getString('factValue')) || 'Fact',
            width: 100,
            sortable: false,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params: GridRenderCellParams<PlanReportRow>) => params.row.fact,
        },
        {
            field: '_diff',
            headerName: cfl(getString('planFactDiff')) || 'Diff',
            width: 110,
            sortable: false,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params: GridRenderCellParams<PlanReportRow>) => {
                const diff = params.row.fact - params.row.plan;
                const color =
                    diff > 0 ? 'success' : diff < 0 ? 'error' : 'default';
                const label = diff > 0 ? `+${diff}` : String(diff);
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: '100%' }}>
                        <Chip label={label} size="small" color={color} variant="outlined" />
                    </Box>
                );
            },
        },
    ];
}
