// src/routes/admin/job_group_types/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { JobGroupTypesPage } from '../../../components/admin/job_group_types/JobGroupTypesPage';

export const Route = createFileRoute('/admin/job_group_types/')({
    component: JobGroupTypesPage,
});