// src/routes/admin/jobs_group/job_group_types/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { JobGroupTypeCrud } from '../../../../components/admin/job_group_types/JobGroupTypeCrud';

export const Route = createFileRoute('/admin/jobs_group/job_group_types/')({
    component: JobGroupTypeCrud,
});
