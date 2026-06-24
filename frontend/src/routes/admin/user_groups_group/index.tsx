// src/routes/admin/user_groups_group/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/user_groups_group/')({
    beforeLoad: () => {
        throw redirect({ to: '/admin/user_groups_group/users' });
    },
});
 