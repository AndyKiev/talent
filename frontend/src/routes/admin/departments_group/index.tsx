// src/routes/admin/departments_group/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/departments_group/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/departments_group/structure', replace: true });
    },
});
