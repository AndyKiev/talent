// src/routes/admin/user_groups_group/users/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { UsersCrud } from '../../../../components/admin/users/UsersCrud';

export const Route = createFileRoute('/admin/user_groups_group/users/')({
    component: () => <UsersCrud />,
});
 