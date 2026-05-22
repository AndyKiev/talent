// src/components/employees/EmployeeCreateDialog.tsx
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useQuery } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    FormControlLabel,
    Switch,
    Box,
    Alert,
    CircularProgress,
    Typography,
    Divider,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { fetchDepartmentCategories } from '../admin/department_categories/departmentCategoryApi';
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';
import { fetchJobsByDepartmentType } from './jobsByDepartmentTypeApi';
import type { Employee, EmployeeCreate } from './employeeApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/capitalizeFirstLetter';

// ── Fetch departments by category ─────────────────────────────────────────────

interface DepartmentOption {
    id: number;
    name: string;
    department_type_id: number;
}

const fetchDepartmentsByCategory = async (categoryId: number): Promise<DepartmentOption[]> => {
    const res = await axiosInstance.get<DepartmentOption[]>(`${BASE_URL}/departments`, {
        params: { department_category_id: categoryId },
    });
    return res.data ?? [];
};

// ── Zod schema ────────────────────────────────────────────────────────────────

const schema = z.object({
    code: z.string().min(1, 'codeRequired').max(10, 'codeTooLong'),
    name: z.string().min(1, 'nameRequired').max(100, 'nameTooLong'),
    email: z.string().max(100).email('invalidEmail').optional().or(z.literal('')),
    is_active: z.boolean(),
    department_category_id: z.number({ error: 'categoryRequired' }),
    department_id: z.number({ error: 'departmentRequired' }),
    job_id: z.number({ error: 'jobRequired' }),
});

