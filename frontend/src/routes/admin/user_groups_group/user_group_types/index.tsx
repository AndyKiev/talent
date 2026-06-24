// src/routes/admin/user_groups_group/user_group_types/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { UserGroupTypeCrud } from '../../../../components/admin/user-group-types/UserGroupTypeCrud';

export const Route = createFileRoute('/admin/user_groups_group/user_group_types/')({
    component: () => <UserGroupTypeCrud />,
});
 