// src/routes/admin/job_groups/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { JobGroupsPage } from '../../../components/admin/job_groups/JobGroupsPage';

export const Route = createFileRoute('/admin/job_groups/')({
    component: JobGroupsPage,
});