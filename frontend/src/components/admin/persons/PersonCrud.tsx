import { useCallback, useState } from 'react';
import {
    Box,
} from '@mui/material';
import { fetchPersons, createPerson, updatePerson, deletePerson, type Person } from './personApi';
import { usePersonColumns } from './usePersonColumns';
import { PersonForm } from './PersonForm';
import { PersonEditDialog } from './PersonEditDialog';
import { useCrudGrid } from '../../../hooks/useCrudGrid';
import { CrudDialogs } from '../../ui/CrudDialogs';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import { PERSON_QK } from '../../../utils/queryKeys.ts';
import { CrudDataGrid, CrudHeader } from '../../ui/CrudGridSection';

export function PersonCrud() {
    const getString = useString();

    const [rowToEdit, setRowToEdit] = useState<Person | null>(null);
    const handleEditClick = useCallback((row: Person) => setRowToEdit(row), []);

    const crud = useCrudGrid({
        queryKey: PERSON_QK,
        fetchFn: fetchPersons,
        createFn: createPerson,
        updateFn: updatePerson,
        deleteFn: deletePerson,
        getString,
    });

    const columns = usePersonColumns({
        getString,
        onEditClick: handleEditClick,
        onDeleteClick: crud.handleDeleteClick,
        deleteIsPending: crud.deleteMutation.isPending,
    });

    return (
        <Box>
            <CrudHeader
                title={cfl(getString('persons') || 'Persons')}
                addLabel={cfl(getString('addPerson') || 'Add person')}
                onAdd={() => crud.setFormOpen(true)}
            />

            <CrudDataGrid crud={crud} columns={columns} />

            <PersonForm
                open={crud.formOpen}
                onClose={() => crud.setFormOpen(false)}
                createMutation={crud.createMutation}
            />

            <PersonEditDialog
                person={rowToEdit}
                onClose={() => setRowToEdit(null)}
                updateMutation={crud.updateMutation}
            />

            <CrudDialogs
                crud={crud}
                deleteTitle={getString('deletePerson') || 'Delete Person'}
                deleteMessage={getString('areYouSureDeletePerson') || 'Are you sure you want to delete this person?'}
            />
        </Box>
    );
}
