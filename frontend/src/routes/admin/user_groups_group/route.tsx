// src/routes/admin/user_groups_group/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { UserGroupsGroupLayout } from '../../../components/admin/user_groups/UserGroupsGroupLayout';

export const Route = createFileRoute('/admin/user_groups_group')({
    component: UserGroupsGroupLayout,
});
 