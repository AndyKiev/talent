import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid } from '@mui/x-data-grid';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import {
  createJob,
  deleteJob,
  fetchJobs,
  updateJob,
  type Job,
  type JobBulkUploadResult,
} from './jobApi';
import { useJobMutations } from './useJobMutations';
import { useJobColumns, type EditingState } from './useJobColumns';
import { JobForm } from './JobForm';
import { JobGroupsDialog } from './JobGroupsDialog';
import { JobJobGroupsDialog } from './JobJobGroupsDialog';
import { JobProcessRoleDialog } from './JobProcessRoleDialog';
import { JobRecommendedTrainingsDialog } from './JobRecommendedTrainingsDialog';
import { JobRequirementGroupsDialog } from '../../recruitment/requirements/JobRequirementGroupsDialog';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { JobBulkUploadDialog } from './JobBulkUploadDialog';
import { JOB_QK, DEPARTMENT_TYPE_QK, JOB_CATEGORY_QK } from '../../../utils/queryKeys.ts';
import { fetchDepartmentTypes } from '../department_types/departmentTypeApi';
import { fetchJobCategories } from '../job_categories/jobCategoryApi';
import { useBooleanSetting } from '../../../hooks/useAppSetting';
import { useUserGridColumns } from '../../../hooks/useUserGridColumns';
import { UserGridTable } from '../../../utils/userGridTables';
import { centeredGridCellsSx } from '../../../utils/dataGridSx';
import { useCrudGrid } from '../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../ui/CrudDialogs';
import { AsyncContent } from '../../ui/AsyncContent';

type ActiveFilterValue = 'all' | 'active' | 'inactive';

const FIELD_LABELS: Record<string, string> = {
  name: 'name',
  description: 'description',
};

