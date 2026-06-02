// src/routes/admin/jobs_group/jobs/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { JobCrud } from '../../../../components/admin/jobs/JobCrud';

export const Route = createFileRoute('/admin/jobs_group/jobs/')({
    component: JobCrud,
});
