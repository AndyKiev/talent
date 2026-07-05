// src/components/employees/EmployeeDepartmentsDrawer.tsx
//
// Two separate link tables drive this drawer:
//   - MAIN department (0..1)            → /employees/{id}/departments
//   - responsibility departments (0..N) → /employees/{id}/responsibility_departments
// The list renders as two sections; add/delete route to the matching endpoint
// via AddDeptJobPayload.isMain. The backend enforces the single-main rule.
//
// All Dialog modals render OUTSIDE the Drawer DOM tree (siblings in the
// fragment) to prevent aria-hidden-on-focused-element errors.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Divider,
    Chip,
    CircularProgress,
    Alert,
    Tooltip,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import WorkIcon from '@mui/icons-material/Work';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ApartmentIcon from '@mui/icons-material/Apartment';
import {
    fetchEmployeeDepartments,
    deleteEmployeeDepartment,
    createEmployeeDepartment,
    fetchEmployeeResponsibilityDepartments,
    deleteEmployeeResponsibilityDepartment,
    createEmployeeResponsibilityDepartment,
    type EmployeeDepartment,
} from './employeeDepartmentApi';
import {
    EmployeeAddDeptJobDialog,
    type AddDeptJobPayload,
    type AddDeptJobMode,
} from './EmployeeAddDeptJobDialog';
import { updateEmployeeJob, type Employee } from './employeeApi';
import { EMPLOYEES_QK } from './useEmployeeMutations';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';
import { formatToUkrDate } from '../../utils/dateFormatter';

export const DEPT_QK = (employeeId: number) =>
    ['employee_departments', employeeId] as const;
export const RESP_DEPT_QK = (employeeId: number) =>
    ['employee_responsibility_departments', employeeId] as const;

interface Props {
    employee: Employee | null;
    onClose: () => void;
}

interface DeleteConfirm {
    dept: EmployeeDepartment;
    isMain: boolean;
}

