// src/components/admin/planning_setup/plan_scope_default/PlanScopeDefaultCrud.tsx
import {
    Box,
    Button,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import {
    fetchPlanScopeDefaults,
    createPlanScopeDefault,
    deletePlanScopeDefault,
} from '../planningSetupApi';
import { usePlanScopeDefaultColumns } from './usePlanScopeDefaultColumns';
import { PlanScopeDefaultForm } from './PlanScopeDefaultForm';
import { useCrudGrid } from '../../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../../ui/CrudDialogs';
import { PLAN_SCOPE_DEFAULT_QK } from '../../../../utils/queryKeys.ts';
import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';
import cfl from '../../../../utils/helpers.ts';
import { CrudDataGrid } from '../../../ui/CrudGridSection';

const dummyUpdate: (vars: { id: number; data: Record<string, unknown> }) => Promise<{ detail: string }> = () =>
    Promise.resolve({ detail: 'Not applicable' });

export function PlanScopeDefaultCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: PLAN_SCOPE_DEFAULT_QK,
        fetchFn: fetchPlanScopeDefaults,
        createFn: createPlanScopeDefault,
        updateFn: dummyUpdate,
        deleteFn: deletePlanScopeDefault,
        getString,
    });

    // "<job group> / <talent status>" label for the delete confirmation.
    const deleteLabel = crud.rowToDelete
        ? `${crud.rowToDelete.job_group?.name ?? `#${crud.rowToDelete.job_group_id}`} / ${
              crud.rowToDelete.talent_status ? crud.rowToDelete.talent_status.key : getString('combinedOption') || 'Combined (all)'
          }`
        : '';

    const columns = usePlanScopeDefaultColumns({
        getString,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
    });

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
                    {getString('planScopeDefaults') || 'Default Scope Profiles'}
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
                {getString('planScopeDefaultsHint') ||
                    'Job group + talent-status profiles that define the granularity of each plan. Changes apply to future sessions only.'}
            </Typography>

            <CrudDataGrid crud={crud} columns={columns} />

            <PlanScopeDefaultForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('removePlanScopeDefault') || 'Remove Scope Profile'}
                deleteMessage={getString('areYouSureRemovePlanScopeDefault', { name: deleteLabel }) || `Remove "${deleteLabel}" from planning defaults? Future sessions will no longer include it.`}
                withFieldEdit={false}
            />
        </Box>
    );
}
