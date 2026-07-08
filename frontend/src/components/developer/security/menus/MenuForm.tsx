// src/components/developer/security/menus/MenuForm.tsx
import { useEffect } from 'react';
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
    Autocomplete,
    Chip,
} from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';

import type {
    MenuAdmin,
    MenuCreate,
    MenuUpdate,
    MenuVisibilityMode,
    MutationResponse,
} from './menuAdminApi';
import { deriveMode, modeToFlags, MODE_LABEL_KEY } from './menuVisibility';
import type { UserGroup } from '../../../admin/user_groups/userGroupApi';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/helpers';

const schema = z.object({
    key: z.string().min(1, 'required').max(64, 'tooLong'),
    label_key: z.string().min(1, 'required').max(128, 'tooLong'),
    path: z.string().min(1, 'required').max(128, 'tooLong'),
    icon: z.string().max(64, 'tooLong').optional().or(z.literal('')),
    parent_id: z.number().nullable(),
    sort_order: z.number().int(),
    is_active: z.boolean(),
    visibility_mode: z.enum(['all_employees', 'all_groups', 'specific']),
    group_ids: z.array(z.number()),
});

type FormData = z.infer<typeof schema>;

const BLANK: FormData = {
    key: '',
    label_key: '',
    path: '',
    icon: '',
    parent_id: null,
    sort_order: 0,
    is_active: true,
    visibility_mode: 'all_groups',
    group_ids: [],
};

interface Props {
    open: boolean;
    onClose: () => void;
    editing: MenuAdmin | null;
    groups: UserGroup[];
    menus: MenuAdmin[];
    createMutation: UseMutationResult<MutationResponse<MenuAdmin>, Error, MenuCreate>;
    updateMutation: UseMutationResult<
        MutationResponse<MenuAdmin>,
        Error,
        { id: number; data: MenuUpdate }
    >;
}

