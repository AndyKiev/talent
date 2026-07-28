// src/components/admin/talent-status-period-links/TalentStatusPeriodLinkCrud.tsx
import {
    Box,
} from '@mui/material';
import {
    fetchTalentStatusPeriodLinks,
    createTalentStatusPeriodLink,
    updateTalentStatusPeriodLink,
    deleteTalentStatusPeriodLink,
} from './talentStatusPeriodLinkApi';
import { useTalentStatusPeriodLinkColumns } from './useTalentStatusPeriodLinkColumns';
import { TalentStatusPeriodLinkForm } from './TalentStatusPeriodLinkForm';
import { useCrudGrid } from '../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../ui/CrudDialogs';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import { TSPL_QK } from '../../../utils/queryKeys.ts';
import { CrudDataGrid, CrudHeader } from '../../ui/CrudGridSection';

export function TalentStatusPeriodLinkCrud() {
    const getString = useString({ str });

    const crud = useCrudGrid({
        queryKey: TSPL_QK,
        fetchFn: () => fetchTalentStatusPeriodLinks(),
        createFn: createTalentStatusPeriodLink,
        updateFn: updateTalentStatusPeriodLink,
        deleteFn: deleteTalentStatusPeriodLink,
        getString,
        pageSize: 30,
    });

    const columns = useTalentStatusPeriodLinkColumns({
        getString,
        onToggleActive: (row) => crud.requestToggle(row, 'is_active', 'isActive', 'Active'),
        toggleIsPending: crud.updateMutation.isPending,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
    });

    return (
        <Box>
            <CrudHeader
                title={getString('talentStatusPeriodLinks') || 'Status–Period Links'}
                addLabel={cfl(getString('addLink')) || 'Add Link'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns}
                pageSizeOptions={[30, 50]} />

            <TalentStatusPeriodLinkForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deleteTalentStatusPeriodLink') || 'Delete Talent Status Period Link'}
                deleteMessage={getString('areYouSureDeleteTalentStatusPeriodLink') || `Are you sure you want to delete this link? This action cannot be undone.`}
            />
        </Box>
    );
}
