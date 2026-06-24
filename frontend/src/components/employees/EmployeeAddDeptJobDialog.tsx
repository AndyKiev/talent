// src/components/employees/EmployeeAddDeptJobDialog.tsx
//
// mode="add_department"  → pick exact department (tree) + job locked to current
// mode="change_job"      → pick exact department (tree) + editable job (warns on change)
//
// Admin tool — bypasses employee events. Department is NEVER chosen as a flat
// top-level select anymore: pick the top instance, then drill into the tree to
// the exact node. The job list is derived from the picked node's department TYPE.
//
// onSubmit callback replaces the mutation prop — the parent decides whether to
// show an extra confirmation before actually firing the mutation.

import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useQuery } from '@tanstack/react-query';
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
    FormHelperText,
    FormControlLabel,
    Switch,
    Box,
    Alert,
    CircularProgress,
    Typography,
    Chip,
    Divider,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WorkIcon from '@mui/icons-material/Work';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { fetchJobsByDepartmentType } from './jobsByDepartmentTypeApi';
import {
    fetchDepartmentsByCategory,
    type DepartmentOption,
} from './employee_events/employeeEventApi';
import { DepartmentTreePicker } from './DepartmentTreePicker';
import type { DepartmentNode } from '../admin/departments/departmentApi';
import type { Employee } from './employeeApi';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';
import { fetchDepartmentCategories } from '../admin/department_categories/departmentCategoryApi';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AddDeptJobMode = 'add_department' | 'change_job';

