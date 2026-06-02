// src/components/admin/planning_setup/plan_scope_default/usePlanScopeDefaultColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import type { PlanScopeDefault } from '../planningSetupApi.ts';
import cfl from '../../../../utils/helpers.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import { formatToUkrDate } from '../../../../utils/dateFormatter.ts';

interface Params {
    getString: GetStringFn;
    onDeleteClick: (row: PlanScopeDefault) => void;
    deleteIsPending: boolean;
}

export function usePlanScopeDefaultColumns({
    getString,
    onDeleteClick,
    deleteIsPending,
}: Params): GridColDef[] {
    return [
        {
            field: 'job_group',
            headerName: cfl(getString('jobGroup')) || 'Job group',
            flex: 1,
            minWidth: 180,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanScopeDefault>) =>
                params.row.job_group?.name ?? `#${params.row.job_group_id}`,
        },
        {
            field: 'talent_status',
            headerName: cfl(getString('talentStatus')) || 'Talent status',
            width: 200,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanScopeDefault>) => {
                const ts = params.row.talent_status;
                if (!ts) {
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                            <Chip
                                label={getString('combinedOption') || 'Combined (all)'}
                                size="small"
                                variant="outlined"
                            />
                        </Box>
                    );
                }
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Chip label={`${ts.key} — ${ts.name}`} size="small" color="info" variant="outlined" />
                    </Box>
                );
            },
        },
        {
            field: 'created_at',
            headerName: cfl(getString('createdAt')) || 'Created',
            width: 150,
            renderCell: (params: GridRenderCellParams<PlanScopeDefault>) =>
                formatToUkrDate(params.row.created_at),
        },
        {
            field: '_actions',
            headerName: '',
            width: 56,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<PlanScopeDefault>) => (
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
