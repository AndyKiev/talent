// src/components/admin/hrm_scopes/HrmScopeForm.tsx
import { useMemo } from 'react';
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { fetchDepartmentsFlat } from '../departments/departmentApi';
import { DEPARTMENT_FLAT_QK } from '../../../utils/queryKeys.ts';
import type { HrmScope, HrmScopeCreate, MutationResponse } from './hrmScopeApi';
import useString from '../../../hooks/useString.ts';
import cfl from '../../../utils/helpers.ts';
import str from '../../../strings/str.ts';
import { DATE_FORMAT } from '../../../utils/eNums.ts';

const API_DATE = 'YYYY-MM-DD';

const schema = z
    .object({
        department_category_id: z.number({ message: 'categoryRequired' }).min(1, 'categoryRequired'),
        department_id: z.number({ message: 'departmentRequired' }).min(1, 'departmentRequired'),
        start_date: z.string().min(1, 'startDateRequired'),
        end_date: z.string().min(1, 'endDateRequired'),
    })
    .refine((d) => d.end_date >= d.start_date, {
        path: ['end_date'],
        message: 'endDateBeforeStart',
    });

type FormData = z.infer<typeof schema>;

const todayIso = () => dayjs().format(API_DATE);
const yearEndIso = () => `${new Date().getFullYear()}-12-31`;

interface Props {
    open: boolean;
    onClose: () => void;
    employeeId: number;
    createMutation: UseMutationResult<MutationResponse<HrmScope>, Error, HrmScopeCreate>;
}

export function HrmScopeForm({ open, onClose, employeeId, createMutation }: Props) {
    const getString = useString({ str });

    const { data: departments = [], isLoading: deptsLoading } = useQuery({
        queryKey: DEPARTMENT_FLAT_QK,
        queryFn: fetchDepartmentsFlat,
        enabled: open,
        staleTime: 5 * 60 * 1000,
    });

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            department_category_id: undefined as unknown as number,
            department_id: undefined as unknown as number,
            start_date: todayIso(),
            end_date: yearEndIso(),
        },
    });

    const selectedCategoryId = watch('department_category_id');

    // Distinct categories that actually have department instances.
    const categories = useMemo(() => {
        const map = new Map<number, string>();
        for (const d of departments) {
            const cat = d.department_category;
            const id = d.department_category_id;
            if (id && !map.has(id)) map.set(id, cat?.name || `category ${id}`);
        }
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [departments]);

    // Instances within the chosen category.
    const instances = useMemo(
        () => departments.filter((d) => d.department_category_id === selectedCategoryId),
        [departments, selectedCategoryId],
    );

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate(
            {
                employee_id: employeeId,
                department_id: data.department_id,
                start_date: data.start_date,
                end_date: data.end_date,
            },
            { onSuccess: handleClose },
        );
    };

    const errMsg = (key?: string) => (key ? getString(key) || key : undefined);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{getString('addScopeDepartment') || 'Add department to scope'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{(createMutation.error as Error).message}</Alert>
                    )}

                    {/* Category */}
                    <FormControl fullWidth error={!!errors.department_category_id} disabled={deptsLoading}>
                        <InputLabel>{cfl(getString('category') || 'Category')}</InputLabel>
                        <Controller
                            name="department_category_id"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    label={cfl(getString('category') || 'Category')}
                                    value={field.value ?? ''}
                                    onChange={(e) => {
                                        field.onChange(Number(e.target.value));
                                        // reset instance when category changes
                                        setValue('department_id', undefined as unknown as number);
                                    }}
                                >
                                    {categories.map((c) => (
                                        <MenuItem key={c.id} value={c.id}>
                                            {cfl(c.name)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            )}
                        />
                        {errors.department_category_id && (
                            <FormHelperText>{errMsg(errors.department_category_id.message)}</FormHelperText>
                        )}
                    </FormControl>

                    {/* Department instance */}
                    <FormControl
                        fullWidth
                        error={!!errors.department_id}
                        disabled={deptsLoading || !selectedCategoryId}
                    >
                        <InputLabel>{cfl(getString('department') || 'Department')}</InputLabel>
                        <Controller
                            name="department_id"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    {...field}
                                    label={cfl(getString('department') || 'Department')}
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                >
                                    {instances.map((d) => (
                                        <MenuItem key={d.id} value={d.id}>
                                            {d.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            )}
                        />
                        {errors.department_id && (
                            <FormHelperText>{errMsg(errors.department_id.message)}</FormHelperText>
                        )}
                    </FormControl>

                    {/* Dates */}
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Controller
                                name="start_date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        label={cfl(getString('startDate') || 'Start date')}
                                        format={DATE_FORMAT}
                                        value={field.value ? dayjs(field.value, API_DATE) : null}
                                        onChange={(v) => field.onChange(v ? dayjs(v).format(API_DATE) : '')}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                error: !!errors.start_date,
                                                helperText: errMsg(errors.start_date?.message),
                                            },
                                        }}
                                    />
                                )}
                            />
                            <Controller
                                name="end_date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        label={cfl(getString('endDate') || 'End date')}
                                        format={DATE_FORMAT}
                                        value={field.value ? dayjs(field.value, API_DATE) : null}
                                        onChange={(v) => field.onChange(v ? dayjs(v).format(API_DATE) : '')}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                error: !!errors.end_date,
                                                helperText: errMsg(errors.end_date?.message),
                                            },
                                        }}
                                    />
                                )}
                            />
                        </Box>
                    </LocalizationProvider>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={handleClose} disabled={createMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={createMutation.isPending || deptsLoading}
                >
                    {createMutation.isPending ? <CircularProgress size={24} /> : getString('add') || 'Add'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
