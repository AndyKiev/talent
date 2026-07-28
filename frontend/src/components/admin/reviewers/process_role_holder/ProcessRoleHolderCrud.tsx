import {
    Box,
} from '@mui/material';
import {
    createProcessRoleHolder,
    deleteProcessRoleHolder,
    fetchProcessRoleHolders,
} from './processRoleHolderApi';
import { PROCESS_ROLE_HOLDER_QK } from '../../../../utils/queryKeys';
import { useProcessRoleHolderColumns } from './useProcessRoleHolderColumns';
import { ProcessRoleHolderForm } from './ProcessRoleHolderForm';
import { useCrudGrid } from '../../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../../ui/CrudDialogs';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/capitalizeFirstLetter';
import { CrudDataGrid, CrudHeader } from '../../../ui/CrudGridSection';

// The process‑role‑holder slice has no update endpoint; provide a type‑safe
// stub so that the shared hook stays satisfied. It will never be called
// because the columns have no inline editing.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const updateProcessRoleHolder = async (_vars: { id: number; data: Record<string, unknown> }) =>
    ({ detail: 'ok' });

export function ProcessRoleHolderCrud() {
    const getString = useString();

    const crud = useCrudGrid({
        queryKey: PROCESS_ROLE_HOLDER_QK,
        fetchFn: () => fetchProcessRoleHolders(),
        createFn: createProcessRoleHolder,
        updateFn: updateProcessRoleHolder,
        deleteFn: deleteProcessRoleHolder,
        getString,
    });

    const columns = useProcessRoleHolderColumns({
        getString,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
    });

    const deleteWho = crud.rowToDelete
        ? (crud.rowToDelete.holder_name || crud.rowToDelete.holder_code || '')
        : '';

    return (
        <Box>
            <CrudHeader
                title={getString('reviewers') || 'Reviewers'}
                addLabel={cfl(getString('addReviewer')) || 'Add'}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <ProcessRoleHolderForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('removeReviewer') || 'Remove Reviewer'}
                deleteMessage={
                    getString('areYouSureRemoveReviewer', { employee: deleteWho }) ||
                    `Remove reviewer "${deleteWho}"?`
                }
                withFieldEdit={false}
            />
        </Box>
    );
}
