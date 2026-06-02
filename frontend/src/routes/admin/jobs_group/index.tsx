// src/routes/admin/jobs_group/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/jobs_group/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/jobs_group/jobs' });
    },
});
