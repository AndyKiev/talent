import { useMemo, useState } from 'react';
import {
    Autocomplete,
    Box,
    InputAdornment,
    Paper,
    TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid } from '@mui/x-data-grid';
import {
    createDepartmentType,
    deleteDepartmentType,
    fetchDepartmentTypes,
    updateDepartmentType,
} from './departmentTypeApi';
import { DEPARTMENT_TYPE_QK } from '../../../utils/queryKeys.ts';
import { useDepartmentTypeColumns } from './useDepartmentTypeColumns';
import { DepartmentTypeForm } from './DepartmentTypeForm';
import { useCrudGrid } from '../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../ui/CrudDialogs';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { AsyncContent } from '../../ui/AsyncContent';
import { CrudHeader } from '../../ui/CrudGridSection';

const FIELD_LABELS = { name: 'name', description: 'description' };

export function DepartmentTypeCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: DEPARTMENT_TYPE_QK,
        fetchFn: () => fetchDepartmentTypes(),
        createFn: createDepartmentType,
        updateFn: updateDepartmentType,
        deleteFn: deleteDepartmentType,
        getString,
        fieldLabels: FIELD_LABELS,
    });

    // ── Filters (name + parent department type) ─────────────────────────────
    const [filter, setFilter] = useState('');
    const [parentFilter, setParentFilter] = useState<string | null>(null);

    // ── Parent-name options (only parents that actually appear) ─────────────
    const parentOptions = useMemo(
        () =>
            Array.from(new Set(crud.rows.flatMap((r) => r.parent_names ?? []))).sort((a, b) =>
                a.localeCompare(b),
            ),
        [crud.rows],
    );

    // ── Filter by name AND parent type (both apply together) ────────────────
    const filteredRows = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return crud.rows.filter((r) => {
            const nameOk = !q || r.name.toLowerCase().includes(q);
            const parentOk =
                !parentFilter || (r.parent_names ?? []).some((p) => p === parentFilter);
            return nameOk && parentOk;
        });
    }, [crud.rows, filter, parentFilter]);

    const columns = useDepartmentTypeColumns({
        getString,
        editingState: crud.editingState,
        onEditFieldClick: crud.handleEditFieldClick,
        onRequestSave: crud.handleRequestSave,
        onCancelEdit: crud.handleCancelEdit,
        updateIsPending: crud.updateMutation.isPending,
        onToggleActive: (row) => crud.requestToggle(row, 'is_active', 'isActive', 'Active'),
        toggleIsPending: crud.updateMutation.isPending,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
    });

    return (
        <Box>
            <CrudHeader
                title={getString('departmentTypes') || 'Department Types'}
                addLabel={cfl(getString('addDepartmentType')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <AsyncContent isLoading={crud.isLoading} error={crud.error}>
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
                            paginationModel={crud.paginationModel}
                            onPaginationModelChange={crud.setPaginationModel}
                            pageSizeOptions={[5, 10, 25, 50]}
                            disableRowSelectionOnClick
                            getRowId={(row) => row.id}
                            getRowHeight={() => 'auto'}
                            localeText={crud.localeText}
                            hideFooterSelectedRowCount
                            sx={{ '& .MuiDataGrid-cell': { alignItems: 'center', py: 1 } }}
                        />
                    </Paper>
                </>
            </AsyncContent>

            <DepartmentTypeForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteDepartmentType') || 'Delete Department Type'}
                deleteMessage={getString('areYouSureDeleteDepartmentType') || `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`}
            />
        </Box>
    );
}
