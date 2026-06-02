// src/routes/admin/jobs_group/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { JobsGroupLayout } from '../../../components/admin/jobs/JobsGroupLayout';

export const Route = createFileRoute('/admin/jobs_group')({
    component: JobsGroupLayout,
});
