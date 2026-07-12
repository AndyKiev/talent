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
    Paper,
    Stack,
    IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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
import { TalentTargetJobPicker } from './talent_audit/TalentTargetJobPicker';
import { EmployeeDuplicatePersonDialog } from './EmployeeDuplicatePersonDialog';
import { checkPersonName, type PersonNameMatch } from '../admin/persons/personApi';
import DateWheelPicker from '../people-review/personal-data/DateWheelPicker';
import { formatDate } from '../../utils/date';
import type { DepartmentNode } from '../admin/departments/departmentApi';
import { DATE_FORMAT } from '../../utils/eNums';
import { useBooleanSetting } from '../../hooks/useAppSetting';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

// Global feature flag: allow adding talent target jobs on the fly during
// employee registration (see seed_app_settings.py).
const ALLOW_TALENT_SETTING_KEY = 'employee_create_allow_talent_period';

// One talent target job queued for creation with the new employee. The label
// fields are display-only (shown in the selected list before submit); only the
// two ids are sent to the backend.
export interface TalentJobInput {
    target_job_id: number;
    talent_status_period_link_id: number;
}
interface TalentJobDraft extends TalentJobInput {
    target_job_name: string;
    pair_label: string;
}

// ── Form schema ────────────────────────────────────────────────────────────────

