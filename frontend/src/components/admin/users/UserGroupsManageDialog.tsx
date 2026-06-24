// src/components/admin/users/UserGroupsManageDialog.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Box,
    Chip,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Typography,
    Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { fetchUserGroups } from '../user-groups/userGroupApi';
import type { EmployeeWithGroups, GroupOfType } from './employeeUserGroupApi';
import { fetchLinkDeletionPreview } from './employeeUserGroupApi';
import { useEmployeeUserGroupMutations } from './useEmployeeUserGroupMutations';
import { USER_GROUP_QK } from '../../../utils/queryKeys.ts';
import type { GetStringFn } from '../../../types/getStringFn';
import type { SnackbarType } from '../../../types/types.ts';
import cfl from '../../../utils/helpers.ts';

interface Props {
    open: boolean;
    employee: EmployeeWithGroups | null;
    typeId: number | null;
    typeName: string | null;
    getString: GetStringFn;
    setSnackbar: (s: SnackbarType) => void;
    onClose: () => void;
}

export function UserGroupsManageDialog({
    open,
    employee,
    typeId,
    typeName,
    getString,
    setSnackbar,
    onClose,
}: Props) {
    const { data: allGroups = [], isLoading } = useQuery({
        queryKey: USER_GROUP_QK,
        queryFn: fetchUserGroups,
        enabled: open,
        staleTime: 2 * 60 * 1000,
    });

    const { linkMutation, unlinkMutation } = useEmployeeUserGroupMutations({
        setSnackbar,
        deleteSuccessMessage: getString('employeeUserGroupRemoved') || 'Group removed',
    });

    // Groups of the chosen type only
    const groupsOfType = useMemo(
        () => allGroups.filter((g) => g.user_group_type_id === typeId),
        [allGroups, typeId],
    );

    // Currently attached (of this type) for this employee
    const attached = useMemo(
        () => (employee ? employee.groups.filter((g) => g.user_group_type_id === typeId) : []),
        [employee, typeId],
    );
    const attachedGroupIds = useMemo(
        () => new Set(attached.map((g) => g.group_id)),
        [attached],
    );

    const available = useMemo(
        () => groupsOfType.filter((g) => !attachedGroupIds.has(g.id)),
        [groupsOfType, attachedGroupIds],
    );

    // Pending cascade confirmation: the group we're about to unlink + how many
    // HRM scopes will be cascade-deleted along with it.
    const [cascadeConfirm, setCascadeConfirm] = useState<{
        group: GroupOfType;
        scopeCount: number;
    } | null>(null);
    const [checkingLinkId, setCheckingLinkId] = useState<number | null>(null);

    const handleLink = (groupId: number) => {
        if (!employee) return;
        linkMutation.mutate({ employee_id: employee.id, user_group_id: groupId });
    };

    const handleUnlink = async (group: GroupOfType) => {
        // Ask the backend what this removal will cascade-delete first.
        setCheckingLinkId(group.link_id);
        try {
            const preview = await fetchLinkDeletionPreview(group.link_id);
            if (preview.hrm_scope_count > 0) {
                setCascadeConfirm({ group, scopeCount: preview.hrm_scope_count });
                return;
            }
            unlinkMutation.mutate(group.link_id);
        } catch (err) {
            setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
        } finally {
            setCheckingLinkId(null);
        }
    };

    const confirmCascade = () => {
        if (!cascadeConfirm) return;
        unlinkMutation.mutate(cascadeConfirm.group.link_id, {
            onSuccess: () => setCascadeConfirm(null),
        });
    };

    const busy =
        linkMutation.isPending ||
        unlinkMutation.isPending ||
        checkingLinkId !== null;

    return (
        <>
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {cfl(typeName || '')} — {employee?.name ?? ''}
            </DialogTitle>
            <DialogContent dividers>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                {getString('attachedGroups') || 'Attached groups'}
                            </Typography>
                            {attached.length === 0 ? (
                                <Typography variant="body2" color="text.disabled">
                                    {getString('noGroupsAttached') || 'No groups attached'}
                                </Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {attached.map((g) => (
                                        <Chip
                                            key={g.link_id}
                                            label={g.group_name}
                                            size="small"
                                            onDelete={busy ? undefined : () => handleUnlink(g)}
                                            deleteIcon={<DeleteIcon />}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                {getString('availableGroups') || 'Available groups'}
                            </Typography>
                            {available.length === 0 ? (
                                <Typography variant="body2" color="text.disabled">
                                    {getString('noGroupsAvailable') || 'No groups available'}
                                </Typography>
                            ) : (
                                <List dense disablePadding>
                                    {available.map((g) => (
                                        <ListItem
                                            key={g.id}
                                            secondaryAction={
                                                <Tooltip title={getString('assignGroup') || 'Assign'}>
                                                    <span>
                                                        <IconButton
                                                            edge="end"
                                                            size="small"
                                                            disabled={busy}
                                                            onClick={() => handleLink(g.id)}
                                                        >
                                                            <AddIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            }
                                        >
                                            <ListItemText
                                                primary={g.name}
                                                secondary={g.description || undefined}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{getString('close') || 'Close'}</Button>
            </DialogActions>
        </Dialog>

        {/* Reconfirm: removing the HRM group cascade-deletes the HRM's scopes */}
        <Dialog
            open={!!cascadeConfirm}
            onClose={() => setCascadeConfirm(null)}
            maxWidth="xs"
            fullWidth
        >
            <DialogTitle>{getString('removeGroupTitle') || 'Remove group'}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {getString('removeHrmGroupCascade', {
                        group: cascadeConfirm?.group.group_name || '',
                        count: cascadeConfirm?.scopeCount ?? 0,
                    }) ||
                        `Removing "${cascadeConfirm?.group.group_name ?? ''}" will also permanently delete ${cascadeConfirm?.scopeCount ?? 0} supervision scope(s). Continue?`}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setCascadeConfirm(null)} disabled={unlinkMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    color="error"
                    variant="contained"
                    onClick={confirmCascade}
                    disabled={unlinkMutation.isPending}
                >
                    {unlinkMutation.isPending
                        ? <CircularProgress size={22} />
                        : getString('removeAnyway') || 'Remove anyway'}
                </Button>
            </DialogActions>
        </Dialog>
        </>
    );
}
