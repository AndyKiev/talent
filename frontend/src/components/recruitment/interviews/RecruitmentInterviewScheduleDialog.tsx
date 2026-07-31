import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Autocomplete,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import useString from '../../../hooks/useString';
import { useIntegerSetting } from '../../../hooks/useAppSetting';
import { AVAILABLE_INTERVIEWERS_QK } from '../../../utils/queryKeys';
import {
    createInterview,
    fetchAvailableInterviewers,
    type RecruitmentInterviewEmployeeMini,
} from './recruitmentInterviewApi';
import type { RecruitmentApplication } from '../candidates/recruitmentApplicationApi';

interface Props {
    open: boolean;
    application: RecruitmentApplication | null;
    onClose: () => void;
    /** Called after the interview is created (the card auto-advances server-side). */
    onScheduled: (detail: string) => void;
    onError: (message: string) => void;
}

function ScheduleForm({ application, onClose, onScheduled, onError }: Omit<Props, 'open'>) {
    const getString = useString();
    const qc = useQueryClient();
    // Max interviewers per interview (developer setting; backend enforces the same).
    const { value: maxInterviewers } = useIntegerSetting('interview_max_interviewers', 3);
    const [when, setWhen] = useState<string>(''); // ISO datetime
    const [location, setLocation] = useState('');
    const [interviewers, setInterviewers] = useState<RecruitmentInterviewEmployeeMini[]>([]);

    const { data: available = [], isLoading } = useQuery({
        queryKey: AVAILABLE_INTERVIEWERS_QK,
        queryFn: fetchAvailableInterviewers,
        staleTime: 2 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: createInterview,
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: ['recruitment_applications'] });
            await qc.invalidateQueries({ queryKey: ['interviews'] });
            onScheduled(res.detail);
        },
        onError: (e: Error) => onError(e.message),
    });

    const canSubmit =
        application != null &&
        when !== '' &&
        location.trim() !== '' &&
        interviewers.length >= 1 &&
        interviewers.length <= maxInterviewers &&
        !createMutation.isPending;

    const handleSubmit = () => {
        if (!application || !canSubmit) return;
        createMutation.mutate({
            application_id: application.id,
            scheduled_at: when,
            location: location.trim(),
            interviewer_ids: interviewers.map((i) => i.id),
        });
    };

    return (
        <>
            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <DateTimePicker
                            label={getString('interviewWhen') || 'When'}
                            format="DD.MM.YYYY HH:mm"
                            ampm={false}
                            value={when ? dayjs(when) : null}
                            onChange={(d) => setWhen(d ? d.toISOString() : '')}
                            slotProps={{ textField: { fullWidth: true, required: true } }}
                        />
                        <TextField
                            label={getString('interviewWhere') || 'Where'}
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            fullWidth
                            required
                        />
                        <Autocomplete
                            multiple
                            value={interviewers}
                            onChange={(_, v) => setInterviewers(v.slice(0, maxInterviewers))}
                            options={available}
                            loading={isLoading}
                            getOptionLabel={(o) => o.name}
                            isOptionEqualToValue={(a, b) => a.id === b.id}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={getString('interviewers') || 'Interviewers'}
                                    required
                                    helperText={
                                        getString('interviewersHint', { max: maxInterviewers }) ||
                                        `Up to ${maxInterviewers}, manager-category jobs only`
                                    }
                                />
                            )}
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
                    startIcon={
                        createMutation.isPending ? (
                            <CircularProgress size={16} color="inherit" />
                        ) : undefined
                    }
                >
                    {createMutation.isPending
                        ? getString('saving') || 'Saving…'
                        : getString('scheduleInterview') || 'Schedule interview'}
                </Button>
            </DialogActions>
        </>
    );
}

export function RecruitmentInterviewScheduleDialog({ open, application, onClose, onScheduled, onError }: Props) {
    const getString = useString();
    const candidateName = application?.candidate
        ? `${application.candidate.first_name} ${application.candidate.last_name}`
        : '';
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {(getString('scheduleInterview') || 'Schedule interview') +
                    (candidateName ? ` — ${candidateName}` : '')}
            </DialogTitle>
            {open && (
                <ScheduleForm
                    application={application}
                    onClose={onClose}
                    onScheduled={onScheduled}
                    onError={onError}
                />
            )}
        </Dialog>
    );
}
