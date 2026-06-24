// src/components/admin/user-groups/UserGroupForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    Alert,
    CircularProgress,
    FormControlLabel,
    Switch,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    FormHelperText,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { fetchUserGroupTypes } from '../user-group-types/userGroupTypeApi';
import type { UserGroupCreate, MutationResponse, UserGroup } from './userGroupApi';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {USER_GROUP_TYPE_QK} from "../../../utils/queryKeys.ts";

const schema = z.object({
    name: z.string().min(3, 'nameTooShort').max(128, 'nameTooLong'),
    description: z.string().max(256, 'descriptionTooLong').optional().or(z.literal('')),
    is_protected: z.boolean(),
    user_group_type_id: z.number({ error: 'groupTypeRequired' }).min(1, 'groupTypeRequired'),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<UserGroup>, Error, UserGroupCreate>;
}

export function UserGroupForm({ open, onClose, createMutation }: Props) {
    const getString = useString({ str });

    const { data: groupTypes = [] } = useQuery({
        queryKey: USER_GROUP_TYPE_QK,
        queryFn: fetchUserGroupTypes,
        staleTime: 5 * 60 * 1000,
        enabled: open,
    });

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
        watch,
        setValue,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', description: '', is_protected: false, user_group_type_id: 0 },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            name: data.name,
            description: data.description || null,
            is_protected: data.is_protected,
            user_group_type_id: data.user_group_type_id,
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('createUserGroup')) || 'Create Group'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}

                    <TextField
                        label={cfl(getString('name')) || 'Name'}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 128 } }}
                        error={!!errors.name}
                        helperText={
                            errors.name?.message &&
                            (getString(errors.name.message) || errors.name.message)
                        }
                        {...register('name')}
                    />

                    <TextField
                        label={cfl(getString('description')) || 'Description'}
                        fullWidth
                        multiline
                        minRows={2}
                        slotProps={{ htmlInput: { maxLength: 256 } }}
                        error={!!errors.description}
                        helperText={
                            errors.description?.message &&
                            (getString(errors.description.message) || errors.description.message)
                        }
                        {...register('description')}
                    />

                    <Controller
                        name="user_group_type_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.user_group_type_id}>
                                <InputLabel>{cfl(getString('groupType')) || 'Group Type'}</InputLabel>
                                <Select
                                    {...field}
                                    label={cfl(getString('groupType')) || 'Group Type'}
                                    value={field.value || ''}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                >
                                    {groupTypes.map((t) => (
                                        <MenuItem key={t.id} value={t.id}>
                                            {t.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.user_group_type_id && (
                                    <FormHelperText>
                                        {getString(errors.user_group_type_id.message ?? '') ||
                                            errors.user_group_type_id.message}
                                    </FormHelperText>
                                )}
                            </FormControl>
                        )}
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={watch('is_protected')}
                                onChange={(_, checked) => setValue('is_protected', checked)}
                            />
                        }
                        label={cfl(getString('isProtected')) || 'Protected'}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={handleClose} disabled={createMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={createMutation.isPending}
                    startIcon={
                        createMutation.isPending ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : undefined
                    }
                >
                    {getString('create') || 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}