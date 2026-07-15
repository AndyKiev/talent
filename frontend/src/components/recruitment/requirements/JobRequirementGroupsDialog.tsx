import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import { JobRequirementGroupsManager } from './JobRequirementGroupsManager';
import type { Job } from '../../admin/jobs/jobApi';

interface Props {
    job: Job | null;
    onClose: () => void;
}

/** Big modal opened from the jobs grid to manage a job's requirement groups. */
export function JobRequirementGroupsDialog({ job, onClose }: Props) {
    const getString = useString();
    const open = !!job;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                {cfl(getString('jobRequirements')) || 'Job requirements'}
                {job && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {job.name}
                    </Typography>
                )}
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
                {job && <JobRequirementGroupsManager key={job.id} jobId={job.id} getString={getString} />}
            </DialogContent>
        </Dialog>
    );
}
