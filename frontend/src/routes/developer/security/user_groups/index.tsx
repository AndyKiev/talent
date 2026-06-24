// src/routes/developer/security/user_groups/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { UserGroupCrud } from '../../../../components/admin/user-groups/UserGroupCrud';

export const Route = createFileRoute('/developer/security/user_groups/')({
    component: () => <UserGroupCrud />,
});