// src/components/planning/PlanSessionsCrud.tsx
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    Snackbar,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid } from '@mui/x-data-grid';

import { fetchPlanSessions, type PlanSession } from './planningApi';
import { usePlanSessionMutations } from './usePlanSessionMutations';
import { usePlanSessionColumns } from './usePlanSessionColumns';
import { PlanSessionForm } from './PlanSessionForm';
import { PlanSessionDeleteDialog } from './PlanSessionDeleteDialog';
import {
    PlanSessionStatusActionDialog,
    type PendingStatusAction,
} from './PlanSessionStatusActionDialog';

import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import { PLAN_SESSION_QK } from '../../utils/queryKeys.ts';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';
import {PlanSessionResyncDialog} from "./PlanSessionResyncDialog.tsx";

interface Props {
    onEditPlan: (session: PlanSession) => void;
    onShowReport: (session: PlanSession) => void;
}

export function PlanSessionsCrud({ onEditPlan, onShowReport }: Props) {
    const getString = useString({ str });

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const [formOpen, setFormOpen] = useState(false);
    const [rowToDelete, setRowToDelete] = useState<PlanSession | null>(null);
    const [pendingStatus, setPendingStatus] = useState<PendingStatusAction | null>(null);
    const [resyncTarget, setResyncTarget] = useState<PlanSession | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: PLAN_SESSION_QK,
        queryFn: fetchPlanSessions,
        staleTime: 60 * 1000,
    });

    const {
        createMutation,
        openMutation,
        closeMutation,
        revertMutation,
        resyncMutation,
        deleteMutation,
    } = usePlanSessionMutations({
        setSnackbar,
        onCreateSuccess: () => setFormOpen(false),
        onStatusSuccess: () => setPendingStatus(null),
        onStatusError: () => setPendingStatus(null),
        onResyncSuccess: () => setResyncTarget(null),
        onResyncError: () => setResyncTarget(null),
        onDeleteSuccess: () => setRowToDelete(null),
        onDeleteError: () => setRowToDelete(null),
    });

    const localeText = useDataGridLocale();

    const handleConfirmStatus = useCallback(() => {
        if (!pendingStatus) return;
        const id = pendingStatus.session.id;
        if (pendingStatus.action === 'open') openMutation.mutate(id);
        else if (pendingStatus.action === 'close') closeMutation.mutate(id);
        else revertMutation.mutate(id);
    }, [pendingStatus, openMutation, closeMutation, revertMutation]);

    const handleConfirmResync = useCallback(
        (addCategoryIds: number[]) => {
            if (!resyncTarget) return;
            resyncMutation.mutate({ id: resyncTarget.id, addCategoryIds });
        },
        [resyncTarget, resyncMutation],
    );

    const handleConfirmDelete = useCallback(() => {
        if (!rowToDelete) return;
        deleteMutation.mutate(rowToDelete.id);
    }, [rowToDelete, deleteMutation]);

    const statusIsPending =
        openMutation.isPending || closeMutation.isPending || revertMutation.isPending;

    const columns = usePlanSessionColumns({
        getString,
        onOpenPlan: onEditPlan,
        onShowReport,
        onOpen: (row) => setPendingStatus({ session: row, action: 'open' }),
        onClose: (row) => setPendingStatus({ session: row, action: 'close' }),
        onRevert: (row) => setPendingStatus({ session: row, action: 'revert' }),
        onResync: (row) => setResyncTarget(row),
        onDeleteClick: setRowToDelete,
        statusIsPending,
        resyncIsPending: resyncMutation.isPending,
        deleteIsPending: deleteMutation.isPending,
    });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {cfl(getString('planSessions')) || 'Plan Sessions'}
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    {cfl(getString('addPlanSession')) || 'Add'}
                </Button>
            </Box>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {!isLoading && error && (
                <Alert severity="error" sx={{ m: 2 }}>
                    {(error as Error).message}
                </Alert>
            )}

            {!isLoading && !error && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[5, 10, 25, 50]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                    />
                </Paper>
            )}

            <PlanSessionForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                createMutation={createMutation}
            />

            <PlanSessionStatusActionDialog
                pending={pendingStatus}
                isPending={statusIsPending}
                onConfirm={handleConfirmStatus}
                onCancel={() => setPendingStatus(null)}
            />

            <PlanSessionResyncDialog
                session={resyncTarget}
                isPending={resyncMutation.isPending}
                onConfirm={handleConfirmResync}
                onCancel={() => setResyncTarget(null)}
            />

            <PlanSessionDeleteDialog
                row={rowToDelete}
                isPending={deleteMutation.isPending}
                onConfirm={handleConfirmDelete}
                onCancel={() => setRowToDelete(null)}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
