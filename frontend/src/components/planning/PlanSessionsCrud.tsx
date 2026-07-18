// src/components/planning/PlanSessionsCrud.tsx
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    Paper,
    Snackbar,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { DataGrid } from '@mui/x-data-grid';

import { fetchPlanSessions, type PlanSession } from './planningApi';
import { usePlanSessionMutations } from './usePlanSessionMutations';
import { usePlanSessionColumns } from './usePlanSessionColumns';
import { PlanSessionActions } from './PlanSessionActions';
import { PlanSessionForm } from './PlanSessionForm';
import {
    PlanSessionStatusActionDialog,
    type PendingStatusAction,
} from './PlanSessionStatusActionDialog';

import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import { PLAN_SESSION_QK } from '../../utils/queryKeys.ts';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';
import { formatToUkrDate } from '../../utils/dateFormatter.ts';
import { usePlanningViewStore } from '../../store/planningViewStore';
import {PlanSessionResyncDialog} from "./PlanSessionResyncDialog.tsx";
import ConfirmDeleteDialog from '../ui/ConfirmDeleteDialog';

type StatusColor = 'default' | 'warning' | 'success';
function statusChipColor(key: string | undefined): StatusColor {
    if (key === 'open') return 'success';
    if (key === 'pending') return 'warning';
    return 'default'; // closed / unknown
}

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

    // Grid ⇄ cards view mode, persisted per user (localStorage-backed zustand).
    const view = usePlanningViewStore((s) => s.view);
    const setView = usePlanningViewStore((s) => s.setView);

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

    // Shared action handlers — used by the grid's actions column and the cards.
    const actionHandlers = {
        onOpenPlan: onEditPlan,
        onShowReport,
        onOpen: (row: PlanSession) => setPendingStatus({ session: row, action: 'open' }),
        onClose: (row: PlanSession) => setPendingStatus({ session: row, action: 'close' }),
        onRevert: (row: PlanSession) => setPendingStatus({ session: row, action: 'revert' }),
        onResync: (row: PlanSession) => setResyncTarget(row),
        onDeleteClick: setRowToDelete,
        statusIsPending,
        resyncIsPending: resyncMutation.isPending,
        deleteIsPending: deleteMutation.isPending,
    };

    const columns = usePlanSessionColumns({ getString, ...actionHandlers });

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {cfl(getString('planSessions')) || 'Plan Sessions'}
                </Typography>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={view}
                    onChange={(_, v) => v && setView(v)}
                >
                    <ToggleButton value="grid"><ViewListIcon fontSize="small" /></ToggleButton>
                    <ToggleButton value="cards"><ViewModuleIcon fontSize="small" /></ToggleButton>
                </ToggleButtonGroup>
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

            {!isLoading && !error && view === 'grid' && (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', flex: 1, minHeight: 0 }}>
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
                        sx={{ height: '100%', '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                    />
                </Paper>
            )}

            {!isLoading && !error && view === 'cards' && (
                // Card grid: SAME rows as the DataGrid. Shows name, period, description,
                // created-at, and the status actions — WITHOUT the delete and sync buttons.
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2, pb: 2 }}>
                        {rows.map((row) => {
                            const st = row.status;
                            const statusLabel = st ? getString(`planSessionStatus_${st.key}`) || st.name : '—';
                            return (
                                <Card key={row.id} variant="outlined">
                                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Stack direction="row" alignItems="flex-start" spacing={1}>
                                            <Typography fontSize={14} fontWeight={600} sx={{ flex: 1 }}>
                                                {row.name}
                                            </Typography>
                                            <Chip label={statusLabel} size="small" color={statusChipColor(st?.key)} variant="outlined" />
                                        </Stack>
                                        <Typography fontSize={12.5} color="text.secondary" sx={{ mt: 0.75 }}>
                                            {formatToUkrDate(row.start_date)} — {formatToUkrDate(row.end_date)}
                                        </Typography>
                                        {row.description && (
                                            <Typography fontSize={12.5} color="text.secondary" sx={{ mt: 0.5 }}>
                                                {row.description}
                                            </Typography>
                                        )}
                                        <Typography fontSize={11.5} color="text.disabled" sx={{ mt: 0.5 }}>
                                            {cfl(getString('createdAt')) || 'Created'}: {formatToUkrDate(row.created_at)}
                                        </Typography>
                                        <Divider sx={{ my: 1 }} />
                                        <PlanSessionActions
                                            row={row}
                                            getString={getString}
                                            {...actionHandlers}
                                            showSync={false}
                                            showDelete={false}
                                        />
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>
                </Box>
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

            <ConfirmDeleteDialog
                open={!!rowToDelete}
                title={getString('deletePlanSession') || 'Delete Plan Session'}
                message={getString('areYouSureDeletePlanSession', { name: rowToDelete?.name ?? '' }) || `Are you sure you want to delete "${rowToDelete?.name}"? This will remove its config and plan values. This action cannot be undone.`}
                isDeleting={deleteMutation.isPending}
                onConfirm={handleConfirmDelete}
                onClose={() => setRowToDelete(null)}
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
