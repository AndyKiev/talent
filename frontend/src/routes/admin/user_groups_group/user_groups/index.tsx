// src/routes/admin/user_groups_group/user_groups/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { UserGroupCrud } from '../../../../components/admin/user-groups/UserGroupCrud';

export const Route = createFileRoute('/admin/user_groups_group/user_groups/')({
    component: () => <UserGroupCrud />,
});
 