const schema = z.object({
    code: z.string().min(1, 'codeRequired').max(10, 'codeTooLong'),
    last_name: z.string().min(1, 'fieldRequired').max(64, 'nameTooLong'),
    first_name: z.string().min(1, 'fieldRequired').max(64, 'nameTooLong'),
    patronymic: z.string().max(64, 'nameTooLong').optional().or(z.literal('')),
    sex: z.union([z.literal('male'), z.literal('female'), z.literal('')]),
    birth_date: z.string().optional().or(z.literal('')),
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
    // Person fields — the backend creates the person and derives the
    // employee's 'LAST FIRST' name from them.
    first_name: string;
    last_name: string;
    patronymic?: string | null;
    sex?: 'male' | 'female' | null;
    birth_date?: string | null;
    // true = user confirmed the namesake modal (next dedupe number assigned)
    allow_duplicate?: boolean;
    email?: string | null;
    is_active: boolean;
    lang_id: number;
    effective_date: string;
    department_id: number;
    job_id: number;
    description?: string | null;
    // Optional talent target jobs to create (audit + audit_jobs) right after the
    // employee. Orchestrated client-side in useEmployeeMutations; NOT sent to the
    // /with_activation endpoint. Empty/undefined = no talent created.
    talent_jobs?: TalentJobInput[];
}

// Result of the create orchestration: the employee always created; talentError
// is set (and surfaced as a warning) only when the optional talent step failed.
export interface EmployeeCreateResult {
    employee: Employee;
    talentError: string | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<EmployeeCreateResult, Error, EmployeeWithActivationPayload>;
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
            last_name: '',
            first_name: '',
            patronymic: '',
            sex: '',
            birth_date: '',
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

    // ── Talent target jobs (optional, gated by a global setting) ──────────────
    const { enabled: allowTalent } = useBooleanSetting(ALLOW_TALENT_SETTING_KEY);
    // Committed list (shown before submit) + the in-progress picker.
    const [talentJobs, setTalentJobs] = useState<TalentJobDraft[]>([]);
    const [tTypeId, setTTypeId] = useState<number | null>(null);
    const [tTypeName, setTTypeName] = useState('');
    const [tJobId, setTJobId] = useState<number | ''>('');
    const [tJobName, setTJobName] = useState('');
    const [tLinkId, setTLinkId] = useState<number | ''>('');
    const [tLinkLabel, setTLinkLabel] = useState('');

    // ── Namesake pre-check state: payload parked while the user decides ───────
    const [dupMatches, setDupMatches] = useState<PersonNameMatch[]>([]);
    const [pendingPayload, setPendingPayload] =
        useState<EmployeeWithActivationPayload | null>(null);
    const [checkingName, setCheckingName] = useState(false);

    // ── Birth-date wheel picker (same component as people-review dates) ───────
    const [birthOpen, setBirthOpen] = useState(false);
    const [draftBirth, setDraftBirth] = useState<string | null>(null);
    const birthDate = watch('birth_date');

    const resetTalentPicker = () => {
        setTTypeId(null);
        setTTypeName('');
        setTJobId('');
        setTJobName('');
        setTLinkId('');
        setTLinkLabel('');
    };
    const talentPickerComplete = tJobId !== '' && tLinkId !== '';
    const addTalentJob = () => {
        if (!talentPickerComplete) return;
        setTalentJobs((prev) => [
            ...prev,
            {
                target_job_id: tJobId as number,
                talent_status_period_link_id: tLinkId as number,
                target_job_name: tJobName,
                pair_label: tLinkLabel,
            },
        ]);
        resetTalentPicker();
    };
    const removeTalentJob = (index: number) =>
        setTalentJobs((prev) => prev.filter((_, i) => i !== index));

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
            setTalentJobs([]);
            resetTalentPicker();
            setDupMatches([]);
            setPendingPayload(null);
            setBirthOpen(false);
            setDraftBirth(null);
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
        setTalentJobs([]);
        resetTalentPicker();
        onClose();
    };

    const onSubmit = async (data: FormData) => {
        // Committed talent jobs + the in-progress pick if it's complete (so a
        // filled-but-not-"+"-added pick is not silently lost on Create).
        let talent_jobs: TalentJobInput[] | undefined;
        if (allowTalent) {
            const merged: TalentJobInput[] = talentJobs.map((t) => ({
                target_job_id: t.target_job_id,
                talent_status_period_link_id: t.talent_status_period_link_id,
            }));
            if (talentPickerComplete) {
                merged.push({
                    target_job_id: tJobId as number,
                    talent_status_period_link_id: tLinkId as number,
                });
            }
            talent_jobs = merged.length > 0 ? merged : undefined;
        }

        const payload: EmployeeWithActivationPayload = {
            code: data.code.trim().toUpperCase(),
            first_name: data.first_name.trim(),
            last_name: data.last_name.trim(),
            patronymic: data.patronymic?.trim() || null,
            sex: data.sex || null,
            birth_date: data.birth_date || null,
            email: data.email?.trim() || null,
            is_active: data.is_active,
            lang_id: 3, // default; user can change later
            effective_date: data.effective_date,
            department_id: data.department_id, // exact picked node → main department on backend
            job_id: data.job_id,
            description: data.description?.trim() || null,
            talent_jobs,
        };

        // Namesake pre-check: an existing person with the same (last, first)
        // opens the confirmation modal instead of submitting right away.
        setCheckingName(true);
        try {
            const { matches } = await checkPersonName(payload.first_name, payload.last_name);
            if (matches.length > 0) {
                setDupMatches(matches);
                setPendingPayload(payload);
                return;
            }
        } catch {
            // Pre-check failing must not block creation — the backend enforces
            // the namesake rule anyway (PersonNameExists).
        } finally {
            setCheckingName(false);
        }

        createMutation.mutate(payload);
    };

    const handleDuplicateConfirm = () => {
        if (!pendingPayload) return;
        createMutation.mutate({ ...pendingPayload, allow_duplicate: true });
        setDupMatches([]);
        setPendingPayload(null);
    };

    const handleDuplicateCancel = () => {
        setDupMatches([]);
        setPendingPayload(null);
    };

    const noJobsForType = pickedTypeId != null && jobsByType.length === 0;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth={allowTalent ? 'lg' : 'md'} fullWidth>
            <DialogTitle>{cfl(getString('addEmployee') || 'Add Employee')}</DialogTitle>
            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    {createMutation.isError && (
                        <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                            {createMutation.error?.message}
                        </Alert>
                    )}

                    {/* Columns: identity | details+activation | department+job, and
                        — when the talent feature is on — talent target jobs (4th). */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: allowTalent
                                    ? '0.6fr 0.6fr 1.1fr 0.9fr'
                                    : '0.7fr 0.7fr 1.3fr',
                            },
                            gap: 3,
                            mt: 1,
                            alignItems: 'start',
                        }}
                    >
                        {/* ── COLUMN 1: identity (code + person names + sex) ── */}
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
                                label={cfl(getString('lastName') || 'Last name')}
                                required fullWidth
                                slotProps={{ htmlInput: { maxLength: 64 } }}
                                error={!!errors.last_name}
                                helperText={errors.last_name?.message && (getString(errors.last_name.message) || errors.last_name.message)}
                                {...register('last_name')}
                            />
                            <TextField
                                label={cfl(getString('firstName') || 'First name')}
                                required fullWidth
                                slotProps={{ htmlInput: { maxLength: 64 } }}
                                error={!!errors.first_name}
                                helperText={errors.first_name?.message && (getString(errors.first_name.message) || errors.first_name.message)}
                                {...register('first_name')}
                            />
                            <TextField
                                label={cfl(getString('patronymic') || 'Patronymic')}
                                fullWidth
                                slotProps={{ htmlInput: { maxLength: 64 } }}
                                error={!!errors.patronymic}
                                helperText={errors.patronymic?.message && (getString(errors.patronymic.message) || errors.patronymic.message)}
                                {...register('patronymic')}
                            />
                            <Controller
                                name="sex"
                                control={control}
                                render={({ field }) => (
                                    <FormControl fullWidth>
                                        <InputLabel id="employee-create-sex-label">
                                            {cfl(getString('sex') || 'Sex')}
                                        </InputLabel>
                                        <Select
                                            {...field}
                                            labelId="employee-create-sex-label"
                                            variant="outlined"
                                            label={cfl(getString('sex') || 'Sex')}
                                        >
                                            <MenuItem value="">—</MenuItem>
                                            <MenuItem value="male">{getString('sexMale') || 'Male'}</MenuItem>
                                            <MenuItem value="female">{getString('sexFemale') || 'Female'}</MenuItem>
                                        </Select>
                                    </FormControl>
                                )}
                            />
                        </Box>

                        {/* ── COLUMN 2: details + activation date + description ── */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                {cfl(getString('details') || 'Details')}
                            </Typography>
                            {/* Birth date via the people-review wheel picker */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        {cfl(getString('birthDate') || 'Birth date')}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                        {birthDate ? formatDate(birthDate) : '—'}
                                    </Typography>
                                </Box>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        setDraftBirth(birthDate || null);
                                        setBirthOpen(true);
                                    }}
                                >
                                    {birthDate ? getString('edit') || 'Edit' : getString('set') || 'Set'}
                                </Button>
                                {birthDate && (
                                    <IconButton
                                        size="small"
                                        onClick={() => setValue('birth_date', '')}
                                        aria-label="clear birth date"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                )}
                            </Box>
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
                                            renderValue={(selected) => {
                                                const job = jobsByType.find(j => j.id === (selected as number));
                                                return job?.name ?? '';
                                            }}
                                            MenuProps={{
                                                PaperProps: {
                                                    sx: { maxHeight: 300 },
                                                },
                                            }}
                                            sx={{
                                                '& .MuiSelect-select': {
                                                    whiteSpace: 'normal',
                                                    wordBreak: 'break-word',
                                                    lineHeight: 1.3,
                                                    py: 1,
                                                },
                                            }}
                                        >
                                            {jobsByType.map((j) => (
                                                <MenuItem key={j.id} value={j.id} sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{j.name}</MenuItem>
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

                        {/* ── THIRD COLUMN: talent target jobs (optional; gated) ── */}
                        {allowTalent && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    {getString('talentTargetJobs')}
                                </Typography>

                                {/* Selected list — shown before the employee is created */}
                                {talentJobs.length > 0 && (
                                    <Stack spacing={1}>
                                        {talentJobs.map((tj, i) => (
                                            <Paper
                                                key={`${tj.target_job_id}-${tj.talent_status_period_link_id}-${i}`}
                                                variant="outlined"
                                                sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                                            >
                                                <Box>
                                                    <Typography fontSize={13} fontWeight={600}>{tj.target_job_name}</Typography>
                                                    <Typography fontSize={12} color="text.secondary">{tj.pair_label}</Typography>
                                                </Box>
                                                <IconButton size="small" color="error" onClick={() => removeTalentJob(i)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Paper>
                                        ))}
                                    </Stack>
                                )}

                                {/* In-progress picker for the next talent target job */}
                                <TalentTargetJobPicker
                                    selectedTypeId={tTypeId}
                                    selectedTypeName={tTypeName}
                                    onSelectType={(id, name) => { setTTypeId(id); setTTypeName(name); setTJobId(''); setTJobName(''); }}
                                    targetJobId={tJobId}
                                    onTargetJob={(id, name) => { setTJobId(id); setTJobName(name); }}
                                    talentLinkId={tLinkId}
                                    onTalentLink={(id, label) => { setTLinkId(id); setTLinkLabel(label); }}
                                />
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={addTalentJob}
                                    disabled={!talentPickerComplete}
                                    sx={{ alignSelf: 'flex-start' }}
                                >
                                    {getString('addTalentTargetJob')}
                                </Button>
                            </Box>
                        )}
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
                    disabled={createMutation.isPending || checkingName}
                    startIcon={
                        createMutation.isPending || checkingName ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : undefined
                    }
                >
                    {getString('create') || 'Create'}
                </Button>
            </DialogActions>

            <EmployeeDuplicatePersonDialog
                open={dupMatches.length > 0}
                matches={dupMatches}
                isPending={createMutation.isPending}
                onConfirm={handleDuplicateConfirm}
                onCancel={handleDuplicateCancel}
            />

            {/* Birth-date wheel picker (same component as people-review dates) */}
            <Dialog open={birthOpen} onClose={() => setBirthOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{cfl(getString('birthDate') || 'Birth date')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 0.5, mb: 1.5 }}>
                        <Typography variant="h6" fontWeight={700}>
                            {formatDate(draftBirth)}
                        </Typography>
                    </Box>
                    <DateWheelPicker value={draftBirth} onChange={setDraftBirth} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBirthOpen(false)}>
                        {getString('cancel') || 'Cancel'}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setValue('birth_date', draftBirth ?? '');
                            setBirthOpen(false);
                        }}
                    >
                        {getString('save') || 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}
