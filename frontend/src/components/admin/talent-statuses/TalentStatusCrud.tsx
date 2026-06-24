// src/components/admin/talent-statuses/TalentStatusCrud.tsx
import React, { useCallback, useState } from 'react';
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
import { fetchTalentStatuses, type TalentStatus } from './talentStatusApi';
import { useTalentStatusMutations } from './useTalentStatusMutations';
import { useTalentStatusColumns, type EditingState } from './useTalentStatusColumns';
import { TalentStatusForm } from './TalentStatusForm';
import { TalentStatusEditDialog, type PendingEdit } from './TalentStatusEditDialog';
import { TalentStatusDeleteDialog } from './TalentStatusDeleteDialog';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {TALENT_STATUS_QK} from "../../../utils/queryKeys.ts";

export function TalentStatusCrud() {
  const getString = useString({ str });

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // ── Add form ──────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);

  // ── Inline field editing state ────────────────────────────────────────────
  const [editingState, setEditingState] = useState<EditingState>({ userId: null, field: null });

  // Pending = user clicked ✓ in cell, waiting for dialog confirmation
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);

  // ── Delete dialog ─────────────────────────────────────────────────────────
  const [rowToDelete, setRowToDelete] = useState<TalentStatus | null>(null);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: TALENT_STATUS_QK,
    queryFn: fetchTalentStatuses,
    staleTime: 2 * 60 * 1000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { createMutation, updateMutation, deleteMutation } = useTalentStatusMutations({
    setSnackbar,
    onCreateSuccess: () => setFormOpen(false),
    onUpdateSuccess: () => {
      setEditingState({ userId: null, field: null });
      setPendingEdit(null);
    },
    onDeleteSuccess: () => setRowToDelete(null),
    onDeleteError: () => setRowToDelete(null),
  });

  const localeText = useDataGridLocale();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEditFieldClick = useCallback(
      (row: TalentStatus, field: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingState({ userId: row.id, field });
      },
      [],
  );

  /**
   * Called when user clicks ✓ in TextEditCell.
   * Does NOT save immediately — opens the confirmation dialog.
   */
  const handleRequestSave = useCallback(
      (row: TalentStatus, field: string, newValue: string) => {
        const fieldLabelMap: Record<string, string> = {
          key: getString('key') || 'Key',
          name: getString('name') || 'Name',
          description: getString('description') || 'Description',
        };
        setPendingEdit({
          id: row.id,
          fieldLabel: fieldLabelMap[field] ?? field,
          field,
          newValue,
          // Double-cast: TalentStatus has no index signature, go through unknown first
          oldValue: String((row as unknown as Record<string, unknown>)[field] ?? ''),
        });
      },
      [getString],
  );

  const handleConfirmEdit = useCallback(() => {
    if (!pendingEdit) return;
    updateMutation.mutate({
      id: pendingEdit.id,
      data: { [pendingEdit.field]: pendingEdit.newValue },
    });
  }, [pendingEdit, updateMutation]);

  const handleCancelEdit = useCallback(() => {
    setEditingState({ userId: null, field: null });
  }, []);

  const handleCancelPending = useCallback(() => {
    setPendingEdit(null);
    setEditingState({ userId: null, field: null });
  }, []);

  /** is_active toggle also goes through the confirmation dialog */
  const handleToggleActive = useCallback(
      (row: TalentStatus) => {
        setPendingEdit({
          id: row.id,
          fieldLabel: getString('isActive') || 'Active',
          field: 'is_active',
          newValue: !row.is_active,
          oldValue: row.is_active,
        });
      },
      [getString],
  );

  const handleDeleteClick = useCallback((row: TalentStatus) => {
    setRowToDelete(row);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!rowToDelete) return;
    deleteMutation.mutate(rowToDelete.id);
  }, [rowToDelete, deleteMutation]);

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useTalentStatusColumns({
    getString,
    editingState,
    onEditFieldClick: handleEditFieldClick,
    onRequestSave: handleRequestSave,
    onCancelEdit: handleCancelEdit,
    updateIsPending: updateMutation.isPending,
    onToggleActive: handleToggleActive,
    toggleIsPending: updateMutation.isPending,
    onDeleteClick: handleDeleteClick,
    deleteIsPending: deleteMutation.isPending,
  });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('talentStatuses') || 'Talent Statuses'}
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    {cfl(getString('addTalentStatus')) || 'Add'}
                </Button>
            </Box>

            {/* Content area - shows loading, error, or grid */}
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

            {/* Dialogs and snackbar remain the same */}
            <TalentStatusForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                createMutation={createMutation}
            />

            <TalentStatusEditDialog
                pending={pendingEdit}
                isPending={updateMutation.isPending}
                onConfirm={handleConfirmEdit}
                onCancel={handleCancelPending}
            />

            <TalentStatusDeleteDialog
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
