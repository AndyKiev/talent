// src/routes/admin/jobs_group/job_categories/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { JobCategoryCrud } from '../../../../components/admin/job_categories/JobCategoryCrud';

export const Route = createFileRoute('/admin/jobs_group/job_categories/')({
    component: JobCategoryCrud,
});