export function JobCrud() {
  const getString = useString({ str });

  // ── Training-module master switch: OFF hides the recommended-trainings
  //     column and disables the assignment dialog.
  const { enabled: trainingModuleOn } = useBooleanSetting('training_module_enabled');

  // ── Recruitment-module master switch: OFF hides the requirements action
  //     button and its per-job requirement-groups dialog.
  const { enabled: recruitmentModuleOn } = useBooleanSetting('recruitment_module_enabled');

  // ── Filters (job name + job group + department type + is_active) ─────────
  const [filter, setFilter] = useState('');
  const [jobGroupFilter, setJobGroupFilter] = useState<string | null>(null);
  const [deptTypeFilter, setDeptTypeFilter] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');

  // ── Edit mode: OFF (default) = read-only grid ─────────────────────────────
  const [editMode, setEditMode] = useState(false);

  // ── User-groups dialog (existing) ─────────────────────────────────────────
  const [groupsJob, setGroupsJob] = useState<Job | null>(null);

  // ── Job-groups dialog (new) ───────────────────────────────────────────────
  const [jobGroupsJob, setJobGroupsJob] = useState<Job | null>(null);

  // ── Process-role dialog ──────────────────────────────────────────────────
  const [processRoleJob, setProcessRoleJob] = useState<Job | null>(null);

  // ── Recommended-trainings dialog ─────────────────────────────────────────
  const [trainingTypesJob, setTrainingTypesJob] = useState<Job | null>(null);

  // ── Requirement-groups dialog (recruitment) ──────────────────────────────
  const [requirementsJob, setRequirementsJob] = useState<Job | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const crud = useCrudGrid({
    queryKey: JOB_QK,
    fetchFn: () => fetchJobs(),
    createFn: createJob,
    updateFn: updateJob,
    deleteFn: deleteJob,
    getString,
    fieldLabels: FIELD_LABELS,
    // Jobs saved inline edits immediately (the old REQUIRE_EDIT_CONFIRMATION
    // = false); no confirm dialog in this grid.
    confirmEdits: false,
  });

  // ── Extra mutations (bulk upload, groups, categories, etc.) ───────────────
  const {
    setGroupsMutation,
    setJobJobGroupsMutation,
    addProcessRoleLinkMutation,
    removeProcessRoleLinkMutation,
    bulkUploadMutation,
    setCategoryMutation,
    setTrainingTypesMutation,
  } = useJobMutations({
    setSnackbar: crud.setSnackbar,
    onCreateSuccess: () => crud.setFormOpen(false),
    onUpdateSuccess: () => {},
    onDeleteSuccess: () => {},
    onDeleteError: () => {},
    onSetGroupsSuccess: () => setGroupsJob(null),
    onSetJobGroupsSuccess: () => setJobGroupsJob(null),
    onAddProcessRoleSuccess: () => setProcessRoleJob(null),
    onRemoveProcessRoleSuccess: () => setProcessRoleJob(null),
    onBulkUploadSuccess: (result) => setBulkUploadResult(result),
    onSetTrainingTypesSuccess: () => setTrainingTypesJob(null),
  });

  const [bulkUploadResult, setBulkUploadResult] = useState<JobBulkUploadResult | null>(null);

  // ── Filters: job name AND job group AND department type AND status ────────
  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return crud.rows.filter((r) => {
      const nameOk = !q || r.name.toLowerCase().includes(q);
      const jobGroupOk =
        !jobGroupFilter || (r.job_group_names ?? []).includes(jobGroupFilter);
      const deptOk =
        !deptTypeFilter ||
        (r.department_type_links ?? []).some((l) => l.name === deptTypeFilter);
      const activeOk =
        activeFilter === 'all' || (activeFilter === 'active') === r.is_active;
      return nameOk && jobGroupOk && deptOk && activeOk;
    });
  }, [crud.rows, filter, jobGroupFilter, deptTypeFilter, activeFilter]);

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

  // ── Job categories (options for the per-row category select) ──────────────
  const { data: jobCategories = [] } = useQuery({
    queryKey: JOB_CATEGORY_QK,
    queryFn: () => fetchJobCategories(),
    staleTime: 2 * 60 * 1000,
  });

  // ── Job group options — derived from loaded rows, no extra query needed ───
  const jobGroupOptions = useMemo(
    () =>
      Array.from(new Set(crud.rows.flatMap((r) => r.job_group_names ?? [])))
        .sort((a, b) => a.localeCompare(b)),
    [crud.rows],
  );

  // ── Compatible editing state for the column builder ──────────────────────
  const editingStateForColumns: EditingState = useMemo(
    () => ({
      rowId: crud.editingState.userId,
      field: crud.editingState.field,
    }),
    [crud.editingState],
  );

  // ── File selection handler ────────────────────────────────────────────────
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    bulkUploadMutation.mutate(file);
    e.target.value = '';
  };

  // ── Dialog openers ────────────────────────────────────────────────────────
  const handleGroupsClick = (row: Job) => setGroupsJob(row);
  const handleJobGroupsClick = (row: Job) => setJobGroupsJob(row);
  const handleProcessRoleClick = (row: Job) => setProcessRoleJob(row);
  const handleTrainingTypesClick = (row: Job) => {
    if (!trainingModuleOn) return;
    setTrainingTypesJob(row);
  };
  const handleRequirementsClick = (row: Job) => {
    if (!recruitmentModuleOn) return;
    setRequirementsJob(row);
  };
  const handleSetCategory = (row: Job, jobCategoryId: number) => {
    if (row.job_category_id === jobCategoryId) return;
    setCategoryMutation.mutate({ jobId: row.id, jobCategoryId });
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useJobColumns({
    getString,
    editingState: editingStateForColumns,
    onEditFieldClick: crud.handleEditFieldClick,
    onRequestSave: crud.handleRequestSave,
    onCancelEdit: crud.handleCancelEdit,
    updateIsPending: crud.updateMutation.isPending,
    onToggleActive: (row) => crud.requestToggle(row, 'is_active', 'isActive', 'Active'),
    toggleIsPending: crud.updateMutation.isPending,
    onGroupsClick: handleGroupsClick,
    onJobGroupsClick: handleJobGroupsClick,
    onProcessRoleClick: handleProcessRoleClick,
    onTrainingTypesClick: handleTrainingTypesClick,
    onRequirementsClick: handleRequirementsClick,
    onDeleteClick: crud.handleDeleteClick,
    deleteIsPending: crud.deleteMutation.isPending,
    categories: jobCategories,
    onSetCategory: handleSetCategory,
    setCategoryIsPending: setCategoryMutation.isPending,
    trainingModuleOn,
    recruitmentModuleOn,
    editMode,
  });

  const userGridColumns = useUserGridColumns(UserGridTable.JOBS, columns);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
          {getString('jobs') || 'Jobs'}
        </Typography>
        <FormControlLabel
          sx={{ mr: 1 }}
          control={
            <Switch
              size="small"
              checked={editMode}
              onChange={(e) => setEditMode(e.target.checked)}
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              {getString('editMode') || 'Edit mode'}
            </Typography>
          }
        />
        <>
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
          onClick={() => crud.setFormOpen(true)}
        >
          {cfl(getString('addJob')) || 'Add Job'}
        </Button>
      </Box>

      <AsyncContent isLoading={crud.isLoading} error={crud.error}>
        <>
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
            <Select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as ActiveFilterValue)}
              size="small"
              variant="outlined"
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="all">{getString('allStatuses') || 'All statuses'}</MenuItem>
              <MenuItem value="active">{getString('active') || 'Active'}</MenuItem>
              <MenuItem value="inactive">{getString('inactive') || 'Inactive'}</MenuItem>
            </Select>
          </Box>

          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              {...userGridColumns}
              paginationModel={crud.paginationModel}
              onPaginationModelChange={crud.setPaginationModel}
              pageSizeOptions={[5, 10, 25, 50]}
              disableRowSelectionOnClick
              getRowId={(row) => row.id}
              getRowHeight={() => 'auto'}
              density="compact"
              localeText={crud.localeText}
              hideFooterSelectedRowCount
              sx={{
                ...centeredGridCellsSx,
                '& .MuiDataGrid-cell': {
                  display: 'flex',
                  alignItems: 'center',
                  py: 0.25,
                },
              }}
            />
          </Paper>
        </>
      </AsyncContent>

      <JobForm
        open={crud.formOpen}
        onClose={() => crud.setFormOpen(false)}
        createMutation={crud.createMutation}
      />

      <CrudDialogs
        crud={crud}
        withFieldEdit={false}
        deleteTitle={getString('deleteJob') || 'Delete Job'}
        deleteMessage={
          getString('areYouSureDeleteJob') ||
          `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`
        }
      />

      <JobGroupsDialog
        job={groupsJob}
        isPending={setGroupsMutation.isPending}
        setGroupsMutation={setGroupsMutation}
        onClose={() => setGroupsJob(null)}
      />

      <JobJobGroupsDialog
        job={jobGroupsJob}
        isPending={setJobJobGroupsMutation.isPending}
        setJobGroupsMutation={setJobJobGroupsMutation}
        onClose={() => setJobGroupsJob(null)}
      />

      <JobProcessRoleDialog
        job={processRoleJob}
        addIsPending={addProcessRoleLinkMutation.isPending}
        removeIsPending={removeProcessRoleLinkMutation.isPending}
        addLinkMutation={addProcessRoleLinkMutation}
        removeLinkMutation={removeProcessRoleLinkMutation}
        onClose={() => setProcessRoleJob(null)}
      />

      {trainingModuleOn && (
        <JobRecommendedTrainingsDialog
          job={trainingTypesJob}
          isPending={setTrainingTypesMutation.isPending}
          setTrainingTypesMutation={setTrainingTypesMutation}
          onClose={() => setTrainingTypesJob(null)}
        />
      )}

      {recruitmentModuleOn && (
        <JobRequirementGroupsDialog
          job={requirementsJob}
          onClose={() => setRequirementsJob(null)}
        />
      )}

      <JobBulkUploadDialog
        result={bulkUploadResult}
        onClose={() => setBulkUploadResult(null)}
      />
    </Box>
  );
}
