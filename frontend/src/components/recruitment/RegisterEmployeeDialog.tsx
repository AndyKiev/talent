// src/components/recruitment/RegisterEmployeeDialog.tsx
//
// "Hired → employee": registers a HIRED candidate as an employee by reusing the
// existing atomic POST /employees/with_activation endpoint (person + employee +
// activation event). Prefilled from the candidate (name / email) and the task
// (job / department); HR enters the employee code + activation date.
// Guarded by the employee CREATE permission — the dedicated access group can be
// swapped in later without touching this flow.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Autocomplete,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import useString from '../../hooks/useString';
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL, DATE_FORMAT } from '../../utils/eNums.ts';
import { DEPARTMENT_FLAT_QK } from '../../utils/queryKeys';
import { fetchDepartmentsFlat } from '../admin/departments/departmentApi';
import type { CandidateApplication } from '../candidates/candidateApplicationApi';

interface RegisterPayload {
    code: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    effective_date: string; // 'YYYY-MM-DD'
    department_id: number;
    job_id: number;
    allow_duplicate: boolean;
}

const registerEmployee = async (payload: RegisterPayload): Promise<{ code: string }> => {
    const res = await axiosInstance.post<{ code: string }>(
        `${BASE_URL}/employees/with_activation`,
        payload,
    );
    return res.data;
};

interface Props {
    open: boolean;
    application: CandidateApplication | null;
    /** The task's department (prefill) — the picker stays editable. */
    departmentId?: number | null;
    onClose: () => void;
    onRegistered: (message: string) => void;
    onError: (message: string) => void;
}

function RegisterForm({ application, departmentId, onClose, onRegistered, onError }: Omit<Props, 'open'>) {
    const getString = useString();
    const qc = useQueryClient();
    const [code, setCode] = useState('');
    const [firstName, setFirstName] = useState(application?.candidate?.first_name ?? '');
    const [lastName, setLastName] = useState(application?.candidate?.last_name ?? '');
    const [email, setEmail] = useState(application?.candidate?.email ?? '');
    const [deptId, setDeptId] = useState<number | null>(departmentId ?? null);
    const [effectiveDate, setEffectiveDate] = useState(dayjs().format('YYYY-MM-DD'));

    const { data: departments = [] } = useQuery({
        queryKey: DEPARTMENT_FLAT_QK,
        queryFn: fetchDepartmentsFlat,
    });
    const selectedDept = departments.find((d) => d.id === deptId) ?? null;

    const mutation = useMutation({
        mutationFn: registerEmployee,
        onSuccess: async (employee) => {
            await qc.invalidateQueries({ queryKey: ['employees'] });
            onRegistered(
                getString('employeeRegistered', { code: employee.code }) ||
                    `Employee ${employee.code} registered`,
            );
        },
        onError: (e: Error) => onError(e.message),
    });

    const jobId = application?.recruitment_task?.job_id ?? null;
    const canSubmit =
        code.trim() !== '' &&
        firstName.trim() !== '' &&
        lastName.trim() !== '' &&
        deptId != null &&
        jobId != null &&
        effectiveDate !== '' &&
        !mutation.isPending;

    const handleSubmit = () => {
        if (!canSubmit || jobId == null || deptId == null) return;
        mutation.mutate({
            code: code.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim() || null,
            effective_date: effectiveDate,
            department_id: deptId,
            job_id: jobId,
            allow_duplicate: false,
        });
    };

    return (
        <>
            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <WorkIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                                {getString('job') || 'Job'}:
                            </Typography>
                            <Chip
                                size="small"
                                color="primary"
                                variant="outlined"
                                label={application?.recruitment_task?.job?.name ?? jobId ?? '—'}
                            />
                        </Stack>
                        <TextField
                            label={getString('employeeCode') || 'Employee code'}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            fullWidth
                            required
                            slotProps={{ htmlInput: { maxLength: 10 } }}
                        />
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label={getString('firstName') || 'First name'}
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                fullWidth
                                required
                            />
                            <TextField
                                label={getString('lastName') || 'Last name'}
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                fullWidth
                                required
                            />
                        </Stack>
                        <TextField
                            label={getString('email') || 'Email'}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            fullWidth
                            type="email"
                        />
                        <Autocomplete
                            value={selectedDept}
                            onChange={(_, v) => setDeptId(v?.id ?? null)}
                            options={departments}
                            getOptionLabel={(o) => o.name}
                            isOptionEqualToValue={(a, b) => a.id === b.id}
                            renderInput={(params) => (
                                <TextField {...params} label={getString('department') || 'Department'} required />
                            )}
                        />
                        <DatePicker
                            label={getString('activationDate') || 'Activation date'}
                            format={DATE_FORMAT}
                            value={dayjs(effectiveDate)}
                            onChange={(d) => setEffectiveDate(d ? dayjs(d).format('YYYY-MM-DD') : '')}
                            slotProps={{ textField: { fullWidth: true, required: true } }}
                        />
                    </Stack>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{getString('cancel') || 'Cancel'}</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {mutation.isPending
                        ? getString('saving') || 'Saving…'
                        : getString('registerEmployee') || 'Register employee'}
                </Button>
            </DialogActions>
        </>
    );
}

export function RegisterEmployeeDialog({ open, application, departmentId, onClose, onRegistered, onError }: Props) {
    const getString = useString();
    const candidateName = application?.candidate
        ? `${application.candidate.first_name} ${application.candidate.last_name}`
        : '';
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {(getString('registerEmployee') || 'Register employee') +
                    (candidateName ? ` — ${candidateName}` : '')}
            </DialogTitle>
            {open && (
                <RegisterForm
                    application={application}
                    departmentId={departmentId}
                    onClose={onClose}
                    onRegistered={onRegistered}
                    onError={onError}
                />
            )}
        </Dialog>
    );
}
