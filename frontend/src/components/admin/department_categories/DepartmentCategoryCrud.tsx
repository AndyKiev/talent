// src/components/admin/department_categories/DepartmentCategoryCrud.tsx
import {
    Box,
} from '@mui/material';
import {
    createDepartmentCategory,
    deleteDepartmentCategory,
    fetchDepartmentCategories,
    updateDepartmentCategory,
    type DepartmentCategory,
} from './departmentCategoryApi';
import { useDepartmentCategoryColumns } from './useDepartmentCategoryColumns';
import { useArrowReorder } from '../../../hooks/useArrowReorder';
import { useCrudGrid } from '../../../hooks/useCrudGrid';
import { DepartmentCategoryForm } from './DepartmentCategoryForm';
import { CrudDialogs } from '../../ui/CrudDialogs';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {DEPARTMENT_CATEGORY_QK} from "../../../utils/queryKeys.ts";
import { CrudDataGrid, CrudHeader } from '../../ui/CrudGridSection';

// Display in the admin-defined order (sort_order, id tiebreak). Module-level so
// its identity stays stable — an inline arrow would re-sort on every render.
const bySortOrder = (a: DepartmentCategory, b: DepartmentCategory) =>
    (a.sort_order - b.sort_order) || (a.id - b.id);

const FIELD_LABELS = { name: 'name', key: 'key', description: 'description' };

export function DepartmentCategoryCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: DEPARTMENT_CATEGORY_QK,
        fetchFn: () => fetchDepartmentCategories(),
        createFn: createDepartmentCategory,
        updateFn: updateDepartmentCategory,
        deleteFn: deleteDepartmentCategory,
        getString,
        fieldLabels: FIELD_LABELS,
        compare: bySortOrder,
    });

    // Shared up/down-arrow reordering — stays here, it needs the slice's own
    // sort_order patch.
    const { orderColumn } = useArrowReorder<DepartmentCategory>({
        rows: crud.rows,
        updateSortOrder: (id, sort_order) => updateDepartmentCategory({ id, data: { sort_order } }),
        invalidateKeys: [DEPARTMENT_CATEGORY_QK],
        getString,
        onError: (message) => crud.setSnackbar({ open: true, message, severity: 'error' }),
    });

    const columns = useDepartmentCategoryColumns({
        getString,
        editingState: crud.editingState,
        onEditFieldClick: crud.handleEditFieldClick,
        onRequestSave: crud.handleRequestSave,
        onCancelEdit: crud.handleCancelEdit,
        updateIsPending: crud.updateMutation.isPending,
        onToggleActive: (row) => crud.requestToggle(row, 'is_active', 'isActive', 'Active'),
        onToggleMain: (row) => crud.requestToggle(row, 'is_main', 'isMain', 'Main'),
        onToggleResponsibility: (row) =>
            crud.requestToggle(row, 'is_responsibility', 'isResponsibility', 'Responsibility list'),
        toggleIsPending: crud.updateMutation.isPending,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
        orderColumn,
    });

    return (
        <Box>
            <CrudHeader
                title={getString('departmentCategories') || 'Department Categories'}
                addLabel={cfl(getString('addDepartmentCategory')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <DepartmentCategoryForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteDepartmentCategory') || 'Delete Department Category'}
                deleteMessage={getString('areYouSureDeleteDepartmentCategory') || `Are you sure you want to delete "${crud.rowToDelete?.name}"? This action cannot be undone.`}
            />
        </Box>
    );
}