export function EmployeeDepartmentsDrawer({ employee, onClose }: Props) {
    const getString = useString({ str });
    const qc = useQueryClient();

    const [addMode, setAddMode] = useState<AddDeptJobMode | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    const invalidateAll = async () => {
        await qc.invalidateQueries({ queryKey: DEPT_QK(employee!.id) });
        await qc.invalidateQueries({ queryKey: RESP_DEPT_QK(employee!.id) });
        await qc.invalidateQueries({ queryKey: EMPLOYEES_QK });
    };

    // ── Queries ───────────────────────────────────────────────────────────────

    const { data: mainDepartments = [], isLoading: mainLoading, error: mainError } = useQuery({
        queryKey: DEPT_QK(employee?.id ?? 0),
        queryFn: () => fetchEmployeeDepartments(employee!.id),
        enabled: employee != null,
        staleTime: 30 * 1000,
    });

    const { data: respDepartments = [], isLoading: respLoading, error: respError } = useQuery({
        queryKey: RESP_DEPT_QK(employee?.id ?? 0),
        queryFn: () => fetchEmployeeResponsibilityDepartments(employee!.id),
        enabled: employee != null,
        staleTime: 30 * 1000,
    });

    const isLoading = mainLoading || respLoading;
    const error = mainError ?? respError;
    const isEmpty = mainDepartments.length === 0 && respDepartments.length === 0;

    // ── Mutations ─────────────────────────────────────────────────────────────

    const deleteMutation = useMutation({
        mutationFn: ({ linkId, isMain }: { linkId: number; isMain: boolean }) =>
            isMain
                ? deleteEmployeeDepartment(employee!.id, linkId)
                : deleteEmployeeResponsibilityDepartment(employee!.id, linkId),
        onSuccess: async (res) => {
            await invalidateAll();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            setDeleteConfirm(null);
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            setDeleteConfirm(null);
        },
    });

    const addMutation = useMutation({
        mutationFn: async (payload: AddDeptJobPayload) => {
            if (payload.isMain) {
                await createEmployeeDepartment(employee!.id, {
                    department_id: payload.departmentId,
                });
            } else {
                await createEmployeeResponsibilityDepartment(employee!.id, {
                    department_id: payload.departmentId,
                });
            }
            if (payload.newJobId != null) {
                await updateEmployeeJob({ id: employee!.id, job_id: payload.newJobId });
            }
        },
        onSuccess: async () => {
            await invalidateAll();
            setSnackbar({
                open: true,
                message: getString('departmentAdded') || 'Department added successfully',
                severity: 'success',
            });
            setAddMode(null);
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    // ── Handlers ──────────────────────────────────────────────────────────────

    // Called by EmployeeAddDeptJobDialog via onSubmit prop. The backend rejects
    // a second MAIN department, so no client-side confirmation flow is needed.
    const handleAddSubmit = (payload: AddDeptJobPayload) => {
        addMutation.mutate(payload);
        setAddMode(null);
    };

    const handleDeleteClick = (dept: EmployeeDepartment, isMain: boolean) =>
        setDeleteConfirm({ dept, isMain });

    // ── Render ────────────────────────────────────────────────────────────────

    const renderDeptItem = (dept: EmployeeDepartment, isMain: boolean, idx: number) => (
        <Box key={`${isMain ? 'm' : 'r'}-${dept.id}`}>
            {idx > 0 && <Divider component="li" />}
            <ListItem alignItems="flex-start" sx={{ pr: 7, py: 1.5 }}>
                <ListItemText
                    // secondary renders a <Box> (div), so override the wrapper
                    // to <div> instead of <p> to avoid invalid nesting.
                    secondaryTypographyProps={{ component: 'div' }}
                    primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <Tooltip
                                title={
                                    isMain
                                        ? getString('mainDepartment') || 'Main department'
                                        : getString('responsibilityDept') || 'Responsibility department'
                                }
                            >
                                {isMain
                                    ? <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                    : <StarBorderIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                }
                            </Tooltip>
                            <Typography variant="body2" fontWeight={600}>
                                {dept.department?.name ?? `ID ${dept.department_id}`}
                            </Typography>
                            {isMain && (
                                <Chip
                                    label={getString('main') || 'main'}
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                            )}
                        </Box>
                    }
                    secondary={
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                            {dept.department?.department_category?.name && (
                                <Chip
                                    label={dept.department.department_category.name}
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                            )}
                            {dept.department?.department_type?.name && (
                                <Chip
                                    label={dept.department.department_type.name}
                                    size="small"
                                    color="info"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                            )}
                            <Typography
                                variant="caption"
                                color="text.disabled"
                                sx={{ alignSelf: 'center' }}
                            >
                                {formatToUkrDate(dept.created_at)}
                            </Typography>
                        </Box>
                    }
                />
                <ListItemSecondaryAction>
                    <Tooltip title={getString('delete') || 'Delete'}>
                        <IconButton
                            edge="end"
                            size="small"
                            color="error"
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDeleteClick(dept, isMain)}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </ListItemSecondaryAction>
            </ListItem>
        </Box>
    );

    return (
        // Fragment — all modals are siblings of the Drawer, NOT children,
        // which prevents the aria-hidden-on-focused-element issue.
        <>
            {/* ── Drawer ─────────────────────────────────────────────────────── */}
            <Drawer
                anchor="right"
                open={employee != null}
                onClose={onClose}
                PaperProps={{ sx: { width: { xs: '100vw', sm: 420 } } }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                    {/* Header */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 2,
                            py: 1.5,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <ApartmentIcon color="action" />
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                {cfl(getString('departments') || 'Departments')}
                            </Typography>
                            {employee && (
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                                    <Chip
                                        label={employee.code}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                                    />
                                    <Chip label={employee.name} size="small" variant="outlined" />
                                </Box>
                            )}
                        </Box>
                        <IconButton onClick={onClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Current job banner */}
                    {employee?.job && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: 'action.hover' }}>
                            <WorkIcon fontSize="small" color="primary" />
                            <Typography variant="caption" color="text.secondary">
                                {getString('currentJob') || 'Current job'}:
                            </Typography>
                            <Chip label={employee.job.name} size="small" color="primary" variant="filled" />
                        </Box>
                    )}

                    <Divider />

                    {/* Department sections */}
                    <Box sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1 }}>
                        {isLoading && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                <CircularProgress size={28} />
                            </Box>
                        )}
                        {!isLoading && error && (
                            <Alert severity="error" sx={{ m: 1 }}>{(error as Error).message}</Alert>
                        )}
                        {!isLoading && !error && isEmpty && (
                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    {getString('noDepartmentsAssigned') || 'No departments assigned yet.'}
                                </Typography>
                            </Box>
                        )}
                        {!isLoading && !error && mainDepartments.length > 0 && (
                            <>
                                <Typography
                                    variant="overline"
                                    color="text.secondary"
                                    sx={{ px: 1, display: 'block' }}
                                >
                                    {cfl(getString('mainDepartment') || 'Main department')}
                                </Typography>
                                <List disablePadding>
                                    {mainDepartments.map((dept, idx) => renderDeptItem(dept, true, idx))}
                                </List>
                            </>
                        )}
                        {!isLoading && !error && respDepartments.length > 0 && (
                            <>
                                <Typography
                                    variant="overline"
                                    color="text.secondary"
                                    sx={{ px: 1, display: 'block', mt: mainDepartments.length > 0 ? 1.5 : 0 }}
                                >
                                    {cfl(getString('responsibilityDepts') || 'Responsibility departments')}
                                </Typography>
                                <List disablePadding>
                                    {respDepartments.map((dept, idx) => renderDeptItem(dept, false, idx))}
                                </List>
                            </>
                        )}
                    </Box>

                    <Divider />

                    {/* Footer */}
                    <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setAddMode('add_department')}
                        >
                            {getString('addDepartment') || 'Add Department'}
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<WorkIcon />}
                            color="warning"
                            onClick={() => setAddMode('change_job')}
                        >
                            {getString('changeJob') || 'Change Job'}
                        </Button>
                    </Box>
                </Box>
            </Drawer>

            {/* ── All dialogs outside the Drawer DOM tree ────────────────────── */}

            {/* Add dept / change job form dialog */}
            <EmployeeAddDeptJobDialog
                open={addMode != null}
                onClose={() => setAddMode(null)}
                employee={employee}
                mode={addMode ?? 'add_department'}
                isPending={addMutation.isPending}
                onSubmit={handleAddSubmit}
            />

            {/* Confirmation: delete department (extra warning for the main one) */}
            <Dialog
                open={deleteConfirm != null}
                onClose={() => setDeleteConfirm(null)}
                maxWidth="xs"
                fullWidth
                disableRestoreFocus
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {deleteConfirm?.isMain && <WarningAmberIcon color="warning" />}
                    {deleteConfirm?.isMain
                        ? getString('deleteMainDeptTitle') || 'Delete Main Department'
                        : getString('deleteDepartmentAssignment') || 'Delete Department Assignment'}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {deleteConfirm?.isMain && (
                        <Alert severity="warning">
                            {getString('deleteMainDeptWarning') ||
                                'This is a main department assignment. Deleting it may leave the employee without a primary organisational unit.'}
                        </Alert>
                    )}
                    <Typography variant="body2">
                        {getString('areYouSureDeleteDeptAssignment') ||
                            'Are you sure you want to remove this department assignment?'}
                    </Typography>
                    {deleteConfirm?.dept.department?.name && (
                        <Chip
                            label={deleteConfirm.dept.department.name}
                            size="small"
                            variant="outlined"
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="outlined"
                        onClick={() => setDeleteConfirm(null)}
                        disabled={deleteMutation.isPending}
                    >
                        {getString('cancel') || 'Cancel'}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={deleteMutation.isPending}
                        startIcon={
                            deleteMutation.isPending
                                ? <CircularProgress size={16} color="inherit" />
                                : undefined
                        }
                        onClick={() =>
                            deleteConfirm &&
                            deleteMutation.mutate({
                                linkId: deleteConfirm.dept.id,
                                isMain: deleteConfirm.isMain,
                            })
                        }
                    >
                        {getString('delete') || 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
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
        </>
    );
}
