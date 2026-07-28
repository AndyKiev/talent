// src/components/admin/job_groups/JobGroupCrud.tsx
import React, { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    Paper,
    Snackbar,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid } from '@mui/x-data-grid';

import { fetchJobGroups, type JobGroup } from './jobGroupApi';
import { useJobGroupMutations } from './useJobGroupMutations';
import { useJobGroupColumns, type EditingState } from './useJobGroupColumns';
import { JobGroupForm } from './JobGroupForm';
import { FieldEditConfirmDialog, type PendingEdit } from '../../ui/FieldEditConfirmDialog';
import { JobGroupTypeSelectDialog } from './JobGroupTypeSelectDialog';
import { fetchJobGroupTypes } from '../job_group_types/jobGroupTypeApi';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {JOB_GROUP_QK, JOB_GROUP_TYPE_QK} from "../../../utils/queryKeys.ts";
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';
import { AsyncContent } from '../../ui/AsyncContent';

export function JobGroupCrud() {
  const getString = useString({ str });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingState, setEditingState] = useState<EditingState>({ rowId: null, field: null });
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [rowToDelete, setRowToDelete] = useState<JobGroup | null>(null);
  const [typeSelectGroup, setTypeSelectGroup] = useState<JobGroup | null>(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: JOB_GROUP_QK,
    queryFn: fetchJobGroups,
    staleTime: 2 * 60 * 1000,
  });

  const { data: groupTypes = [] } = useQuery({
    queryKey: JOB_GROUP_TYPE_QK,
    queryFn: fetchJobGroupTypes,
    staleTime: 5 * 60 * 1000,
  });

  const { createMutation, updateMutation, deleteMutation } = useJobGroupMutations({
    setSnackbar,
    deleteSuccessMessage: getString('jobGroupDeleteSuccess') || 'Job group deleted successfully',
    onCreateSuccess: () => setFormOpen(false),
    onUpdateSuccess: () => {
      setEditingState({ rowId: null, field: null });
      setPendingEdit(null);
      setTypeSelectGroup(null);
    },
    onDeleteSuccess: () => setRowToDelete(null),
    onDeleteError: () => setRowToDelete(null),
  });

  const localeText = useDataGridLocale();

  const handleEditFieldClick = useCallback(
      (row: JobGroup, field: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingState({ rowId: row.id, field });
      },
      [],
  );

  const handleRequestSave = useCallback(
      (row: JobGroup, field: string, newValue: string) => {
        // Enforce minimum length for name and key before firing the mutation
        const minLengths: Record<string, number> = { name: 2, key: 1 };
        const min = minLengths[field];
        if (min !== undefined && newValue.trim().length < min) {
          setSnackbar({
            open: true,
            message: getString('nameTooShort') || `${field} must be at least ${min} characters`,
            severity: 'error',
          });
          setEditingState({ rowId: null, field: null });
          return;
        }
        const fieldLabelMap: Record<string, string> = {
          name: getString('name') || 'Name',
          key: getString('key') || 'Key',
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
      [getString, setSnackbar],
  );

  const handleConfirmEdit = useCallback(() => {
    if (!pendingEdit) return;
    updateMutation.mutate({ id: pendingEdit.id, data: { [pendingEdit.field]: pendingEdit.newValue } });
  }, [pendingEdit, updateMutation]);

  const handleCancelEdit = useCallback(() => setEditingState({ rowId: null, field: null }), []);

  const handleCancelPending = useCallback(() => {
    setPendingEdit(null);
    setEditingState({ rowId: null, field: null });
  }, []);

  const handleEditTypeClick = useCallback((row: JobGroup) => setTypeSelectGroup(row), []);

  const handleConfirmTypeChange = useCallback(
      (groupId: number, newTypeId: number) => {
        updateMutation.mutate({ id: groupId, data: { job_group_type_id: newTypeId } });
      },
      [updateMutation],
  );

  const handleDeleteClick = useCallback((row: JobGroup) => setRowToDelete(row), []);

  const handleConfirmDelete = useCallback(() => {
    if (!rowToDelete) return;
    deleteMutation.mutate(rowToDelete.id);
  }, [rowToDelete, deleteMutation]);

  const columns = useJobGroupColumns({
    getString,
    groupTypes,
    editingState,
    onEditFieldClick: handleEditFieldClick,
    onRequestSave: handleRequestSave,
    onCancelEdit: handleCancelEdit,
    updateIsPending: updateMutation.isPending,
    onEditTypeClick: handleEditTypeClick,
    onDeleteClick: handleDeleteClick,
    deleteIsPending: deleteMutation.isPending,
  });

  return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
            {getString('jobGroups') || 'Job Groups'}
          </Typography>
          <Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
            {cfl(getString('addJobGroup')) || 'Add Group'}
          </Button>
        </Box>

        <AsyncContent isLoading={isLoading} error={error}>
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
        </AsyncContent>

        <JobGroupForm open={formOpen} onClose={() => setFormOpen(false)} createMutation={createMutation} />

        <FieldEditConfirmDialog
            pending={pendingEdit}
            isPending={updateMutation.isPending}
            onConfirm={handleConfirmEdit}
            onCancel={handleCancelPending}
        />

        <ConfirmDeleteDialog
                open={!!rowToDelete}
                title={getString('deleteJobGroup') || 'Delete Job Group'}
                message={getString('areYouSureDeleteJobGroup') || `Are you sure you want to delete "${rowToDelete?.name}"? This action cannot be undone.`}
                isDeleting={deleteMutation.isPending}
                onConfirm={handleConfirmDelete}
                onClose={() => setRowToDelete(null)}
            />

        <JobGroupTypeSelectDialog
            group={typeSelectGroup}
            isPending={updateMutation.isPending}
            onConfirm={handleConfirmTypeChange}
            onCancel={() => setTypeSelectGroup(null)}
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
