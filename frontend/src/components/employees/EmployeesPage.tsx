// src/components/employees/EmployeesPage.tsx
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Button,
    Alert,
    Snackbar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Breadcrumbs,
    Tooltip,
    IconButton,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
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
import { useClipboard } from '../../hooks/useClipboard';
import { useDataGridStyles } from '../../hooks/useDataGridStyles';
import { useDataGridLocale } from '../../hooks/useDataGridLocale';
import { useAuthStore } from '../../store/authStore';

export function EmployeesPage() {
    const getString = useString({ str });
    const dataGridSx = useDataGridStyles();
    const localeText = useDataGridLocale();
    const navigate = useNavigate();

    // Dev/superadmin (bypass) users may force-cascade related records on delete.
    const isDev = useAuthStore(
        (s) => (s.user?.groups ?? []).some((g) => g.trim().toLowerCase() === 'dev'),
    );

    // ── Dialog / drawer state ─────────────────────────────────────────────────
    const [createOpen, setCreateOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [employeeForDepts, setEmployeeForDepts] = useState<Employee | null>(null);

    // Selected department in the filter Select (null = all visible to the user).
    const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

    // ── Client-side column filters (like SelectScopeDepartment, atop each column) ──
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [subdepartmentFilter, setSubdepartmentFilter] = useState<string | null>(null);
    const [jobFilter, setJobFilter] = useState<string | null>(null);

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

    // ── Derive unique filter options from the full (unfiltered) employee list ──
    // Status values need translation for display, but raw value for filtering.
    const statusLabelMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const e of employees)
            if (e.status?.name) map.set(e.status.name, cfl(getString(e.status.name) || e.status.name));
        return map;
    }, [employees, getString]);
    const statusOptions = useMemo(
        () => [...new Set(employees.map((e) => e.status?.name).filter(Boolean))].sort() as string[],
        [employees],
    );
    const subdepartmentOptions = useMemo(() => {
        // Build a name → min category sort_order map from employee data so the
        // closest-department filter dropdown is sorted by department_category.sort_order.
        const orderMap = new Map<string, number>();
        for (const e of employees) {
            for (const d of e.main_departments ?? []) {
                const prev = orderMap.get(d.name);
                if (prev === undefined || d.department_category_sort_order < prev) {
                    orderMap.set(d.name, d.department_category_sort_order);
                }
            }
        }
        return [...new Set(employees.flatMap((e) => e.main_departments?.map((d) => d.name) ?? []))]
            .sort((a, b) => (orderMap.get(a) ?? 0) - (orderMap.get(b) ?? 0) || a.localeCompare(b));
    }, [employees]);
    const jobOptions = useMemo(
        () => [...new Set(employees.map((e) => e.job?.name).filter(Boolean))].sort() as string[],
        [employees],
    );

    // ── Client-side filtering ───────────────────────────────────────────────────
    const filteredEmployees = useMemo(() => {
        let result = employees;
        if (statusFilter)
            result = result.filter((e) => e.status?.name === statusFilter);
        if (subdepartmentFilter)
            result = result.filter((e) =>
                e.main_departments?.some((d) => d.name === subdepartmentFilter),
            );
        if (jobFilter) result = result.filter((e) => e.job?.name === jobFilter);
        return result;
    }, [employees, statusFilter, subdepartmentFilter, jobFilter]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { createMutation, updateMutation, deleteMutation } = useEmployeeMutations({
        setSnackbar,
        onCreateSuccess: () => setCreateOpen(false),
        onUpdateSuccess: () => setEmployeeToEdit(null),
        onDeleteSuccess: () => setEmployeeToDelete(null),
        onDeleteError: () => setEmployeeToDelete(null),
    });

    // ── Clipboard ──────────────────────────────────────────────────────────────
    const { copyToClipboard } = useClipboard({
        onSuccess: (message) => setSnackbar({ open: true, message, severity: 'success' }),
        onError: (message) => setSnackbar({ open: true, message, severity: 'error' }),
    });

    // ── Action handlers ───────────────────────────────────────────────────────
    const handleEdit = useCallback((emp: Employee) => setEmployeeToEdit(emp), []);
    const handleDelete = useCallback((emp: Employee) => setEmployeeToDelete(emp), []);
    const handleManageDepts = useCallback((emp: Employee) => setEmployeeForDepts(emp), []);

    // ── Base columns (photo first, then code/name/...) + actions column ──────
    const baseColumns = useEmployeeColumns(copyToClipboard);

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

    // Column order: photo → actions → code → name → email → ...
    // The photo column is absent when the photos feature is off, so detect it by
    // field rather than assuming index 0 (keeps the order correct either way).
    const photoColumn = baseColumns.find((c) => c.field === 'photo');
    const restColumns = baseColumns.filter((c) => c.field !== 'photo');
    const columns = [...(photoColumn ? [photoColumn] : []), actionsColumn, ...restColumns];

    const ALL_VALUE = '__all__';

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

                {/* Header + column filters + Add button — all on one line, no wrapping */}
                {employees.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <SelectScopeDepartment value={selectedDeptId} onChange={setSelectedDeptId} />
                        {subdepartmentOptions.length > 0 && (
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>
                                    {cfl(getString('department') || 'Department')}
                                </InputLabel>
                                <Select
                                    label={cfl(getString('department') || 'Department')}
                                    value={subdepartmentFilter ?? ALL_VALUE}
                                    onChange={(e) =>
                                        setSubdepartmentFilter(e.target.value === ALL_VALUE ? null : e.target.value)
                                    }
                                >
                                    <MenuItem value={ALL_VALUE}>
                                        <em>{getString('all') || getString('allDepartments') || 'All'}</em>
                                    </MenuItem>
                                    {subdepartmentOptions.map((s) => (
                                        <MenuItem key={s} value={s}>{s}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        {jobOptions.length > 0 && (
                            <FormControl size="small" sx={{ minWidth: 180 }}>
                                <InputLabel>{cfl(getString('job') || 'Job')}</InputLabel>
                                <Select
                                    label={cfl(getString('job') || 'Job')}
                                    value={jobFilter ?? ALL_VALUE}
                                    onChange={(e) =>
                                        setJobFilter(e.target.value === ALL_VALUE ? null : e.target.value)
                                    }
                                >
                                    <MenuItem value={ALL_VALUE}>
                                        <em>{getString('all') || getString('allJobs') || 'All'}</em>
                                    </MenuItem>
                                    {jobOptions.map((s) => (
                                        <MenuItem key={s} value={s}>{s}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        {statusOptions.length > 0 && (
                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>
                                    {cfl(getString('employeeStatus') || 'Status')}
                                </InputLabel>
                                <Select
                                    label={cfl(getString('employeeStatus') || 'Status')}
                                    value={statusFilter ?? ALL_VALUE}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value === ALL_VALUE ? null : e.target.value)
                                    }
                                >
                                    <MenuItem value={ALL_VALUE}>
                                        <em>{getString('all') || getString('allStatuses') || 'All'}</em>
                                    </MenuItem>
                                    {statusOptions.map((s) => (
                                        <MenuItem key={s} value={s}>{statusLabelMap.get(s) ?? s}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        <Box sx={{ flex: 1 }} />
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setCreateOpen(true)}
                        >
                            {cfl(getString('addEmployee') || 'Add Employee')}
                        </Button>
                    </Box>
                )}
                {employees.length === 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {(error as Error).message}
                    </Alert>
                )}

                <DataGrid
                    rows={filteredEmployees}
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
                isDev={isDev}
                onConfirm={(force) =>
                    employeeToDelete &&
                    deleteMutation.mutate({ id: employeeToDelete.id, force })
                }
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