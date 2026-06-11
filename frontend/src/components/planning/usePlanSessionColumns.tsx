// src/components/planning/usePlanSessionColumns.tsx
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SyncIcon from '@mui/icons-material/Sync';
import EditNoteIcon from '@mui/icons-material/EditNote';

import type { PlanSession } from './planningApi.ts';
import cfl from '../../utils/helpers.ts';
import type { GetStringFn } from '../../types/getStringFn.ts';
import { formatToUkrDate } from '../../utils/dateFormatter.ts';

type StatusColor = 'default' | 'warning' | 'success';

function statusChipColor(key: string | undefined): StatusColor {
    if (key === 'open') return 'success';
    if (key === 'pending') return 'warning';
    return 'default'; // closed / unknown
}

interface Params {
    getString: GetStringFn;
    onOpenPlan: (row: PlanSession) => void;
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
            width: 250,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams<PlanSession>) => {
                const key = params.row.status?.key;
                const isPending = key === 'pending';
                const isOpen = key === 'open';
                const isClosed = key === 'closed';
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 0.25 }}>
                        {/* Edit plan values — only when open */}
                        <Tooltip title={getString('editPlan') || 'Edit plan'}>
                            <span>
                                <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={(e) => { e.stopPropagation(); onOpenPlan(params.row); }}
                                    disabled={!isOpen}
                                >
                                    <EditNoteIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        {/* Re-sync — only when open */}
                        {isOpen && (
                            <Tooltip title={getString('resyncPlanSession') || 'Re-sync with config'}>
                                <span>
                                    <IconButton
                                        size="small"
                                        color="info"
                                        onClick={(e) => { e.stopPropagation(); onResync(params.row); }}
                                        disabled={resyncIsPending}
                                    >
                                        <SyncIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}

                        {/* Open — only when pending */}
                        {isPending && (
                            <Tooltip title={getString('openPlanSession') || 'Open'}>
                                <span>
                                    <IconButton
                                        size="small"
                                        color="success"
                                        onClick={(e) => { e.stopPropagation(); onOpen(params.row); }}
                                        disabled={statusIsPending}
                                    >
                                        <LockOpenIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}

                        {/* Close — only when open */}
                        {isOpen && (
                            <Tooltip title={getString('closePlanSession') || 'Close'}>
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => { e.stopPropagation(); onClose(params.row); }}
                                        disabled={statusIsPending}
                                    >
                                        <LockIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}

                        {/* Revert — only when closed */}
                        {isClosed && (
                            <Tooltip title={getString('revertPlanSession') || 'Revert to open'}>
                                <span>
                                    <IconButton
                                        size="small"
                                        color="warning"
                                        onClick={(e) => { e.stopPropagation(); onRevert(params.row); }}
                                        disabled={statusIsPending}
                                    >
                                        <RestartAltIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}

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
                );
            },
        },
    ];
}
