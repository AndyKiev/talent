// src/components/planning/usePlanSessionColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip } from '@mui/material';

import type { PlanSession } from './planningApi.ts';
import cfl from '../../utils/helpers.ts';
import type { GetStringFn } from '../../types/getStringFn.ts';
import { formatToUkrDate } from '../../utils/dateFormatter.ts';
import { PlanSessionActions } from './PlanSessionActions.tsx';

type StatusColor = 'default' | 'warning' | 'success';

function statusChipColor(key: string | undefined): StatusColor {
    if (key === 'open') return 'success';
    if (key === 'pending') return 'warning';
    return 'default'; // closed / unknown
}

interface Params {
    getString: GetStringFn;
    onOpenPlan: (row: PlanSession) => void;
    onShowReport: (row: PlanSession) => void;
    onOpen: (row: PlanSession) => void;
    onClose: (row: PlanSession) => void;
    onRevert: (row: PlanSession) => void;
    onResync: (row: PlanSession) => void;
    onDeleteClick: (row: PlanSession) => void;
    statusIsPending: boolean;
    resyncIsPending: boolean;
    deleteIsPending: boolean;
}

export function usePlanSessionColumns({
    getString,
    onOpenPlan,
    onShowReport,
    onOpen,
    onClose,
    onRevert,
    onResync,
    onDeleteClick,
    statusIsPending,
    resyncIsPending,
    deleteIsPending,
}: Params): GridColDef[] {
    return [
        {
            field: 'name',
            headerName: cfl(getString('name')) || 'Name',
            flex: 1,
            minWidth: 160,
        },
        {
            field: 'period',
            headerName: cfl(getString('period')) || 'Period',
            width: 220,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanSession>) =>
                `${formatToUkrDate(params.row.start_date)} — ${formatToUkrDate(params.row.end_date)}`,
        },
        {
            field: 'status',
            headerName: cfl(getString('status')) || 'Status',
            width: 130,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanSession>) => {
                const st = params.row.status;
                const label = st ? getString(`planSessionStatus_${st.key}`) || st.name : '—';
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                        <Chip label={label} size="small" color={statusChipColor(st?.key)} variant="outlined" />
                    </Box>
                );
            },
        },
        {
            field: 'description',
            headerName: cfl(getString('description')) || 'Description',
            flex: 1,
            minWidth: 160,
            sortable: false,
            renderCell: (params: GridRenderCellParams<PlanSession>) => params.row.description ?? '—',
        },
        {
            field: 'created_at',
            headerName: cfl(getString('createdAt')) || 'Created',
            width: 130,
            renderCell: (params: GridRenderCellParams<PlanSession>) =>
                formatToUkrDate(params.row.created_at),
        },
        {
            field: '_actions',
            headerName: cfl(getString('actions')) || '',
            width: 290,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<PlanSession>) => (
                <PlanSessionActions
                    row={params.row}
                    getString={getString}
                    onOpenPlan={onOpenPlan}
                    onShowReport={onShowReport}
                    onOpen={onOpen}
                    onClose={onClose}
                    onRevert={onRevert}
                    onResync={onResync}
                    onDeleteClick={onDeleteClick}
                    statusIsPending={statusIsPending}
                    resyncIsPending={resyncIsPending}
                    deleteIsPending={deleteIsPending}
                />
            ),
        },
    ];
}
