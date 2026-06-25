// src/components/admin/user_group_types/UserGroupTypeSelectDialog.tsx
import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Box,
    Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchUserGroupTypes, type UserGroupType } from './userGroupTypeApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import {USER_GROUP_TYPE_QK} from "../../../utils/queryKeys.ts";

interface Props {
    group: { id: number; user_group_type_id?: number; name?: string } | null;
    isPending: boolean;
    onConfirm: (groupId: number, newTypeId: number) => void;
    onCancel: () => void;
}

export function UserGroupTypeSelectDialog({ group, isPending, onConfirm, onCancel }: Props) {
    const getString = useString({ str });
    const [selectedTypeId, setSelectedTypeId] = useState<number | ''>(group?.user_group_type_id ?? '');

    const { data: groupTypes = [], isLoading } = useQuery({
        queryKey: USER_GROUP_TYPE_QK,
        queryFn: fetchUserGroupTypes,
        staleTime: 5 * 60 * 1000,
        enabled: !!group,
    });

    const handleConfirm = () => {
        if (group && selectedTypeId !== '') {
            onConfirm(group.id, selectedTypeId as number);
        }
    };

    return (
        <Dialog open={!!group} onClose={onCancel} maxWidth="xs" fullWidth>
            <DialogTitle>
                {getString('changeUserGroupType') || 'Change Group Type'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {getString('selectTypeForGroup') || `Select a type for "${group?.name || 'group'}"`}
                    </Typography>
                    <FormControl fullWidth size="small">
                        <InputLabel>{getString('userGroupType') || 'Group Type'}</InputLabel>
                        <Select
                            variant={"outlined"}
                            value={selectedTypeId}
                            onChange={(e) => setSelectedTypeId(e.target.value as number)}
                            label={getString('userGroupType') || 'Group Type'}
                            disabled={isLoading || isPending}
                        >
                            {isLoading ? (
                                <MenuItem disabled>
                                    <CircularProgress size={20} />
                                </MenuItem>
                            ) : (
                                groupTypes.map((type: UserGroupType) => (
                                    <MenuItem key={type.id} value={type.id}>
                                        {type.name}
                                    </MenuItem>
                                ))
                            )}
                        </Select>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onCancel} disabled={isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={isPending || selectedTypeId === '' || isLoading}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('confirm') || 'Confirm'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}