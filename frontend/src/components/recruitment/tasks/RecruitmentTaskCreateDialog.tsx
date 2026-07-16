import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
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
import { JOB_REQUIREMENT_GROUPS_QK } from '../../../utils/queryKeys';
import { DepartmentJobPicker } from '../../pickers/DepartmentJobPicker';
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
    // Department + job are picked together via the employee-style cascade
    // (category → top unit → tree → job of the department's type).
    const [depJob, setDepJob] = useState<{ departmentId: number | null; jobId: number | null }>({
        departmentId: null,
        jobId: null,
    });
    const [groupId, setGroupId] = useState<number | ''>('');
    const [openings, setOpenings] = useState(1);
    const [comment, setComment] = useState('');
    const [deadline, setDeadline] = useState('');

    // Requirement groups of the picked job (optional at creation).
    const { data: groups = [] } = useQuery({
        queryKey: JOB_REQUIREMENT_GROUPS_QK(depJob.jobId ?? 0),
        queryFn: () => fetchJobRequirementGroups(depJob.jobId!),
        enabled: depJob.jobId != null,
    });

    const handleSubmit = () => {
        if (depJob.jobId == null) return;
        createMutation.mutate({
            job_id: depJob.jobId,
            requirement_group_id: groupId === '' ? null : groupId,
            department_id: depJob.departmentId,
            openings: Math.max(1, openings),
            comment: comment.trim() || null,
            target_deadline: deadline || null,
        });
    };

    return (
        <>
            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <DepartmentJobPicker
                            value={depJob}
                            onChange={(v) => {
                                setDepJob({ departmentId: v.departmentId, jobId: v.jobId });
                                // A requirement group belongs to one job — drop a stale pick
                                // whenever the department/job selection changes.
                                setGroupId('');
                            }}
                            getString={getString}
                        />
                        <TextField
                            select
                            variant="outlined"
                            label={getString('requirementGroup') || 'Requirement group'}
                            value={groupId}
                            onChange={(e) => setGroupId(e.target.value === '' ? '' : Number(e.target.value))}
                            fullWidth
                            disabled={depJob.jobId == null}
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
                            label={getString('openings') || 'Openings (positions)'}
                            type="number"
                            value={openings}
                            onChange={(e) => setOpenings(Math.max(1, Number(e.target.value) || 1))}
                            fullWidth
                            slotProps={{ htmlInput: { min: 1 } }}
                            helperText={getString('openingsHint') || 'How many people this vacancy is for'}
                        />
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
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={depJob.jobId == null || createMutation.isPending}
                >
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