export function MenuForm({
    open,
    onClose,
    editing,
    groups,
    menus,
    createMutation,
    updateMutation,
}: Props) {
    const getString = useString();
    const isEdit = !!editing;
    const activeMutation = isEdit ? updateMutation : createMutation;

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: BLANK,
    });

    // Reset the form whenever it opens (fresh create) or the edited row changes.
    useEffect(() => {
        if (!open) return;
        if (editing) {
            reset({
                key: editing.key,
                label_key: editing.label_key,
                path: editing.path,
                icon: editing.icon ?? '',
                parent_id: editing.parent_id,
                sort_order: editing.sort_order,
                is_active: editing.is_active,
                visibility_mode: deriveMode(editing),
                group_ids: editing.group_ids,
            });
        } else {
            reset(BLANK);
        }
    }, [open, editing, reset]);

    const mode = watch('visibility_mode') as MenuVisibilityMode;

    // Parent options: top-level items only (one nesting level), excluding self.
    const parentOptions = menus.filter(
        (m) => m.parent_id === null && m.id !== editing?.id,
    );

    const handleClose = () => {
        reset(BLANK);
        onClose();
    };

    const onSubmit = (data: FormData) => {
        const flags = modeToFlags(data.visibility_mode);
        const payload: MenuCreate = {
            key: data.key,
            label_key: data.label_key,
            path: data.path,
            icon: data.icon || null,
            parent_id: data.parent_id,
            sort_order: data.sort_order,
            is_active: data.is_active,
            visible_to_all_groups: flags.visible_to_all_groups,
            visible_to_regular: flags.visible_to_regular,
            group_ids: data.visibility_mode === 'specific' ? data.group_ids : [],
        };
        if (isEdit && editing) {
            updateMutation.mutate({ id: editing.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const errText = (key?: string) => (key ? getString(key) || key : undefined);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {isEdit
                    ? cfl(getString('editMenu')) || 'Edit Menu'
                    : cfl(getString('addMenu')) || 'Add Menu'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {activeMutation.isError && (
                        <Alert severity="error">{activeMutation.error?.message}</Alert>
                    )}

                    <TextField
                        label={cfl(getString('menuKey')) || 'Key'}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 64 } }}
                        error={!!errors.key}
                        helperText={errText(errors.key?.message)}
                        {...register('key')}
                    />

                    <TextField
                        label={cfl(getString('label')) || 'Label key'}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 128 } }}
                        error={!!errors.label_key}
                        helperText={
                            errText(errors.label_key?.message) ||
                            (getString('menuLabelKeyHint') || 'Translation key resolved via getString')
                        }
                        {...register('label_key')}
                    />

                    <TextField
                        label={cfl(getString('path')) || 'Path'}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 128 } }}
                        error={!!errors.path}
                        helperText={errText(errors.path?.message)}
                        {...register('path')}
                    />

                    <TextField
                        label={cfl(getString('icon')) || 'Icon'}
                        fullWidth
                        slotProps={{ htmlInput: { maxLength: 64 } }}
                        error={!!errors.icon}
                        helperText={errText(errors.icon?.message)}
                        {...register('icon')}
                    />

                    <Controller
                        name="parent_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth>
                                <InputLabel>{cfl(getString('parentMenu')) || 'Parent'}</InputLabel>
                                <Select
                                    variant="outlined"
                                    label={cfl(getString('parentMenu')) || 'Parent'}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(
                                            String(e.target.value) === ''
                                                ? null
                                                : Number(e.target.value),
                                        )
                                    }
                                >
                                    <MenuItem value="">
                                        <em>{getString('noParentTopLevel') || 'None (top level)'}</em>
                                    </MenuItem>
                                    {parentOptions.map((m) => (
                                        <MenuItem key={m.id} value={m.id}>
                                            {getString(m.label_key) || m.key}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    />

                    <TextField
                        label={cfl(getString('sortOrder')) || 'Sort order'}
                        type="number"
                        fullWidth
                        error={!!errors.sort_order}
                        helperText={errText(errors.sort_order?.message)}
                        {...register('sort_order', { valueAsNumber: true })}
                    />

                    {/* ── Visibility (3-mode selector) ─────────────────────── */}
                    <Controller
                        name="visibility_mode"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth>
                                <InputLabel>{cfl(getString('menuVisibility')) || 'Visible to'}</InputLabel>
                                <Select
                                    {...field}
                                    variant="outlined"
                                    label={cfl(getString('menuVisibility')) || 'Visible to'}
                                >
                                    {(['all_employees', 'all_groups', 'specific'] as MenuVisibilityMode[]).map(
                                        (m) => (
                                            <MenuItem key={m} value={m}>
                                                {getString(MODE_LABEL_KEY[m]) || m}
                                            </MenuItem>
                                        ),
                                    )}
                                </Select>
                            </FormControl>
                        )}
                    />

                    {mode === 'specific' && (
                        <Controller
                            name="group_ids"
                            control={control}
                            render={({ field }) => (
                                <Autocomplete
                                    multiple
                                    options={groups}
                                    getOptionLabel={(g) => g.name}
                                    value={groups.filter((g) => field.value.includes(g.id))}
                                    onChange={(_, selected) =>
                                        field.onChange(selected.map((g) => g.id))
                                    }
                                    isOptionEqualToValue={(o, v) => o.id === v.id}
                                    renderTags={(value, getTagProps) =>
                                        value.map((g, index) => (
                                            <Chip
                                                size="small"
                                                label={g.name}
                                                {...getTagProps({ index })}
                                                key={g.id}
                                            />
                                        ))
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={cfl(getString('groups')) || 'Groups'}
                                            placeholder={getString('selectGroups') || 'Select groups'}
                                        />
                                    )}
                                />
                            )}
                        />
                    )}

                    <FormControlLabel
                        control={
                            <Switch
                                checked={watch('is_active')}
                                onChange={(_, checked) => setValue('is_active', checked)}
                            />
                        }
                        label={cfl(getString('active')) || 'Active'}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={handleClose} disabled={activeMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={activeMutation.isPending}
                    startIcon={
                        activeMutation.isPending ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : undefined
                    }
                >
                    {isEdit ? getString('save') || 'Save' : getString('create') || 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
