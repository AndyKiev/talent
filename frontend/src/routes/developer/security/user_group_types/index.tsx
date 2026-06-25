// src/routes/developer/security/user_group_types/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { UserGroupTypeCrud } from '../../../../components/admin/user_group_types/UserGroupTypeCrud';

export const Route = createFileRoute('/developer/security/user_group_types/')({
    component: () => <UserGroupTypeCrud />,
});