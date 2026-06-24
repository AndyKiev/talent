// src/routes/admin/user_groups_group/hrm_scopes/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { HrmScopesCrud } from '../../../../components/admin/hrm_scopes/HrmScopesCrud';

export const Route = createFileRoute('/admin/user_groups_group/hrm_scopes/')({
    component: () => <HrmScopesCrud />,
});
 