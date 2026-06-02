// src/routes/admin/user_groups_group/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { UserGroupsGroupPage } from '../../../components/admin/user-groups/UserGroupsGroupPage';

export const Route = createFileRoute('/admin/user_groups_group/')({
    component: UserGroupsGroupPage,
});