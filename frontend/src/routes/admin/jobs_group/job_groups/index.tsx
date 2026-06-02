// src/routes/admin/jobs_group/job_groups/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { JobGroupCrud } from '../../../../components/admin/job_groups/JobGroupCrud';

export const Route = createFileRoute('/admin/jobs_group/job_groups/')({
    component: JobGroupCrud,
});
