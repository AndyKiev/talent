// src/components/admin/hrm_scopes/HrmScopeDeleteDialog.tsx
import type { HrmScope } from './hrmScopeApi';
import type { GetStringFn } from '../../../types/getStringFn';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';

interface Props {
    open: boolean;
    scope: HrmScope | null;
    pending: boolean;
    getString: GetStringFn;
    onConfirm: () => void;
    onClose: () => void;
}

export function HrmScopeDeleteDialog({ open, scope, pending, getString, onConfirm, onClose }: Props) {
    return (
        <ConfirmDeleteDialog
            open={open}
            title={getString('removeScopeDepartment') || 'Remove department from scope'}
            message={
                getString('removeScopeConfirm', { name: scope?.department_name || '' }) ||
                `Remove "${scope?.department_name ?? ''}" from this scope?`
            }
            confirmLabel={getString('remove') || 'Remove'}
            isDeleting={pending}
            onConfirm={onConfirm}
            onClose={onClose}
        />
    );
}
