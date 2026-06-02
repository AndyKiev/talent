// src/routes/admin/departments_group/department_types/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/departments_group/department_types/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/departments_group/department_types/list', replace: true });
    },
});
