// src/components/admin/planning_setup/plan_category_default/PlanCategoryDefaultForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Alert,
    CircularProgress,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    FormHelperText,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import {
    fetchDepartmentCategoriesRef,
    type PlanCategoryDefault,
    type PlanCategoryDefaultCreate,
    type MutationResponse,
} from '../planningSetupApi';
import useString from '../../../../hooks/useString.ts';
import cfl from '../../../../utils/helpers.ts';
import str from '../../../../strings/str.ts';

const schema = z.object({
    department_category_id: z.number({ error: 'categoryRequired' }),
});

type FormData = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onClose: () => void;
    existingCategoryIds: number[];
    createMutation: UseMutationResult<MutationResponse<PlanCategoryDefault>, Error, PlanCategoryDefaultCreate>;
}

export function PlanCategoryDefaultForm({ open, onClose, existingCategoryIds, createMutation }: Props) {
    const getString = useString({ str });

    const { data: categories = [] } = useQuery({
        queryKey: ['department_categories'],
        queryFn: fetchDepartmentCategoriesRef,
        staleTime: 5 * 60 * 1000,
    });

    const available = categories.filter((c) => !existingCategoryIds.includes(c.id));

    const {
        handleSubmit,
        control,
        formState: { errors },
        reset,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { department_category_id: undefined },
    });

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({ department_category_id: data.department_category_id });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {cfl(getString('addPlanCategoryDefault')) || 'Add Planning Category'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}
                    <Controller
                        name="department_category_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.department_category_id}>
                                <InputLabel>
                                    {cfl(getString('departmentCategory') || 'Department Category')}
                                </InputLabel>
                                <Select
                                    {...field}
                                    value={field.value ?? ''}
                                    label={cfl(getString('departmentCategory') || 'Department Category')}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                >
                                    {available.map((c) => (
                                        <MenuItem key={c.id} value={c.id}>
                                            {c.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {available.length === 0 && (
                                    <FormHelperText>
                                        {getString('allCategoriesAdded') || 'All categories are already added'}
                                    </FormHelperText>
                                )}
                                {errors.department_category_id && (
                                    <FormHelperText>
                                        {getString(errors.department_category_id.message ?? '') ||
                                            errors.department_category_id.message}
                                    </FormHelperText>
                                )}
                            </FormControl>
                        )}
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
                    disabled={createMutation.isPending || available.length === 0}
                    startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('add') || 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