type FormData = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<
        Employee,
        Error,
        { employeeData: EmployeeCreate; departmentId: number }
    >;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EmployeeCreateDialog({ open, onClose, createMutation }: Props) {
    const getString = useString({ str });

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
        defaultValues: {
            code: '',
            name: '',
            email: '',
            is_active: true,
            department_category_id: undefined,
            department_id: undefined,
            job_id: undefined,
        },
    });

    const categoryId = watch('department_category_id');
    const departmentId = watch('department_id');

    // ── Queries ───────────────────────────────────────────────────────────────

    const { data: categories = [] } = useQuery({
        queryKey: ['department_categories', { is_main: true }],
        queryFn: () => fetchDepartmentCategories({ is_main: true }),
        staleTime: 5 * 60 * 1000,
    });

    const { data: departments = [], isLoading: deptsLoading } = useQuery({
        queryKey: ['departments_by_category', categoryId],
        queryFn: () => fetchDepartmentsByCategory(categoryId!),
        enabled: categoryId != null,
        staleTime: 2 * 60 * 1000,
    });

    // Resolve selected department to get its department_type_id
    const selectedDept = departments.find((d) => d.id === departmentId);
    const deptTypeId = selectedDept?.department_type_id ?? null;

    const { data: jobs = [], isLoading: jobsLoading } = useQuery({
        queryKey: ['jobs_by_dept_type', deptTypeId],
        queryFn: () => fetchJobsByDepartmentType(deptTypeId!),
        enabled: deptTypeId != null,
        staleTime: 2 * 60 * 1000,
    });

    // ── Cascade resets ────────────────────────────────────────────────────────

    useEffect(() => {
        setValue('department_id', undefined as unknown as number);
        setValue('job_id', undefined as unknown as number);
    }, [categoryId, setValue]);

    useEffect(() => {
        setValue('job_id', undefined as unknown as number);
    }, [departmentId, setValue]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleClose = () => {
        reset();
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            employeeData: {
                code: data.code.trim().toUpperCase(),
                name: data.name.trim(),
                email: data.email?.trim() || null,
                is_active: data.is_active,
                job_id: data.job_id,
                lang_id: 3,
            },
            departmentId: data.department_id,
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{cfl(getString('createEmployee') || 'Create Employee')}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                    {createMutation.isError && (
                        <Alert severity="error">{createMutation.error?.message}</Alert>
                    )}

                    {/* ── Personal info ───────────────────────────────────────── */}
                    <Typography variant="overline" color="text.secondary" sx={{ mb: -1 }}>
                        {getString('personalInfo') || 'Personal info'}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label={cfl(getString('code') || 'Code')}
                            required
                            fullWidth
                            slotProps={{
                                htmlInput: { maxLength: 10, style: { textTransform: 'uppercase' } },
                            }}
                            error={!!errors.code}
                            helperText={
                                errors.code?.message &&
                                (getString(errors.code.message) || errors.code.message)
                            }
                            {...register('code')}
                        />
                        <TextField
                            label={cfl(getString('name') || 'Name')}
                            required
                            fullWidth
                            slotProps={{ htmlInput: { maxLength: 100 } }}
                            error={!!errors.name}
                            helperText={
                                errors.name?.message &&
                                (getString(errors.name.message) || errors.name.message)
                            }
                            {...register('name')}
                        />
                    </Box>

                    <TextField
                        label={cfl(getString('email') || 'Email')}
                        fullWidth
                        type="email"
                        slotProps={{ htmlInput: { maxLength: 100 } }}
                        error={!!errors.email}
                        helperText={
                            errors.email?.message &&
                            (getString(errors.email.message) || errors.email.message)
                        }
                        {...register('email')}
                    />

                    <FormControlLabel
                        control={
                            <Controller
                                name="is_active"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        checked={field.value}
                                        onChange={(_, checked) => field.onChange(checked)}
                                    />
                                )}
                            />
                        }
                        label={cfl(getString('isActive') || 'Active')}
                    />

                    <Divider />

                    {/* ── Department & job ────────────────────────────────────── */}
                    <Typography variant="overline" color="text.secondary" sx={{ mb: -1 }}>
                        {getString('departmentAndJob') || 'Department & Job'}
                    </Typography>

                    {/* Step 1 — Category */}
                    <Controller
                        name="department_category_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth error={!!errors.department_category_id}>
                                <InputLabel required>
                                    {cfl(getString('departmentCategory') || 'Department Category')}
                                </InputLabel>
                                <Select
                                    {...field}
                                    value={field.value ?? ''}
                                    label={cfl(
                                        getString('departmentCategory') || 'Department Category',
                                    )}
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
                                        {getString(
                                            errors.department_category_id.message ?? '',
                                        ) || errors.department_category_id.message}
                                    </FormHelperText>
                                )}
                            </FormControl>
                        )}
                    />

                    {/* Step 2 — Department (enabled after category) */}
                    <Controller
                        name="department_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl
                                fullWidth
                                error={!!errors.department_id}
                                disabled={!categoryId || deptsLoading}
                            >
                                <InputLabel required>
                                    {cfl(getString('department') || 'Department')}
                                </InputLabel>
                                <Select
                                    {...field}
                                    value={field.value ?? ''}
                                    label={cfl(getString('department') || 'Department')}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    startAdornment={
                                        deptsLoading ? (
                                            <CircularProgress size={16} sx={{ mr: 1 }} />
                                        ) : undefined
                                    }
                                >
                                    {!categoryId && (
                                        <MenuItem disabled value="">
                                            <em>
                                                {getString('firstSelectCategory') ||
                                                    'First select a category'}
                                            </em>
                                        </MenuItem>
                                    )}
                                    {departments.map((d) => (
                                        <MenuItem key={d.id} value={d.id}>
                                            {d.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.department_id && (
                                    <FormHelperText>
                                        {getString(errors.department_id.message ?? '') ||
                                            errors.department_id.message}
                                    </FormHelperText>
                                )}
                                {categoryId && !deptsLoading && departments.length === 0 && (
                                    <FormHelperText>
                                        {getString('noDepartmentsInCategory') ||
                                            'No departments in this category'}
                                    </FormHelperText>
                                )}
                            </FormControl>
                        )}
                    />

                    {/* Step 3 — Job (enabled after department) */}
                    <Controller
                        name="job_id"
                        control={control}
                        render={({ field }) => (
                            <FormControl
                                fullWidth
                                error={!!errors.job_id}
                                disabled={!departmentId || jobsLoading}
                            >
                                <InputLabel required>
                                    {cfl(getString('job') || 'Job')}
                                </InputLabel>
                                <Select
                                    {...field}
                                    value={field.value ?? ''}
                                    label={cfl(getString('job') || 'Job')}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    startAdornment={
                                        jobsLoading ? (
                                            <CircularProgress size={16} sx={{ mr: 1 }} />
                                        ) : undefined
                                    }
                                >
                                    {!departmentId && (
                                        <MenuItem disabled value="">
                                            <em>
                                                {getString('firstSelectDepartment') ||
                                                    'First select a department'}
                                            </em>
                                        </MenuItem>
                                    )}
                                    {jobs.map((j) => (
                                        <MenuItem key={j.id} value={j.id}>
                                            {j.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.job_id && (
                                    <FormHelperText>
                                        {getString(errors.job_id.message ?? '') ||
                                            errors.job_id.message}
                                    </FormHelperText>
                                )}
                                {departmentId && !jobsLoading && jobs.length === 0 && (
                                    <FormHelperText error>
                                        {getString('noJobsForDepartmentType') ||
                                            'No jobs linked to this department type. Configure links first.'}
                                    </FormHelperText>
                                )}
                            </FormControl>
                        )}
                    />

                    {/* Warning: department type has no jobs linked */}
                    {departmentId && !jobsLoading && jobs.length === 0 && (
                        <Alert severity="warning" icon={<WarningAmberIcon />}>
                            {getString('noJobsWarning') ||
                                'The selected department has no jobs linked to its type. Please configure Department Type → Job links first.'}
                        </Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button
                    variant="outlined"
                    onClick={handleClose}
                    disabled={createMutation.isPending}
                >
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={
                        createMutation.isPending ||
                        (!!departmentId && !jobsLoading && jobs.length === 0)
                    }
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
