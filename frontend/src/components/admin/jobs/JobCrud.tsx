// src/components/admin/jobs/JobCrud.tsx
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

import { fetchJobs, type Job } from './jobApi';
import { JOB_QK, useJobMutations } from './useJobMutations';
import { useJobColumns, type EditingState } from './useJobColumns';
import { JobForm } from './JobForm';
import { JobEditDialog, type PendingEdit } from './JobEditDialog';
import { JobDeleteDialog } from './JobDeleteDialog';
import { JobGroupsDialog } from './JobGroupsDialog';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/capitalizeFirstLetter';

// Hardcoded flag to control edit confirmations
// Set to false to disable confirmation dialogs for job edits
const REQUIRE_EDIT_CONFIRMATION = false;

export function JobCrud() {
  const getString = useString({ str });

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // ── Add form ──────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);

  // ── Inline field editing ──────────────────────────────────────────────────
  const [editingState, setEditingState] = useState<EditingState>({ rowId: null, field: null });
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);

  // ── Delete dialog ─────────────────────────────────────────────────────────
  const [rowToDelete, setRowToDelete] = useState<Job | null>(null);

  // ── Groups dialog ─────────────────────────────────────────────────────────
  const [groupsJob, setGroupsJob] = useState<Job | null>(null);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: JOB_QK,
    queryFn: fetchJobs,
    staleTime: 2 * 60 * 1000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { createMutation, updateMutation, deleteMutation, setGroupsMutation } = useJobMutations({
    setSnackbar,
    onCreateSuccess: () => setFormOpen(false),
    onUpdateSuccess: () => {
      setEditingState({ rowId: null, field: null });
      setPendingEdit(null);
    },
    onDeleteSuccess: () => setRowToDelete(null),
    onDeleteError: () => setRowToDelete(null),
    onSetGroupsSuccess: () => setGroupsJob(null),
  });

  const localeText = useDataGridLocale();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEditFieldClick = useCallback(
      (row: Job, field: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingState({ rowId: row.id, field });
      },
      [],
  );

  const handleRequestSave = useCallback(
      (row: Job, field: string, newValue: string) => {
        // If confirmations are disabled, save directly without dialog
        if (!REQUIRE_EDIT_CONFIRMATION) {
          updateMutation.mutate({
            id: row.id,
            data: { [field]: newValue },
          });
          return;
        }

        // Otherwise show confirmation dialog
        const fieldLabelMap: Record<string, string> = {
          name: getString('name') || 'Name',
          description: getString('description') || 'Description',
        };
        setPendingEdit({
          id: row.id,
          fieldLabel: fieldLabelMap[field] ?? field,
          field,
          newValue,
          oldValue: String((row as unknown as Record<string, unknown>)[field] ?? ''),
        });
      },
      [getString, updateMutation],
  );

  const handleConfirmEdit = useCallback(() => {
    if (!pendingEdit) return;
    updateMutation.mutate({
      id: pendingEdit.id,
      data: { [pendingEdit.field]: pendingEdit.newValue },
    });
  }, [pendingEdit, updateMutation]);

  const handleCancelEdit = useCallback(() => {
    setEditingState({ rowId: null, field: null });
  }, []);

  const handleCancelPending = useCallback(() => {
    setPendingEdit(null);
    setEditingState({ rowId: null, field: null });
  }, []);

  const handleToggleActive = useCallback(
      (row: Job) => {
        // If confirmations are disabled, save directly without dialog
        if (!REQUIRE_EDIT_CONFIRMATION) {
          updateMutation.mutate({
            id: row.id,
            data: { is_active: !row.is_active },
          });
          return;
        }

        // Otherwise show confirmation dialog
        setPendingEdit({
          id: row.id,
          fieldLabel: getString('isActive') || 'Active',
          field: 'is_active',
          newValue: !row.is_active,
          oldValue: row.is_active,
        });
      },
      [getString, updateMutation],
  );

  const handleGroupsClick = useCallback((row: Job) => {
    setGroupsJob(row);
  }, []);

  const handleDeleteClick = useCallback((row: Job) => {
    setRowToDelete(row);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!rowToDelete) return;
    deleteMutation.mutate(rowToDelete.id);
  }, [rowToDelete, deleteMutation]);

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useJobColumns({
    getString,
    editingState,
    onEditFieldClick: handleEditFieldClick,
    onRequestSave: handleRequestSave,
    onCancelEdit: handleCancelEdit,
    updateIsPending: updateMutation.isPending,
    onToggleActive: handleToggleActive,
    toggleIsPending: updateMutation.isPending,
    onGroupsClick: handleGroupsClick,
    onDeleteClick: handleDeleteClick,
    deleteIsPending: deleteMutation.isPending,
  });

  return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
            {getString('jobs') || 'Jobs'}
          </Typography>
          <Button
              variant="contained"
              size="medium"
              startIcon={<AddIcon />}
              onClick={() => setFormOpen(true)}
          >
            {cfl(getString('addJob')) || 'Add Job'}
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

        <JobForm
            open={formOpen}
            onClose={() => setFormOpen(false)}
            createMutation={createMutation}
        />

        <JobEditDialog
            pending={pendingEdit}
            isPending={updateMutation.isPending}
            onConfirm={handleConfirmEdit}
            onCancel={handleCancelPending}
        />

        <JobDeleteDialog
            row={rowToDelete}
            isPending={deleteMutation.isPending}
            onConfirm={handleConfirmDelete}
            onCancel={() => setRowToDelete(null)}
        />

        <JobGroupsDialog
            job={groupsJob}
            isPending={setGroupsMutation.isPending}
            setGroupsMutation={setGroupsMutation}
            onClose={() => setGroupsJob(null)}
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