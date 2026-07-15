import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Autocomplete,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import type { UseMutationResult } from '@tanstack/react-query';
import useString from '../../../hooks/useString';
import { DATE_FORMAT } from '../../../utils/eNums.ts';
import { JOB_QK, JOB_REQUIREMENT_GROUPS_QK, DEPARTMENT_FLAT_QK } from '../../../utils/queryKeys';
import { fetchJobs, type Job } from '../../admin/jobs/jobApi';
import { fetchDepartmentsFlat, type DepartmentFlat } from '../../admin/departments/departmentApi';
import { fetchJobRequirementGroups } from '../requirements/jobRequirementApi';
import type { MutationResponse, RecruitmentTask, RecruitmentTaskCreate } from './recruitmentTaskApi';

interface Props {
    open: boolean;
    onClose: () => void;
    createMutation: UseMutationResult<MutationResponse<RecruitmentTask>, Error, RecruitmentTaskCreate>;
}

// Inner form mounts fresh each time the dialog opens, so useState initializers
// provide the reset — no setState-in-effect needed.
function CreateForm({ onClose, createMutation }: Omit<Props, 'open'>) {
    const getString = useString();
    const [job, setJob] = useState<Job | null>(null);
    const [groupId, setGroupId] = useState<number | ''>('');
    const [department, setDepartment] = useState<DepartmentFlat | null>(null);
    const [comment, setComment] = useState('');
    const [deadline, setDeadline] = useState('');

    // Jobs are pickable regardless of is_active — search all of them.
    const { data: jobs = [] } = useQuery({ queryKey: JOB_QK, queryFn: () => fetchJobs() });

    // Exact (possibly deep) department this search is for — optional.
    const { data: departments = [] } = useQuery({
        queryKey: DEPARTMENT_FLAT_QK,
        queryFn: fetchDepartmentsFlat,
    });

    // Requirement groups of the chosen job (optional at creation).
    const { data: groups = [] } = useQuery({
        queryKey: JOB_REQUIREMENT_GROUPS_QK(job?.id ?? 0),
        queryFn: () => fetchJobRequirementGroups(job!.id),
        enabled: !!job,
    });

    const sortedJobs = useMemo(() => [...jobs].sort((a, b) => a.name.localeCompare(b.name)), [jobs]);
    const sortedDepartments = useMemo(
        () => [...departments].sort((a, b) => a.name.localeCompare(b.name)),
        [departments],
    );

    const handleSubmit = () => {
        if (!job) return;
        createMutation.mutate({
            job_id: job.id,
            requirement_group_id: groupId === '' ? null : groupId,
            department_id: department?.id ?? null,
            comment: comment.trim() || null,
            target_deadline: deadline || null,
        });
    };

    return (
        <>
            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Autocomplete
                        value={job}
                        onChange={(_, v) => {
                            setJob(v);
                            // A group belongs to one job — drop the stale pick.
                            setGroupId('');
                        }}
                        options={sortedJobs}
                        getOptionLabel={(o) => o.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        renderInput={(params) => <TextField {...params} label={getString('job') || 'Job'} required />}
                    />
                    <Autocomplete
                        value={department}
                        onChange={(_, v) => setDepartment(v)}
                        options={sortedDepartments}
                        getOptionLabel={(o) => o.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label={getString('department') || 'Department'}
                                helperText={getString('recruitmentDepartmentHint') || 'Exact department; its top unit (store / directorate) is derived'}
                            />
                        )}
                    />
                    <TextField
                        select
                        variant="outlined"
                        label={getString('requirementGroup') || 'Requirement group'}
                        value={groupId}
                        onChange={(e) => setGroupId(e.target.value === '' ? '' : Number(e.target.value))}
                        fullWidth
                        disabled={!job}
                        helperText={getString('onlyOneActiveGroupPerJob') || 'Only one group can be active per job'}
                    >
                        <MenuItem value="">
                            <em>{getString('noRequirementGroup') || 'No requirement group'}</em>
                        </MenuItem>
                        {groups.map((g) => (
                            <MenuItem key={g.id} value={g.id}>
                                {g.name}
                                {g.is_active ? ` (${getString('activeRequirementGroup') || 'Active'})` : ''}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label={getString('comment') || 'Comment'}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                    />
                    <DatePicker
                        label={getString('targetDeadline') || 'Target deadline'}
                        format={DATE_FORMAT}
                        value={deadline ? dayjs(deadline) : null}
                        onChange={(d) => setDeadline(d ? dayjs(d).format('YYYY-MM-DD') : '')}
                        slotProps={{ textField: { fullWidth: true } }}
                    />
                </Stack>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{getString('cancel') || 'Cancel'}</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!job || createMutation.isPending}>
                    {createMutation.isPending ? getString('saving') || 'Saving…' : getString('create') || 'Create'}
                </Button>
            </DialogActions>
        </>
    );
}

export function RecruitmentTaskCreateDialog({ open, onClose, createMutation }: Props) {
    const getString = useString();
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{getString('createRecruitmentTask') || 'Create task'}</DialogTitle>
            {open && <CreateForm onClose={onClose} createMutation={createMutation} />}
        </Dialog>
    );
}
