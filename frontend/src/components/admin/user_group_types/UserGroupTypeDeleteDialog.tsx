// src/components/admin/user_group_types/UserGroupTypeDeleteDialog.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    CircularProgress,
    Alert,
} from '@mui/material';
import type { UserGroupType } from './userGroupTypeApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

interface Props {
    row: UserGroupType | null;
    isPending: boolean;
    hasGroups?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function UserGroupTypeDeleteDialog({ row, isPending, hasGroups = false, onConfirm, onCancel }: Props) {
    const getString = useString({ str });

    const hasGroupsWarning = hasGroups && row?.groups && row.groups.length > 0;

    return (
        <Dialog open={!!row} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>{getString('deleteUserGroupType') || 'Delete User Group Type'}</DialogTitle>
            <DialogContent>
                {hasGroupsWarning && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {getString('userGroupTypeHasGroups') ||
                            `This type is used by ${row?.groups?.length} group(s). Deleting it may affect these groups.`}
                    </Alert>
                )}
                <Typography variant="body2">
                    {getString('areYouSureDeleteUserGroupType') ||
                        `Are you sure you want to delete "${row?.name}"? This action cannot be undone.`}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onCancel} disabled={isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={onConfirm}
                    disabled={isPending}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('delete') || 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}