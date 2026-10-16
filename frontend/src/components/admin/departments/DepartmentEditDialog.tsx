// src/components/admin/departments/DepartmentEditDialog.tsx
//
// Edit one department instance (name, category, type, active) in a dialog —
// used by the structure organigram (the tree tab edits inline instead).
// Mount it only while editing: default values come from `dept` on mount.
// Type choices = the child types of the PARENT's type (same rule as create),
// plus the current type so a department that already deviates keeps it.
import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
    Alert,
    Box,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import {
    fetchDepartmentTypes,
    type DepartmentNode,
    type DepartmentUpdate,
    type MutationResponse,
} from './departmentApi';
import { useAllowedDepartmentTypes } from './useAllowedDepartmentTypes';
import { fetchDepartmentCategories } from '../department_categories/departmentCategoryApi';
import { FormSwitch } from '../../ui/FormSwitch';
import { CrudFormActions } from '../../ui/CrudFormActions';
import { FormTextField } from '../../ui/FormTextField';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';

const schema = z.object({
    name: z.string().min(1, 'nameRequired').max(128, 'nameTooLong'),
    is_active: z.boolean(),
    department_type_id: z.number({ error: 'typeRequired' }),
    department_category_id: z.number({ error: 'categoryRequired' }),
});

type FormData = z.infer<typeof schema>;

interface Props {
    dept: DepartmentNode;
    /** Type id of the parent department (null for a root). */
    parentTypeId: number | null;
    onClose: () => void;
    updateMutation: UseMutationResult<
        MutationResponse<DepartmentNode>,
        Error,
        { id: number; data: DepartmentUpdate }
    >;
}

export function DepartmentEditDialog({ dept, parentTypeId, onClose, updateMutation }: Props) {
    const getString = useString();

    const { data: allTypes = [] } = useQuery({
        queryKey: ['department_types'],
        queryFn: fetchDepartmentTypes,
        staleTime: 5 * 60 * 1000,
    });
    const { data: categories = [] } = useQuery({
        queryKey: ['department_categories'],
        queryFn: () => fetchDepartmentCategories(),
        staleTime: 5 * 60 * 1000,
    });
    const { allowedTypes, isLoading: typesLoading } = useAllowedDepartmentTypes(parentTypeId, allTypes);
    const typeOptions = useMemo(
        () =>
            allowedTypes.some((t) => t.id === dept.department_type_id) || !dept.department_type
                ? allowedTypes
                : [dept.department_type, ...allowedTypes],
        [allowedTypes, dept],
    );

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: dept.name,
            is_active: dept.is_active,
            department_type_id: dept.department_type_id,
            department_category_id: dept.department_category_id,
        },
    });

    const onSubmit = (data: FormData) => updateMutation.mutate({ id: dept.id, data });

    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('editDepartment'))}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {updateMutation.isError && <Alert severity="error">{updateMutation.error?.message}</Alert>}
                    <FormTextField
                        label={cfl(getString('name'))}
                        getString={getString}
                        maxLength={128}
                        fieldError={errors.name}
                        {...register('name')}
                    />
                    <Controller
                        name="department_category_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.department_category_id}>
                                <InputLabel>{cfl(getString('departmentCategory'))}</InputLabel>
                                <Select
                                    variant="outlined"
                                    {...field}
                                    value={field.value ?? ''}
                                    label={cfl(getString('departmentCategory'))}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                >
                                    {categories.map((c) => (
                                        <MenuItem key={c.id} value={c.id}>
                                            {c.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.department_category_id && (
                                    <FormHelperText>
                                        {getString(errors.department_category_id.message ?? '')}
                                    </FormHelperText>
                                )}
                            </FormControl>
                        )}
                    />
                    <Controller
                        name="department_type_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.department_type_id} disabled={typesLoading}>
                                <InputLabel>{cfl(getString('departmentType'))}</InputLabel>
                                <Select
                                    variant="outlined"
                                    {...field}
                                    value={field.value ?? ''}
                                    label={cfl(getString('departmentType'))}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    startAdornment={
                                        typesLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : undefined
                                    }
                                >
                                    {typeOptions.map((t) => (
                                        <MenuItem key={t.id} value={t.id}>
                                            {t.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.department_type_id && (
                                    <FormHelperText>{getString(errors.department_type_id.message ?? '')}</FormHelperText>
                                )}
                            </FormControl>
                        )}
                    />
                    <FormSwitch name="is_active" control={control} label={cfl(getString('isActive'))} />
                </Box>
            </DialogContent>
            <CrudFormActions
                getString={getString}
                onCancel={onClose}
                onSubmit={handleSubmit(onSubmit)}
                isPending={updateMutation.isPending}
            />
        </Dialog>
    );
}
