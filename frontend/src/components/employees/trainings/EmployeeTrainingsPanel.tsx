// src/components/employees/trainings/EmployeeTrainingsPanel.tsx
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Snackbar,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SchoolIcon from '@mui/icons-material/School';
import {
    fetchEmployeeTrainings,
    createEmployeeTraining,
    updateEmployeeTraining,
    deleteEmployeeTraining,
    type EmployeeTraining,
} from './employeeTrainingApi';
import { fetchTrainingTypes, fetchEligibleTrainingTypes } from '../../training/training_types/trainingTypeApi';
import { fetchEmployeeTrainingStatuses } from '../../training/employee_training_statuses/employeeTrainingStatusApi';
import { AssignTrainingDialog } from './AssignTrainingDialog';
import { EmployeeTrainingStatusDialog } from './EmployeeTrainingStatusDialog';
import type { GetStringFn } from '../../../types/getStringFn';
import { useDataGridStyles } from '../../../hooks/useDataGridStyles';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import { formatToUkrDate } from '../../../utils/dateFormatter';
import cfl, { snakeToCamel } from '../../../utils/helpers.ts';
import {
    EMPLOYEE_TRAININGS_QK,
    TRAINING_TYPE_QK,
    TRAINING_TYPES_ELIGIBLE_QK,
    EMPLOYEE_TRAINING_STATUS_QK,
} from '../../../utils/queryKeys.ts';

interface Props {
    employeeId: number;
    isEditable: boolean;
    getString: GetStringFn;
    /**
     * People-Review embedding: small grid, plain (non-app-themed) DataGrid
     * header, no section title/toggle-row of its own (an external pencil
     * elsewhere controls isEditable). Employees page passes nothing and stays
     * on the original full-size, app-styled, self-titled layout.
     */
    compact?: boolean;
}

/**
 * Reusable core of the Employees "Trainings" tab, parameterized by employeeId
 * (not route-bound) so it can also be embedded in People Review. Reads/writes
 * the same employee_training records (shared query keys) as the standalone
 * /employees/$employeeId/trainings page.
 */
