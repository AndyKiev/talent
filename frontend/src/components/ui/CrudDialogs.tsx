// src/components/ui/CrudDialogs.tsx
import { Alert, Snackbar } from '@mui/material';
import { FieldEditConfirmDialog, type PendingEdit } from './FieldEditConfirmDialog';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import type { SnackbarType } from '../../types/types.ts';

/**
 * Structural view of what useCrudGrid returns — declared instead of imported so
 * this component stays free of the hook's generics.
 */
export interface CrudDialogsState {
    pendingEdit: PendingEdit | null;
    rowToDelete: unknown;
    snackbar: SnackbarType;
    updateMutation: { isPending: boolean };
    deleteMutation: { isPending: boolean };
    handleConfirmEdit: () => void;
    handleCancelPending: () => void;
    handleConfirmDelete: () => void;
    setRowToDelete: (row: null) => void;
    closeSnackbar: () => void;
}

interface CrudDialogsProps {
    crud: CrudDialogsState;
    deleteTitle: string;
    deleteMessage: string;
    /** Slices without inline cell editing pass false. */
    withFieldEdit?: boolean;
}

/**
 * The tail every admin CRUD page ends with: the inline-edit confirm dialog, the
 * delete confirm dialog and the snackbar. Identical in ~24 files apart from the
 * two delete strings.
 */
export function CrudDialogs({ crud, deleteTitle, deleteMessage, withFieldEdit = true }: CrudDialogsProps) {
    return (
        <>
            {withFieldEdit && (
                <FieldEditConfirmDialog
                    pending={crud.pendingEdit}
                    isPending={crud.updateMutation.isPending}
                    onConfirm={crud.handleConfirmEdit}
                    onCancel={crud.handleCancelPending}
                />
            )}

            <ConfirmDeleteDialog
                open={!!crud.rowToDelete}
                title={deleteTitle}
                message={deleteMessage}
                isDeleting={crud.deleteMutation.isPending}
                onConfirm={crud.handleConfirmDelete}
                onClose={() => crud.setRowToDelete(null)}
            />

            <Snackbar
                open={crud.snackbar.open}
                autoHideDuration={6000}
                onClose={crud.closeSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={crud.snackbar.severity}
                    onClose={crud.closeSnackbar}
                    sx={{ width: '100%' }}
                >
                    {crud.snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
}
