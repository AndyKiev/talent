// src/components/employees/EmployeesPage.tsx
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Button,
    Alert,
    Snackbar,
    Typography,
    Breadcrumbs,
    Tooltip,
    IconButton,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PeopleIcon from '@mui/icons-material/People';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ApartmentIcon from '@mui/icons-material/Apartment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { Link, useNavigate } from '@tanstack/react-router';
import AppShell from '../layout/AppShell';
import { fetchEmployees, fetchEmployeesByDepartment, type Employee } from './employeeApi';
import { useEmployeeColumns } from './useEmployeeColumns';
import { useEmployeeMutations, EMPLOYEES_QK } from './useEmployeeMutations';
import { SelectScopeDepartment } from './SelectScopeDepartment';
import { EmployeeCreateDialog } from './EmployeeCreateDialog';
import { EmployeeEditDialog } from './EmployeeEditDialog';
import { EmployeeDeleteDialog } from './EmployeeDeleteDialog';
import { EmployeeDepartmentsDrawer } from './EmployeeDepartmentsDrawer';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';
import { useDataGridStyles } from '../../hooks/useDataGridStyles';
import { useDataGridLocale } from '../../hooks/useDataGridLocale';

export function EmployeesPage() {
    const getString = useString({ str });
    const dataGridSx = useDataGridStyles();
    const localeText = useDataGridLocale();
    const navigate = useNavigate();

    // ── Dialog / drawer state ─────────────────────────────────────────────────
    const [createOpen, setCreateOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [employeeForDepts, setEmployeeForDepts] = useState<Employee | null>(null);

    // Selected department in the filter Select (null = all visible to the user).
    const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: employees = [], isLoading, error } = useQuery({
        queryKey: [...EMPLOYEES_QK, { departmentId: selectedDeptId }],
        queryFn: () =>
            selectedDeptId == null
                ? fetchEmployees()
                : fetchEmployeesByDepartment(selectedDeptId),
        staleTime: 2 * 60 * 1000,
    });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { createMutation, updateMutation, deleteMutation } = useEmployeeMutations({
        setSnackbar,
        onCreateSuccess: () => setCreateOpen(false),
        onUpdateSuccess: () => setEmployeeToEdit(null),
        onDeleteSuccess: () => setEmployeeToDelete(null),
        onDeleteError: () => setEmployeeToDelete(null),
    });

    // ── Action handlers ───────────────────────────────────────────────────────
    const handleEdit = useCallback((emp: Employee) => setEmployeeToEdit(emp), []);
    const handleDelete = useCallback((emp: Employee) => setEmployeeToDelete(emp), []);
    const handleManageDepts = useCallback((emp: Employee) => setEmployeeForDepts(emp), []);

    // ── Base columns + actions column ─────────────────────────────────────────
    const baseColumns = useEmployeeColumns();

    const actionsColumn: GridColDef<Employee> = {
        field: '_actions',
        headerName: '',
        width: 180,
        sortable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
            <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center', height: '100%' }}>
                <Tooltip title={cfl(getString('events') || 'Events')}>
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                            void navigate({
                                to: '/employees/$employeeId/events',
                                params: { employeeId: String(row.id) },
                            });
                        }}
                    >
                        <EventNoteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={cfl(getString('talentAudit') || 'Talent Audit')}>
                    <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => {
                            void navigate({
                                to: '/employees/$employeeId/talent_audit',
                                params: { employeeId: String(row.id) },
                            });
                        }}
                    >
                        <AssessmentIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={cfl(getString('manageDepartments') || 'Manage Departments')}>
                    <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleManageDepts(row)}
                    >
                        <ApartmentIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={cfl(getString('edit') || 'Edit')}>
                    <IconButton size="small" color="warning" onClick={() => handleEdit(row)}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={cfl(getString('delete') || 'Delete')}>
                    <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        ),
    };

    const columns = [...baseColumns, actionsColumn];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <AppShell>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1800, mx: 'auto' }}>
                {/* Breadcrumbs */}
                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('home') || 'Home')}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('employees') || 'Employees')}
                    </Typography>
                </Breadcrumbs>

                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <PeopleIcon color="action" />
                    <Typography variant="h6" fontWeight={600}>
                        {cfl(getString('employees') || 'Employees')}
                    </Typography>
                    <SelectScopeDepartment value={selectedDeptId} onChange={setSelectedDeptId} />
                    <Box sx={{ flex: 1 }} />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateOpen(true)}
                    >
                        {cfl(getString('addEmployee') || 'Add Employee')}
                    </Button>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {(error as Error).message}
                    </Alert>
                )}

                <DataGrid
                    rows={employees}
                    columns={columns}
                    loading={isLoading}
                    autoHeight
                    pageSizeOptions={[25, 50, 100]}
                    initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                    disableRowSelectionOnClick
                    sx={dataGridSx}
                    localeText={localeText}
                />
            </Box>

            {/* Dialogs */}
            <EmployeeCreateDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                createMutation={createMutation}
            />
            <EmployeeEditDialog
                employee={employeeToEdit}
                onClose={() => setEmployeeToEdit(null)}
                updateMutation={updateMutation}
            />
            <EmployeeDeleteDialog
                employee={employeeToDelete}
                isPending={deleteMutation.isPending}
                onConfirm={() => employeeToDelete && deleteMutation.mutate(employeeToDelete.id)}
                onCancel={() => setEmployeeToDelete(null)}
            />

            {/* Departments drawer */}
            <EmployeeDepartmentsDrawer
                employee={employeeForDepts}
                onClose={() => setEmployeeForDepts(null)}
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
        </AppShell>
    );
}