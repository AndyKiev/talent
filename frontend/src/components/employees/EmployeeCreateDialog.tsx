// src/components/employees/EmployeeCreateDialog.tsx
import { useEffect, useState } from 'react';
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
    TextField,
    Button,
    Box,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Typography,
    Divider,
    FormControlLabel,
    Switch,
    Chip,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import type { Employee } from './employeeApi';
import {
    fetchMainDepartmentCategories,
    fetchDepartmentsByCategory,
    fetchJobsByDepartmentType,
    type DepartmentCategoryOption,
    type DepartmentOption,
    type JobByDeptType,
} from './employee_events/employeeEventApi';
import { DepartmentTreePicker } from './DepartmentTreePicker';
import type { DepartmentNode } from '../admin/departments/departmentApi';
import { DATE_FORMAT } from '../../utils/eNums';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

// ── Form schema ────────────────────────────────────────────────────────────────

const schema = z.object({
    code: z.string().min(1, 'codeRequired').max(10, 'codeTooLong'),
    name: z.string().min(1, 'nameRequired').max(100, 'nameTooLong'),
    email: z.string().max(100).email('invalidEmail').optional().or(z.literal('')),
    is_active: z.boolean(),
    effective_date: z.string().min(1, 'fieldRequired'),
    department_category_id: z.number({ message: 'fieldRequired' }),
    department_id: z.number({ message: 'fieldRequired' }),
    job_id: z.number({ message: 'fieldRequired' }),
    description: z.string().max(512).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

// ── Payload for the backend endpoint ──────────────────────────────────────────

export interface EmployeeWithActivationPayload {
    code: string;
    name: string;
    email?: string | null;
    is_active: boolean;
    lang_id: number;
    effective_date: string;
    department_id: number;
    job_id: number;
    description?: string | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<Employee, Error, EmployeeWithActivationPayload>;
}

export function EmployeeCreateDialog({ open, onClose, createMutation }: Props) {
    const getString = useString({ str });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        control,
        watch,
        setValue,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            code: '',
            name: '',
            email: '',
            is_active: true,
            effective_date: dayjs().format('YYYY-MM-DD'),
            department_category_id: undefined,
            department_id: undefined,
            job_id: undefined,
            description: '',
        },
    });

    const selectedCategoryId = watch('department_category_id');
    const selectedDeptId = watch('department_id');

    // ── Local cascade state (the picked node's id lives on the form as
    //    department_id; here we keep what we need to drive the tree + job list)
    const [topDeptId, setTopDeptId] = useState<number | null>(null);
    const [pickedTypeId, setPickedTypeId] = useState<number | null>(null);
    const [pickedName, setPickedName] = useState<string>('');

    // ── Fetch main categories ─────────────────────────────────────────────────
    const { data: categories = [] } = useQuery<DepartmentCategoryOption[]>({
        queryKey: ['main-department-categories'],
        queryFn: fetchMainDepartmentCategories,
        enabled: open,
        staleTime: 10 * 60 * 1000,
    });

    // ── Fetch TOP department instances by category ────────────────────────────
    const { data: topDepartments = [] } = useQuery<DepartmentOption[]>({
        queryKey: ['departments-by-category', selectedCategoryId],
        queryFn: () => fetchDepartmentsByCategory(selectedCategoryId!),
        enabled: open && selectedCategoryId != null,
        staleTime: 5 * 60 * 1000,
    });

    // ── Jobs for the PICKED node's department type ────────────────────────────
    const { data: jobsByType = [] } = useQuery<JobByDeptType[]>({
        queryKey: ['jobs-by-dept-type', pickedTypeId],
        queryFn: () => fetchJobsByDepartmentType(pickedTypeId!),
        enabled: open && pickedTypeId != null,
        staleTime: 5 * 60 * 1000,
    });

    // ── Reset all state when the dialog closes ────────────────────────────────
    useEffect(() => {
        if (!open) {
            reset();
            setTopDeptId(null);
            setPickedTypeId(null);
            setPickedName('');
        }
    }, [open, reset]);

    // ── Cascade helpers ───────────────────────────────────────────────────────
    const resetCascadeBelowCategory = () => {
        setTopDeptId(null);
        setPickedTypeId(null);
        setPickedName('');
        setValue('department_id', undefined as unknown as number);
        setValue('job_id', undefined as unknown as number);
    };

    // Selecting a top instance: seed the picked department from the option
    // (it already carries department_type_id), then load its subtree below.
    const handleTopDeptChange = (id: number) => {
        const opt = topDepartments.find((d) => d.id === id);
        setTopDeptId(id);
        if (opt) {
            setPickedTypeId(opt.department_type_id);
            setPickedName(opt.name);
            setValue('department_id', opt.id, { shouldValidate: true });
        }
        setValue('job_id', undefined as unknown as number);
    };

    // Clicking any node in the tree overrides the picked department.
    const handleTreeSelect = (node: DepartmentNode) => {
        setPickedTypeId(node.department_type_id);
        setPickedName(node.name);
        setValue('department_id', node.id, { shouldValidate: true });
        setValue('job_id', undefined as unknown as number);
    };

    const handleClose = () => {
        reset();
        setTopDeptId(null);
        setPickedTypeId(null);
        setPickedName('');
        onClose();
    };

    const onSubmit = (data: FormData) => {
        createMutation.mutate({
            code: data.code.trim().toUpperCase(),
            name: data.name.trim(),
            email: data.email?.trim() || null,
            is_active: data.is_active,
            lang_id: 3, // default; user can change later
            effective_date: data.effective_date,
            department_id: data.department_id, // exact picked node → is_main on backend
            job_id: data.job_id,
            description: data.description?.trim() || null,
        });
    };

    const noJobsForType = pickedTypeId != null && jobsByType.length === 0;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>{cfl(getString('addEmployee') || 'Add Employee')}</DialogTitle>
            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    {createMutation.isError && (
                        <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                            {createMutation.error?.message}
                        </Alert>
                    )}

                    {/* Two columns: personal data + description (left), department (right) */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.4fr' },
                            gap: 3,
                            mt: 1,
                            alignItems: 'start',
                        }}
                    >
                        {/* ── LEFT: personal data + activation date + description ── */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                {cfl(getString('personalData') || 'Personal data')}
                            </Typography>

                            <TextField
                                label={cfl(getString('code') || 'Code')}
                                required fullWidth
                                slotProps={{ htmlInput: { maxLength: 10 } }}
                                error={!!errors.code}
                                helperText={errors.code?.message && (getString(errors.code.message) || errors.code.message)}
                                {...register('code')}
                            />
                            <TextField
                                label={cfl(getString('employeeName') || 'Employee Name')}
                                required fullWidth
                                slotProps={{ htmlInput: { maxLength: 100 } }}
                                error={!!errors.name}
                                helperText={errors.name?.message && (getString(errors.name.message) || errors.name.message)}
                                {...register('name')}
                            />
                            <TextField
                                label={cfl(getString('email') || 'Email')}
                                fullWidth type="email"
                                slotProps={{ htmlInput: { maxLength: 100 } }}
                                error={!!errors.email}
                                helperText={errors.email?.message && (getString(errors.email.message) || errors.email.message)}
                                {...register('email')}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={watch('is_active')}
                                        onChange={(_, v) => setValue('is_active', v)}
                                    />
                                }
                                label={cfl(getString('isActive') || 'Active')}
                            />

                            <Divider />

                            <Controller
                                name="effective_date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        label={cfl(getString('effectiveDate') || 'Effective date')}
                                        format={DATE_FORMAT}
                                        value={field.value ? dayjs(field.value) : null}
                                        onChange={(v) => {
                                            const d = v ? dayjs(v) : null;
                                            field.onChange(d && d.isValid() ? d.format('YYYY-MM-DD') : '');
                                        }}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                required: true,
                                                error: !!errors.effective_date,
                                                helperText:
                                                    errors.effective_date?.message &&
                                                    (getString(errors.effective_date.message) ||
                                                        errors.effective_date.message),
                                            },
                                        }}
                                    />
                                )}
                            />

                            <TextField
                                label={cfl(getString('description') || 'Description')}
                                fullWidth multiline minRows={3}
                                slotProps={{ htmlInput: { maxLength: 512 } }}
                                {...register('description')}
                            />
                        </Box>

                        {/* ── RIGHT: category → top instance → tree → job ── */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                {cfl(getString('mainDepartment') || 'Main department')}
                            </Typography>

                            {/* Category */}
                            <Controller
                                name="department_category_id"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth error={!!errors.department_category_id}>
                                        <InputLabel>{cfl(getString('departmentCategory') || 'Department category')}</InputLabel>
                                        <Select
                                            {...field}
                                            value={field.value ?? ''}
                                            label={cfl(getString('departmentCategory') || 'Department category')}
                                            onChange={(e) => {
                                                field.onChange(e.target.value as number);
                                                resetCascadeBelowCategory();
                                            }}
                                        >
                                            {categories.map((c) => (
                                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                            ))}
                                        </Select>
                                        {errors.department_category_id?.message && (
                                            <FormHelperText>
                                                {getString(errors.department_category_id.message) || errors.department_category_id.message}
                                            </FormHelperText>
                                        )}
                                    </FormControl>
                                )}
                            />

                            {/* Top department instance (directorate / store / board) */}
                            <FormControl fullWidth disabled={!selectedCategoryId}>
                                <InputLabel>{cfl(getString('topDepartment') || 'Top department')}</InputLabel>
                                <Select
                                    value={topDeptId ?? ''}
                                    label={cfl(getString('topDepartment') || 'Top department')}
                                    onChange={(e) => handleTopDeptChange(Number(e.target.value))}
                                >
                                    {topDepartments.map((d) => (
                                        <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                                    ))}
                                </Select>
                                {selectedCategoryId && topDepartments.length === 0 && (
                                    <FormHelperText>
                                        {getString('noDepartmentsInCategory') || 'No departments in this category'}
                                    </FormHelperText>
                                )}
                            </FormControl>

                            {/* Tree drill-down: pick the EXACT department instance */}
                            {topDeptId != null && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        {getString('selectExactDepartmentHint') ||
                                            'Select the exact department in the tree (or keep the top one)'}
                                    </Typography>
                                    <DepartmentTreePicker
                                        rootId={topDeptId}
                                        selectedId={selectedDeptId ?? null}
                                        onSelect={handleTreeSelect}
                                        maxHeight={360}
                                    />
                                    {pickedName && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {getString('mainDepartmentSelected', { name: pickedName }) ||
                                                    `Main department: ${pickedName}`}
                                            </Typography>
                                            {selectedDeptId != null && (
                                                <Chip size="small" label={`#${selectedDeptId}`} sx={{ height: 20, fontSize: '0.7rem' }} />
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            )}
                            {errors.department_id?.message && (
                                <Typography variant="caption" color="error" sx={{ ml: 1.5 }}>
                                    {getString(errors.department_id.message) || errors.department_id.message}
                                </Typography>
                            )}

                            {/* Job (from picked node's department type) */}
                            <Controller
                                name="job_id"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth error={!!errors.job_id} disabled={pickedTypeId == null}>
                                        <InputLabel>{cfl(getString('job') || 'Job')}</InputLabel>
                                        <Select
                                            {...field}
                                            value={field.value ?? ''}
                                            label={cfl(getString('job') || 'Job')}
                                            onChange={(e) => field.onChange(e.target.value as number)}
                                        >
                                            {jobsByType.map((j) => (
                                                <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>
                                            ))}
                                        </Select>
                                        {noJobsForType && (
                                            <FormHelperText error>
                                                {getString('noJobsForDepartmentType') ||
                                                    'No jobs linked to this department type. Configure links first.'}
                                            </FormHelperText>
                                        )}
                                        {errors.job_id?.message && !noJobsForType && (
                                            <FormHelperText>
                                                {getString(errors.job_id.message) || errors.job_id.message}
                                            </FormHelperText>
                                        )}
                                    </FormControl>
                                )}
                            />
                        </Box>
                    </Box>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={handleClose} disabled={createMutation.isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={createMutation.isPending}
                    startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {getString('create') || 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
