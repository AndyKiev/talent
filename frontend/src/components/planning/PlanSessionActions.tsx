// src/components/planning/PlanSessionActions.tsx
//
// The plan-session action buttons, shared by the grid's actions column and the
// cards view. `showSync`/`showDelete` gate the two buttons the cards omit.
import { Box, IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SyncIcon from '@mui/icons-material/Sync';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AssessmentIcon from '@mui/icons-material/Assessment';

import type { PlanSession } from './planningApi.ts';
import type { GetStringFn } from '../../types/getStringFn.ts';

interface Props {
    row: PlanSession;
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
    /** Show the re-sync button (grid only). Default true. */
    showSync?: boolean;
    /** Show the delete button (grid only). Default true. */
    showDelete?: boolean;
}

export function PlanSessionActions({
    row,
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
    showSync = true,
    showDelete = true,
}: Props) {
    const key = row.status?.key;
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
                        onClick={(e) => { e.stopPropagation(); onOpenPlan(row); }}
                        disabled={!isOpen}
                    >
                        <EditNoteIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>

            {/* Plan vs Fact report — always available */}
            <Tooltip title={getString('showPlanReport') || 'Plan vs fact report'}>
                <span>
                    <IconButton
                        size="small"
                        color="secondary"
                        onClick={(e) => { e.stopPropagation(); onShowReport(row); }}
                    >
                        <AssessmentIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>

            {/* Re-sync — only when open */}
            {showSync && isOpen && (
                <Tooltip title={getString('resyncPlanSession') || 'Re-sync with config'}>
                    <span>
                        <IconButton
                            size="small"
                            color="info"
                            onClick={(e) => { e.stopPropagation(); onResync(row); }}
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
                            onClick={(e) => { e.stopPropagation(); onOpen(row); }}
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
                            onClick={(e) => { e.stopPropagation(); onClose(row); }}
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
                            onClick={(e) => { e.stopPropagation(); onRevert(row); }}
                            disabled={statusIsPending}
                        >
                            <RestartAltIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            )}

            {showDelete && (
                <Tooltip title={getString('delete') || 'Delete'}>
                    <span>
                        <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => { e.stopPropagation(); onDeleteClick(row); }}
                            disabled={deleteIsPending}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            )}
        </Box>
    );
}
