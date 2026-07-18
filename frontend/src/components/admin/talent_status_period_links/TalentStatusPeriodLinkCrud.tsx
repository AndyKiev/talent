// src/components/admin/talent-status-period-links/TalentStatusPeriodLinkCrud.tsx
import  { useCallback, useState } from 'react';
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

import { fetchTalentStatusPeriodLinks, type TalentStatusPeriodLink } from './talentStatusPeriodLinkApi';
import { useTalentStatusPeriodLinkMutations } from './useTalentStatusPeriodLinkMutations';
import { useTalentStatusPeriodLinkColumns } from './useTalentStatusPeriodLinkColumns';
import { TalentStatusPeriodLinkForm } from './TalentStatusPeriodLinkForm';
import { FieldEditConfirmDialog } from '../../ui/FieldEditConfirmDialog';
import { TalentStatusPeriodLinkDeleteDialog } from './TalentStatusPeriodLinkDeleteDialog';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {TSPL_QK} from "../../../utils/queryKeys.ts";

/** Only the is_active switch is inline-toggleable on this grid. */
interface PendingToggle {
    id: number;
    fieldLabel: string;
    field: 'is_active';
    newValue: boolean;
    oldValue: boolean;
}

export function TalentStatusPeriodLinkCrud() {
    const getString = useString({ str });

    // ── Snackbar ──────────────────────────────────────────────────────────────
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    // ── Add form ──────────────────────────────────────────────────────────────
    const [formOpen, setFormOpen] = useState(false);

    // ── Toggle confirmation ───────────────────────────────────────────────────
    const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null);

    // ── Delete dialog ─────────────────────────────────────────────────────────
    const [rowToDelete, setRowToDelete] = useState<TalentStatusPeriodLink | null>(null);

    // ── Pagination ────────────────────────────────────────────────────────────
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 30 });

    // ── Query ─────────────────────────────────────────────────────────────────
    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: TSPL_QK,
        queryFn: fetchTalentStatusPeriodLinks,
        staleTime: 2 * 60 * 1000,
    });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { createMutation, updateMutation, deleteMutation } =
        useTalentStatusPeriodLinkMutations({
            setSnackbar,
            onCreateSuccess: () => setFormOpen(false),
            onUpdateSuccess: () => setPendingToggle(null),
            onDeleteSuccess: () => setRowToDelete(null),
            onDeleteError: () => setRowToDelete(null),
        });

    const localeText = useDataGridLocale();

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleToggleActive = useCallback(
        (row: TalentStatusPeriodLink) => {
            setPendingToggle({
                id: row.id,
                fieldLabel: getString('isActive') || 'Active',
                field: 'is_active',
                newValue: !row.is_active,
                oldValue: row.is_active,
            });
        },
        [getString],
    );

    const handleConfirmToggle = useCallback(() => {
        if (!pendingToggle) return;
        updateMutation.mutate({
            id: pendingToggle.id,
            data: { is_active: pendingToggle.newValue },
        });
    }, [pendingToggle, updateMutation]);

    const handleCancelToggle = useCallback(() => {
        setPendingToggle(null);
    }, []);

    const handleDeleteClick = useCallback((row: TalentStatusPeriodLink) => {
        setRowToDelete(row);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!rowToDelete) return;
        deleteMutation.mutate(rowToDelete.id);
    }, [rowToDelete, deleteMutation]);

    // ── Columns ───────────────────────────────────────────────────────────────
    const columns = useTalentStatusPeriodLinkColumns({
        getString,
        onToggleActive: handleToggleActive,
        toggleIsPending: updateMutation.isPending,
        onDeleteClick: handleDeleteClick,
        deleteIsPending: deleteMutation.isPending,
    });

    return (
        <Box>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('talentStatusPeriodLinks') || 'Status–Period Links'}
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    {cfl(getString('addLink')) || 'Add Link'}
                </Button>
            </Box>

            {/* Content */}
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
                        pageSizeOptions={[30, 50]}
                        disableRowSelectionOnClick
                        getRowId={(row) => row.id}
                        getRowHeight={() => 'auto'}
                        localeText={localeText}
                        hideFooterSelectedRowCount
                        sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                    />
                </Paper>
            )}

            {/* Dialogs */}
            <TalentStatusPeriodLinkForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                createMutation={createMutation}
            />

            <FieldEditConfirmDialog
                pending={pendingToggle}
                isPending={updateMutation.isPending}
                onConfirm={handleConfirmToggle}
                onCancel={handleCancelToggle}
            />

            <TalentStatusPeriodLinkDeleteDialog
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