export function EmployeeTrainingsPanel({ employeeId, isEditable, getString, compact = false }: Props) {
    const qc = useQueryClient();
    const dataGridSx = useDataGridStyles();
    const localeText = useDataGridLocale();
    // The app sets a global MuiDataGrid columnHeader theme override (colored
    // background/text) so every grid matches by default. This compact variant
    // opts back out to the plain default MUI DataGrid header look.
    const compactGridSx = {
        fontSize: 12,
        '& .MuiDataGrid-cell': { py: 0, px: 1 },
        '& .MuiDataGrid-columnHeader': {
            py: 0,
            px: 1,
            backgroundColor: 'background.paper',
            color: 'text.primary',
        },
        '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 500,
            color: 'text.primary',
        },
        '& .MuiDataGrid-iconButtonContainer button, & .MuiDataGrid-menuIcon button': {
            color: 'text.primary',
        },
        '& .MuiDataGrid-sortIcon': {
            color: 'text.secondary',
        },
    } as const;

    const [showAll, setShowAll] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [statusTarget, setStatusTarget] = useState<EmployeeTraining | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<EmployeeTraining | null>(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });
    const showNotification = (message: string, severity: 'success' | 'error' = 'success') =>
        setSnackbar({ open: true, message, severity });

    const assignedQKey = EMPLOYEE_TRAININGS_QK(employeeId);
    const { data: assigned = [], isLoading: assignedLoading, error: assignedError } = useQuery({
        queryKey: assignedQKey,
        queryFn: () => fetchEmployeeTrainings(employeeId),
        enabled: !!employeeId,
    });

    const eligibleQKey = TRAINING_TYPES_ELIGIBLE_QK(employeeId);
    const { data: eligibleTypes = [] } = useQuery({
        queryKey: eligibleQKey,
        queryFn: () => fetchEligibleTrainingTypes(employeeId),
        enabled: !!employeeId && !showAll,
    });

    const { data: allTypes = [] } = useQuery({
        queryKey: TRAINING_TYPE_QK,
        queryFn: fetchTrainingTypes,
        enabled: showAll,
    });

    const { data: statuses = [] } = useQuery({
        queryKey: EMPLOYEE_TRAINING_STATUS_QK,
        queryFn: fetchEmployeeTrainingStatuses,
    });

    const pickerTrainingTypes = showAll ? allTypes : eligibleTypes;
    const assignedTypeIds = useMemo(() => new Set(assigned.map((a) => a.training_type_id)), [assigned]);
    const availableForAssignment = useMemo(
        () => pickerTrainingTypes.filter((t) => !assignedTypeIds.has(t.id)),
        [pickerTrainingTypes, assignedTypeIds],
    );

    const createMutation = useMutation({
        mutationFn: createEmployeeTraining,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: assignedQKey });
            showNotification(res.detail);
            setAssignOpen(false);
        },
        onError: (err: Error) => showNotification(err.message, 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: updateEmployeeTraining,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: assignedQKey });
            showNotification(res.detail);
            setStatusTarget(null);
        },
        onError: (err: Error) => showNotification(err.message, 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteEmployeeTraining,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: assignedQKey });
            showNotification(res.detail);
            setDeleteTarget(null);
        },
        onError: (err: Error) => {
            showNotification(err.message, 'error');
            setDeleteTarget(null);
        },
    });

    const columns: GridColDef<EmployeeTraining>[] = [
        { field: 'training_type_name', headerName: getString('trainingType') || 'Training', flex: 1.5, minWidth: 180 },
        {
            field: 'training_status_key',
            headerName: getString('status') || 'Status',
            width: 140,
            valueGetter: (_value, row) => {
                const rawKey = row.training_status_key ?? '';
                const statusKey = `trainingStatus${cfl(snakeToCamel(rawKey))}`;
                const translated = getString(statusKey);
                return translated === statusKey ? cfl(rawKey) : cfl(translated);
            },
        },
        {
            field: 'created_at',
            headerName: getString('createdAt') || 'Assigned',
            width: 140,
            renderCell: ({ row }) => formatToUkrDate(row.created_at),
        },
        ...(isEditable
            ? [
                  {
                      field: '_actions',
                      headerName: '',
                      width: 96,
                      sortable: false,
                      disableColumnMenu: true,
                      renderCell: ({ row }: { row: EmployeeTraining }) => (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title={getString('changeStatus') || 'Change status'}>
                                  <IconButton size="small" onClick={() => setStatusTarget(row)}>
                                      <EditIcon fontSize="small" />
                                  </IconButton>
                              </Tooltip>
                              <Tooltip title={getString('unassign') || 'Unassign'}>
                                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                                      <DeleteIcon fontSize="small" />
                                  </IconButton>
                              </Tooltip>
                          </Box>
                      ),
                  } as GridColDef<EmployeeTraining>,
              ]
            : []),
    ];

    return (
        <Box>
            {!compact && (
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
                    <Typography variant="subtitle1" fontWeight={600}>
                        {getString('trainings') || 'Trainings'}
                    </Typography>
                    {isEditable && (
                        <Stack direction="row" alignItems="center" gap={2}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        size="small"
                                        checked={showAll}
                                        onChange={(_, checked) => setShowAll(checked)}
                                    />
                                }
                                label={getString('showAllTrainingTypes') || 'Show all training types'}
                            />
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => setAssignOpen(true)}
                            >
                                {getString('assignTraining') || 'Assign Training'}
                            </Button>
                        </Stack>
                    )}
                </Stack>
            )}

            {compact && isEditable && (
                <Stack direction="row" alignItems="center" gap={2} mb={1} flexWrap="wrap">
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={showAll}
                                onChange={(_, checked) => setShowAll(checked)}
                            />
                        }
                        label={
                            <Typography fontSize={12}>
                                {getString('showAllTrainingTypes') || 'Show all training types'}
                            </Typography>
                        }
                    />
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setAssignOpen(true)}
                    >
                        {getString('assignTraining') || 'Assign Training'}
                    </Button>
                </Stack>
            )}

            {assignedError && (
                <Alert severity="error">{getString('loadFailed') || 'Failed to load'}</Alert>
            )}

            {assignedLoading ? (
                <CircularProgress size={compact ? 20 : 40} />
            ) : assigned.length === 0 ? (
                compact ? (
                    <Typography variant="caption" color="text.secondary">
                        {getString('noTrainingsAssigned') || 'No trainings assigned yet.'}
                    </Typography>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <SchoolIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">
                            {getString('noTrainingsAssigned') || 'No trainings assigned yet.'}
                        </Typography>
                    </Box>
                )
            ) : (
                <DataGrid
                    rows={assigned}
                    columns={columns}
                    autoHeight
                    hideFooter={assigned.length <= 10}
                    disableRowSelectionOnClick
                    rowHeight={compact ? 28 : undefined}
                    columnHeaderHeight={compact ? 32 : undefined}
                    sx={compact ? compactGridSx : dataGridSx}
                    localeText={localeText}
                />
            )}

            {isEditable && (
                <>
                    <AssignTrainingDialog
                        open={assignOpen}
                        onClose={() => setAssignOpen(false)}
                        employeeId={employeeId}
                        availableTrainingTypes={availableForAssignment}
                        trainingStatuses={statuses}
                        createMutation={createMutation}
                    />

                    <EmployeeTrainingStatusDialog
                        open={!!statusTarget}
                        employeeTraining={statusTarget}
                        trainingStatuses={statuses}
                        updateMutation={updateMutation}
                        onClose={() => setStatusTarget(null)}
                    />

                    <Dialog open={!!deleteTarget} onClose={() => !deleteMutation.isPending && setDeleteTarget(null)} maxWidth="xs" fullWidth>
                        <DialogTitle>{getString('confirmUnassign') || 'Unassign Training?'}</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" color="text.secondary">
                                {getString('confirmUnassignMessage', { name: deleteTarget?.training_type_name ?? '' }) ||
                                    `This will remove "${deleteTarget?.training_type_name}" from this employee.`}
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
                                {getString('cancel') || 'Cancel'}
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? <CircularProgress size={18} /> : (getString('unassign') || 'Unassign')}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
