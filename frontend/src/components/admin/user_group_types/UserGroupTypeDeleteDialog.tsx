// src/components/admin/user_group_types/UserGroupTypeDeleteDialog.tsx
import {
    Alert,
} from '@mui/material';
import type { UserGroupType } from './userGroupTypeApi';
import useString from '../../../hooks/useString';
import ConfirmDeleteDialog from '../../ui/ConfirmDeleteDialog';

interface Props {
    row: UserGroupType | null;
    isPending: boolean;
    hasGroups?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function UserGroupTypeDeleteDialog({ row, isPending, hasGroups = false, onConfirm, onCancel }: Props) {
    const getString = useString();

    const hasGroupsWarning = hasGroups && row?.groups && row.groups.length > 0;

    return (
        <ConfirmDeleteDialog
            open={!!row}
            title={getString('deleteUserGroupType') || 'Delete User Group Type'}
            message={
                getString('areYouSureDeleteUserGroupType') ||
                `Are you sure you want to delete "${row?.name}"? This action cannot be undone.`
            }
            isDeleting={isPending}
            onConfirm={onConfirm}
            onClose={onCancel}
            children={
                hasGroupsWarning ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {getString('userGroupTypeHasGroups') ||
                            `This type is used by ${row?.groups?.length} group(s). Deleting it may affect these groups.`}
                    </Alert>
                ) : undefined
            }
        />
    );
}
