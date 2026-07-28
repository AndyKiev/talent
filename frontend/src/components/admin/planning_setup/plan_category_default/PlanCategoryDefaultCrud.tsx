// src/components/admin/planning_setup/plan_category_default/PlanCategoryDefaultCrud.tsx
import {
    Box,
    Button,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import {
    fetchPlanCategoryDefaults,
    createPlanCategoryDefault,
    deletePlanCategoryDefault,
} from '../planningSetupApi';
import { usePlanCategoryDefaultColumns } from './usePlanCategoryDefaultColumns';
import { PlanCategoryDefaultForm } from './PlanCategoryDefaultForm';
import { useCrudGrid } from '../../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../../ui/CrudDialogs';
import { PLAN_CATEGORY_DEFAULT_QK } from '../../../../utils/queryKeys.ts';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';
import cfl from '../../../../utils/helpers.ts';
import { CrudDataGrid } from '../../../ui/CrudGridSection';

const dummyUpdate: (vars: { id: number; data: Record<string, unknown> }) => Promise<{ detail: string }> = () =>
    Promise.resolve({ detail: 'Not applicable' });

export function PlanCategoryDefaultCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: PLAN_CATEGORY_DEFAULT_QK,
        fetchFn: fetchPlanCategoryDefaults,
        createFn: createPlanCategoryDefault,
        updateFn: dummyUpdate,
        deleteFn: deletePlanCategoryDefault,
        getString,
    });

    // Category name label for the delete confirmation.
    const deleteLabel = crud.rowToDelete
        ? crud.rowToDelete.department_category?.name ?? `#${crud.rowToDelete.department_category_id}`
        : '';

    const columns = usePlanCategoryDefaultColumns({
        getString,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
    });

    const existingCategoryIds = crud.rows.map((r) => r.department_category_id);

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('planCategoryDefaults') || 'Default Planning Categories'}
                </Typography>
                <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddIcon />}
                    onClick={() => crud.setFormOpen(true)}
                >
                    {cfl(getString('add')) || 'Add'}
                </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {getString('planCategoryDefaultsHint') ||
                    'Department categories used to resolve which departments a new session plans for. Changes apply to future sessions only.'}
            </Typography>

            <CrudDataGrid crud={crud} columns={columns} />

            <PlanCategoryDefaultForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                existingCategoryIds={existingCategoryIds}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('removePlanCategoryDefault') || 'Remove Planning Category'}
                deleteMessage={getString('areYouSureRemovePlanCategoryDefault', { name: deleteLabel }) || `Remove "${deleteLabel}" from planning defaults? Future sessions will no longer include it.`}
                withFieldEdit={false}
            />
        </Box>
    );
}