export interface AddDeptJobPayload {
    departmentId: number;
    jobId: number;
    isMain: boolean;
    newJobId: number | null; // non-null only in change_job mode when job differs
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const schema = z.object({
    department_category_id: z.number({ error: 'categoryRequired' }),
    department_id: z.number({ error: 'departmentRequired' }),
    job_id: z.number({ error: 'jobRequired' }),
    is_main: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
    employee: Employee | null;
    mode: AddDeptJobMode;
    isPending: boolean;
    onSubmit: (payload: AddDeptJobPayload) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EmployeeAddDeptJobDialog({
                                             open,
                                             onClose,
                                             employee,
                                             mode,
                                             isPending,
                                             onSubmit,
                                         }: Props) {
    const getString = useString({ str });
    const [jobChangeWarningAcknowledged, setJobChangeWarningAcknowledged] = useState(false);

    // ── Tree-picker local state (department_id on the form is the exact node) ──
    const [topDeptId, setTopDeptId] = useState<number | null>(null);
    const [pickedTypeId, setPickedTypeId] = useState<number | null>(null);
    const [pickedName, setPickedName] = useState<string>('');

    const {
        handleSubmit,
        control,
        formState: { errors },
        reset,
        watch,
        setValue,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            department_category_id: undefined as unknown as number,
            department_id: undefined as unknown as number,
            job_id: undefined as unknown as number,
            is_main: true,
        },
    });

    const categoryId = watch('department_category_id');
    const departmentId = watch('department_id');
    const selectedJobId = watch('job_id');
    const isMain = watch('is_main');

    // ── Ref to skip the isMain reset on first render / dialog open ─────────
    const isMainPrev = useRef(isMain);

    const clearPicker = () => {
        setTopDeptId(null);
        setPickedTypeId(null);
        setPickedName('');
    };

    // ── Reset form when dialog opens/closes ───────────────────────────────────

    useEffect(() => {
        if (!open) {
            reset({
                department_category_id: undefined as unknown as number,
                department_id: undefined as unknown as number,
                job_id: undefined as unknown as number,
                is_main: true,
            });
            setJobChangeWarningAcknowledged(false);
            isMainPrev.current = true;
            clearPicker();
        }
    }, [open, reset]);

    // ── Queries ───────────────────────────────────────────────────────────────

    // Categories filtered by is_main — refetches when toggle changes
    const { data: categories = [] } = useQuery({
        queryKey: ['department_categories', { is_main: isMain }],
        queryFn: () => fetchDepartmentCategories({ is_main: isMain }),
        staleTime: 5 * 60 * 1000,
    });

    // TOP department instances in the chosen category
    const { data: departments = [], isLoading: deptsLoading } = useQuery<DepartmentOption[]>({
        queryKey: ['departments_by_category', categoryId],
        queryFn: () => fetchDepartmentsByCategory(categoryId!),
        enabled: categoryId != null,
        staleTime: 2 * 60 * 1000,
    });

    // Jobs for the PICKED node's department type
    const { data: jobs = [], isLoading: jobsLoading } = useQuery({
        queryKey: ['jobs_by_dept_type', pickedTypeId],
        queryFn: () => fetchJobsByDepartmentType(pickedTypeId!),
        enabled: pickedTypeId != null,
        staleTime: 2 * 60 * 1000,
    });

    // ── Cascade resets ────────────────────────────────────────────────────────

    // When is_main toggles → reset category + department + job + picker
    useEffect(() => {
        if (isMainPrev.current !== isMain) {
            isMainPrev.current = isMain;
            setValue('department_category_id', undefined as unknown as number);
            setValue('department_id', undefined as unknown as number);
            setValue('job_id', undefined as unknown as number);
            setJobChangeWarningAcknowledged(false);
            clearPicker();
        }
    }, [isMain, setValue]);

    // When category changes → reset department + job + picker
    useEffect(() => {
        setValue('department_id', undefined as unknown as number);
        setValue('job_id', undefined as unknown as number);
        setJobChangeWarningAcknowledged(false);
        clearPicker();
    }, [categoryId, setValue]);

    // When the picked department changes → reset job
    useEffect(() => {
        setValue('job_id', undefined as unknown as number);
        setJobChangeWarningAcknowledged(false);
    }, [departmentId, setValue]);

    // ── Auto-select job in add_department mode ────────────────────────────────
    // For is_main=false (extra departments) we skip the job check entirely —
    // the employee keeps their current job regardless of department type links.

    useEffect(() => {
        if (mode === 'add_department' && employee) {
            if (!isMain) {
                setValue('job_id', employee.job_id ?? (undefined as unknown as number));
            } else if (jobs.length > 0) {
                const match = jobs.find((j) => j.id === employee.job_id);
                setValue('job_id', match ? match.id : (undefined as unknown as number));
            }
        }
    }, [jobs, mode, employee, isMain, setValue]);

    // ── Picker handlers ─────────────────────────────────────────────────────────

    // Selecting a top instance seeds the picked department from the option
    // (it already carries department_type_id); the subtree loads below.
    const handleTopDeptChange = (id: number) => {
        const opt = departments.find((d) => d.id === id);
        setTopDeptId(id);
        if (opt) {
            setPickedTypeId(opt.department_type_id);
            setPickedName(opt.name);
            setValue('department_id', opt.id, { shouldValidate: true });
        }
        setValue('job_id', undefined as unknown as number);
        setJobChangeWarningAcknowledged(false);
    };

    // Clicking any node in the tree overrides the picked department.
    const handleTreeSelect = (node: DepartmentNode) => {
        setPickedTypeId(node.department_type_id);
        setPickedName(node.name);
        setValue('department_id', node.id, { shouldValidate: true });
        setValue('job_id', undefined as unknown as number);
        setJobChangeWarningAcknowledged(false);
    };

    // ── Derived flags ─────────────────────────────────────────────────────────

    const jobWillChange =
        mode === 'change_job' &&
        employee != null &&
        selectedJobId != null &&
        selectedJobId !== employee.job_id;

    // Job mismatch only matters for main departments
    const currentJobNotInList =
        isMain &&
        mode === 'add_department' &&
        jobs.length > 0 &&
        employee != null &&
        !jobs.find((j) => j.id === employee.job_id);

    // No-jobs-for-type only blocks for main departments
    const noJobsForType = isMain && !!departmentId && !jobsLoading && jobs.length === 0;

    const canSubmit =
        !isPending &&
        !noJobsForType &&
        !currentJobNotInList &&
        (!jobWillChange || jobChangeWarningAcknowledged);

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleFormSubmit = (data: FormData) => {
        onSubmit({
            departmentId: data.department_id,
            jobId: data.job_id,
            isMain: data.is_main,
            newJobId: jobWillChange ? data.job_id : null,
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const title =
        mode === 'add_department'
            ? cfl(getString('addDepartment') || 'Add Department')
            : cfl(getString('changeJobAndDepartment') || 'Change Job & Department');

    const handleClose = () => {
        (document.activeElement as HTMLElement | null)?.blur();
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableRestoreFocus>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>

                    {/* Context chips */}
                    {employee && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Chip
                                label={employee.code}
                                size="small"
                                variant="outlined"
                                sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                            />
                            <Chip label={employee.name} size="small" variant="outlined" />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <WorkIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                    {getString('currentJob') || 'Current job'}:
                                </Typography>
                                <Chip
                                    label={employee.job?.name ?? `ID ${employee.job_id}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                            </Box>
                        </Box>
                    )}

                    <Typography variant="body2" color="text.secondary">
                        {mode === 'add_department'
                            ? getString('addDepartmentHint') ||
                            'Select a department to assign. The job will remain unchanged.'
                            : getString('changeJobHint') ||
                            'Select the new department. The job will be determined by the department type.'}
                    </Typography>

                    <Divider />

                    {/* is_main toggle ABOVE the category select */}
                    <Controller
                        name="is_main"
                        control={control}
                        render={({ field }) => (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={field.value}
                                        onChange={(_, checked) => field.onChange(checked)}
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <ApartmentIcon fontSize="small" />
                                        <span>{cfl(getString('mainDepartment') || 'Main Department')}</span>
                                    </Box>
                                }
                            />
                        )}
                    />

                    {/* Step 1 — Category (filtered by is_main) */}
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
                                    label={cfl(getString('departmentCategory') || 'Department Category')}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                >
                                    {categories.map((c) => (
                                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                    ))}
                                </Select>
                                {errors.department_category_id && (
                                    <FormHelperText>
                                        {getString(errors.department_category_id.message ?? '') ||
                                            errors.department_category_id.message}
                                    </FormHelperText>
                                )}
                                {categories.length === 0 && (
                                    <FormHelperText>
                                        {isMain
                                            ? getString('noMainCategories') || 'No main categories configured'
                                            : getString('noCategories') || 'No categories available'}
                                    </FormHelperText>
                                )}
                            </FormControl>
                        )}
                    />

                    {/* Step 2 — Top department instance + tree drill-down */}
                    <FormControl
                        fullWidth
                        error={!!errors.department_id}
                        disabled={!categoryId || deptsLoading}
                    >
                        <InputLabel required>{cfl(getString('topDepartment') || 'Top department')}</InputLabel>
                        <Select
                            variant={"outlined"}
                            value={topDeptId ?? ''}
                            label={cfl(getString('topDepartment') || 'Top department')}
                            onChange={(e) => handleTopDeptChange(Number(e.target.value))}
                            startAdornment={
                                deptsLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : undefined
                            }
                        >
                            {!categoryId && (
                                <MenuItem disabled value="">
                                    <em>{getString('firstSelectCategory') || 'First select a category'}</em>
                                </MenuItem>
                            )}
                            {departments.map((d) => (
                                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                            ))}
                        </Select>
                        {categoryId && !deptsLoading && departments.length === 0 && (
                            <FormHelperText>
                                {getString('noDepartmentsInCategory') || 'No departments in this category'}
                            </FormHelperText>
                        )}
                        {errors.department_id && (
                            <FormHelperText>
                                {getString(errors.department_id.message ?? '') || errors.department_id.message}
                            </FormHelperText>
                        )}
                    </FormControl>

                    {topDeptId != null && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                {getString('selectExactDepartmentHint') ||
                                    'Select the exact department in the tree (or keep the top one)'}
                            </Typography>
                            <DepartmentTreePicker
                                rootId={topDeptId}
                                selectedId={departmentId ?? null}
                                onSelect={handleTreeSelect}
                            />
                            {pickedName && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                    <ApartmentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="caption" color="text.secondary">
                                        {pickedName}
                                    </Typography>
                                    {departmentId != null && (
                                        <Chip size="small" label={`#${departmentId}`} sx={{ height: 20, fontSize: '0.7rem' }} />
                                    )}
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Step 3 — Job */}
                    {mode === 'add_department' ? (
                        // Locked — show resolved job or mismatch error (main only)
                        departmentId != null && !jobsLoading && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <WorkIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                    {isMain
                                        ? getString('jobFromDeptType') || 'Job from department type'
                                        : getString('currentJobKept') || 'Current job (kept)'}:
                                </Typography>
                                {isMain && currentJobNotInList ? (
                                    <Alert severity="error" sx={{ flex: 1, py: 0 }}>
                                        {getString('deptTypeJobMismatch') ||
                                            "This department's type has no link to the employee's current job. Use 'Change Job' instead."}
                                    </Alert>
                                ) : (
                                    <Chip
                                        label={employee?.job?.name ?? `ID ${employee?.job_id}`}
                                        size="small"
                                        color="primary"
                                        variant="filled"
                                    />
                                )}
                            </Box>
                        )
                    ) : (
                        // Editable job select
                        <Controller
                            name="job_id"
                            control={control}
                            render={({ field }) => (
                                <FormControl
                                    fullWidth
                                    error={!!errors.job_id}
                                    disabled={pickedTypeId == null || jobsLoading}
                                >
                                    <InputLabel required>{cfl(getString('job') || 'Job')}</InputLabel>
                                    <Select
                                        {...field}
                                        value={field.value ?? ''}
                                        label={cfl(getString('job') || 'Job')}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        startAdornment={
                                            jobsLoading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : undefined
                                        }
                                    >
                                        {pickedTypeId == null && (
                                            <MenuItem disabled value="">
                                                <em>{getString('firstSelectDepartment') || 'First select a department'}</em>
                                            </MenuItem>
                                        )}
                                        {jobs.map((j) => (
                                            <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>
                                        ))}
                                    </Select>
                                    {errors.job_id && (
                                        <FormHelperText>
                                            {getString(errors.job_id.message ?? '') || errors.job_id.message}
                                        </FormHelperText>
                                    )}
                                    {pickedTypeId != null && !jobsLoading && jobs.length === 0 && (
                                        <FormHelperText error>
                                            {getString('noJobsForDepartmentType') ||
                                                'No jobs linked to this department type. Configure links first.'}
                                        </FormHelperText>
                                    )}
                                </FormControl>
                            )}
                        />
                    )}

                    {/* Job-change warning */}
                    {jobWillChange && (
                        <Alert severity="warning" icon={<WarningAmberIcon />}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                {getString('jobWillChange') ||
                                    "This will change the employee's job. Normally done via employee events."}
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        size="small"
                                        checked={jobChangeWarningAcknowledged}
                                        onChange={(_, v) => setJobChangeWarningAcknowledged(v)}
                                    />
                                }
                                label={
                                    <Typography variant="caption">
                                        {getString('iUnderstandJobChange') ||
                                            'I understand — proceed with job change'}
                                    </Typography>
                                }
                            />
                        </Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={handleClose} disabled={isPending}>
                    {getString('cancel') || 'Cancel'}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(handleFormSubmit)}
                    disabled={!canSubmit}
                    startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {mode === 'change_job'
                        ? getString('applyChange') || 'Apply Change'
                        : getString('addDepartment') || 'Add Department'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
