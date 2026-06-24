// src/components/admin/department_types/DepartmentTypeCrud.tsx
import React, { useCallback, useMemo, useState } from 'react';
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
import { fetchDepartmentTypes, type DepartmentType } from './departmentTypeApi';
import { useDepartmentTypeMutations } from './useDepartmentTypeMutations';
import { DEPARTMENT_TYPE_QK } from '../../../utils/queryKeys.ts';
import { useDepartmentTypeColumns, type EditingState } from './useDepartmentTypeColumns';
import { DepartmentTypeForm } from './DepartmentTypeForm';
import { DepartmentTypeEditDialog, type PendingEdit } from './DepartmentTypeEditDialog';
import { DepartmentTypeDeleteDialog } from './DepartmentTypeDeleteDialog';
import { useDataGridLocale } from '../../../hooks/useDataGridLocale';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from "../../../utils/helpers.ts";


export function DepartmentTypeCrud() {
    const getString = useString({ str });

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error',
    });

    const [formOpen, setFormOpen] = useState(false);
    const [editingState, setEditingState] = useState<EditingState>({ userId: null, field: null });
    const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
    const [rowToDelete, setRowToDelete] = useState<DepartmentType | null>(null);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

    // ── Filters (name + parent department type) ─────────────────────────────
    const [filter, setFilter] = useState('');
    const [parentFilter, setParentFilter] = useState<string | null>(null);

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: DEPARTMENT_TYPE_QK,
        queryFn: () => fetchDepartmentTypes(),
        staleTime: 2 * 60 * 1000,
    });

    // ── Parent-name options (only parents that actually appear) ─────────────
    const parentOptions = useMemo(
        () =>
            Array.from(new Set(rows.flatMap((r) => r.parent_names ?? []))).sort((a, b) =>
                a.localeCompare(b),
            ),
        [rows],
    );

    // ── Filter by name AND parent type (both apply together) ────────────────
    const filteredRows = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return rows.filter((r) => {
            const nameOk = !q || r.name.toLowerCase().includes(q);
            const parentOk =
                !parentFilter || (r.parent_names ?? []).some((p) => p === parentFilter);
            return nameOk && parentOk;
        });
    }, [rows, filter, parentFilter]);

    const { createMutation, updateMutation, deleteMutation } = useDepartmentTypeMutations({
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

    const handleEditFieldClick = useCallback(
        (row: DepartmentType, field: string, e: React.MouseEvent) => {
            e.stopPropagation();
            setEditingState({ userId: row.id, field });
        },
        [],
    );

    const handleRequestSave = useCallback(
        (row: DepartmentType, field: string, newValue: string) => {
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

    const handleToggleActive = useCallback(
        (row: DepartmentType) => {
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

    const handleDeleteClick = useCallback((row: DepartmentType) => {
        setRowToDelete(row);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (!rowToDelete) return;
        deleteMutation.mutate(rowToDelete.id);
    }, [rowToDelete, deleteMutation]);

    const columns = useDepartmentTypeColumns({
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
                    {getString('departmentTypes') || 'Department Types'}
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => setFormOpen(true)}
                >
                    {cfl(getString('addDepartmentType')) || 'Add'}
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
                <>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
                        <TextField
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder={getString('filterByDepartmentTypeName') || 'Filter by department type name…'}
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
                            value={parentFilter}
                            onChange={(_, newValue) => setParentFilter(newValue)}
                            options={parentOptions}
                            size="small"
                            fullWidth
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder={getString('filterByParentDepartmentType') || 'Filter by parent type…'}
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

            <DepartmentTypeForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                createMutation={createMutation}
            />

            <DepartmentTypeEditDialog
                pending={pendingEdit}
                isPending={updateMutation.isPending}
                onConfirm={handleConfirmEdit}
                onCancel={handleCancelPending}
            />

            <DepartmentTypeDeleteDialog
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