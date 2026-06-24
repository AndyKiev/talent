// src/components/admin/jobs/JobCrud.tsx
import React, {useCallback, useMemo, useRef, useState} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid } from '@mui/x-data-grid';

import { fetchJobs, type Job } from './jobApi';
import { useJobMutations } from './useJobMutations';
import { useJobColumns, type EditingState } from './useJobColumns';
import { JobForm } from './JobForm';
import { JobEditDialog, type PendingEdit } from './JobEditDialog';
import { JobDeleteDialog } from './JobDeleteDialog';
import { JobGroupsDialog } from './JobGroupsDialog';
import { JobJobGroupsDialog } from './JobJobGroupsDialog';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { JobBulkUploadDialog } from './JobBulkUploadDialog';
import type { JobBulkUploadResult } from './jobApi';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {JOB_QK, DEPARTMENT_TYPE_QK} from "../../../utils/queryKeys.ts";
import { fetchDepartmentTypes } from '../department_types/departmentTypeApi';

const REQUIRE_EDIT_CONFIRMATION = false;

export function JobCrud() {
  const getString = useString({ str });

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [bulkUploadResult, setBulkUploadResult] = useState<JobBulkUploadResult | null>(null);

  // ── Filters (job name + job group + department type) ─────────────────────
  const [filter, setFilter] = useState('');
  const [jobGroupFilter, setJobGroupFilter] = useState<string | null>(null);
  const [deptTypeFilter, setDeptTypeFilter] = useState<string | null>(null);

  // ── Add form ──────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);

  // ── Inline field editing ──────────────────────────────────────────────────
  const [editingState, setEditingState] = useState<EditingState>({ rowId: null, field: null });
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);

  // ── Delete dialog ─────────────────────────────────────────────────────────
  const [rowToDelete, setRowToDelete] = useState<Job | null>(null);

  // ── User-groups dialog (existing) ─────────────────────────────────────────
  const [groupsJob, setGroupsJob] = useState<Job | null>(null);

  // ── Job-groups dialog (new) ───────────────────────────────────────────────
  const [jobGroupsJob, setJobGroupsJob] = useState<Job | null>(null);

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: JOB_QK,
    queryFn: () => fetchJobs(),
    staleTime: 2 * 60 * 1000,
  });

  // ── Department types (autocomplete options) ─────────────────────────────
  const { data: deptTypes = [] } = useQuery({
    queryKey: DEPARTMENT_TYPE_QK,
    queryFn: () => fetchDepartmentTypes(),
    staleTime: 2 * 60 * 1000,
  });

  const deptTypeOptions = useMemo(
      () => Array.from(new Set(deptTypes.map((t) => t.name))).sort((a, b) => a.localeCompare(b)),
      [deptTypes],
  );

  // ── Job group options — derived from loaded rows, no extra query needed ───
  const jobGroupOptions = useMemo(
      () =>
          Array.from(new Set(rows.flatMap((r) => r.job_group_names ?? [])))
              .sort((a, b) => a.localeCompare(b)),
      [rows],
  );

  // ── Filter rows: job name AND job group AND department type ───────────────
  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return rows.filter((r) => {
      const nameOk = !q || r.name.toLowerCase().includes(q);
      const jobGroupOk =
          !jobGroupFilter || (r.job_group_names ?? []).includes(jobGroupFilter);
      const deptOk =
          !deptTypeFilter ||
          (r.department_type_links ?? []).some((l) => l.name === deptTypeFilter);
      return nameOk && jobGroupOk && deptOk;
    });
  }, [rows, filter, jobGroupFilter, deptTypeFilter]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const {
    createMutation,
    updateMutation,
    deleteMutation,
    setGroupsMutation,
    setJobJobGroupsMutation,
    bulkUploadMutation,
  } = useJobMutations({
    setSnackbar,
    onCreateSuccess: () => setFormOpen(false),
    onUpdateSuccess: () => {
      setEditingState({ rowId: null, field: null });
      setPendingEdit(null);
    },
    onDeleteSuccess: () => setRowToDelete(null),
    onDeleteError: () => setRowToDelete(null),
    onSetGroupsSuccess: () => setGroupsJob(null),
    onSetJobGroupsSuccess: () => setJobGroupsJob(null),
    onBulkUploadSuccess: (result) => setBulkUploadResult(result),
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

  const handleFileSelected = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        bulkUploadMutation.mutate(file);
        e.target.value = '';
      },
      [bulkUploadMutation],
  );

  const handleRequestSave = useCallback(
      (row: Job, field: string, newValue: string) => {
        if (!REQUIRE_EDIT_CONFIRMATION) {
          updateMutation.mutate({ id: row.id, data: { [field]: newValue } });
          return;
        }
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
    updateMutation.mutate({ id: pendingEdit.id, data: { [pendingEdit.field]: pendingEdit.newValue } });
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
        if (!REQUIRE_EDIT_CONFIRMATION) {
          updateMutation.mutate({ id: row.id, data: { is_active: !row.is_active } });
          return;
        }
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

  const handleGroupsClick = useCallback((row: Job) => setGroupsJob(row), []);
  const handleJobGroupsClick = useCallback((row: Job) => setJobGroupsJob(row), []);
  const handleDeleteClick = useCallback((row: Job) => setRowToDelete(row), []);

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
    onJobGroupsClick: handleJobGroupsClick,
    onDeleteClick: handleDeleteClick,
    deleteIsPending: deleteMutation.isPending,
  });

  return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
            {getString('jobs') || 'Jobs'}
          </Typography>
          <>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                style={{ display: 'none' }}
                onChange={handleFileSelected}
            />

            <Button
                variant="outlined"
                size="medium"
                startIcon={
                  bulkUploadMutation.isPending
                      ? <CircularProgress size={16} color="inherit" />
                      : <UploadFileIcon />
                }
                disabled={bulkUploadMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
            >
              {getString('bulkUpload') || 'Bulk Upload'}
            </Button>
          </>
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
            <Alert severity="error" sx={{ m: 2 }}>{(error as Error).message}</Alert>
        )}

        {!isLoading && !error && (
            <>
              {/* ── Three-filter bar ─────────────────────────────────────────── */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
                <TextField
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={getString('filterByJobName') || 'Filter by job name…'}
                    size="small"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          </InputAdornment>
                      ),
                    }}
                />
                <Autocomplete
                    value={jobGroupFilter}
                    onChange={(_, newValue) => setJobGroupFilter(newValue)}
                    options={jobGroupOptions}
                    size="small"
                    fullWidth
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder={getString('filterByJobGroupName') || 'Filter by job group…'}
                        />
                    )}
                />
                <Autocomplete
                    value={deptTypeFilter}
                    onChange={(_, newValue) => setDeptTypeFilter(newValue)}
                    options={deptTypeOptions}
                    size="small"
                    fullWidth
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder={getString('filterByDepartmentTypeName') || 'Filter by department type name…'}
                        />
                    )}
                />
              </Box>

              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <DataGrid
                    rows={filteredRows}
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
            </>
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

        {/* Existing user-groups dialog */}
        <JobGroupsDialog
            job={groupsJob}
            isPending={setGroupsMutation.isPending}
            setGroupsMutation={setGroupsMutation}
            onClose={() => setGroupsJob(null)}
        />

        {/* New job-groups dialog */}
        <JobJobGroupsDialog
            job={jobGroupsJob}
            isPending={setJobJobGroupsMutation.isPending}
            setJobGroupsMutation={setJobJobGroupsMutation}
            onClose={() => setJobGroupsJob(null)}
        />

        <JobBulkUploadDialog
            result={bulkUploadResult}
            onClose={() => setBulkUploadResult(null)}
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